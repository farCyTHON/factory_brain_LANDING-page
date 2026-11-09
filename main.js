/* ============================================================
   BunnonBrain — interactions
   1. Stats count-up        3. 3D orbital dot ring
   2. Mobile menu           4. Hero tilt + video parallax
   ============================================================ */
(() => {
  'use strict';

  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const finePointer = window.matchMedia('(pointer: fine)').matches;
  const clamp = (v, min, max) => Math.max(min, Math.min(max, v));

  /* --------------------------------------------
     0. Release entrance animations when done so
        hover transforms aren't pinned by fill-mode
     -------------------------------------------- */
  const ENTRANCE = new Set(['reveal', 'headlineFade', 'revealPulse', 'slideDown']);
  document.addEventListener('animationend', (e) => {
    if (!ENTRANCE.has(e.animationName)) return;
    const el = e.target;
    if (el instanceof Element &&
        (el.classList.contains('anim') || el.classList.contains('hl') ||
         el.classList.contains('cta') || el.classList.contains('header'))) {
      el.style.animation = 'none';
    }
  });

  /* --------------------------------------------
     1. Stats count-up
     -------------------------------------------- */
  const statEls = Array.from(document.querySelectorAll('.stat-value'));

  const renderFinal = (el) => {
    el.textContent =
      (parseFloat(el.dataset.target || '0')).toFixed(parseInt(el.dataset.decimals || '0', 10)) +
      (el.dataset.suffix || '');
  };

  if ('IntersectionObserver' in window && statEls.length) {
    const io = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        const el = entry.target;
        io.unobserve(el);

        if (reduceMotion) { renderFinal(el); return; }

        const target = parseFloat(el.dataset.target || '0');
        const decimals = parseInt(el.dataset.decimals || '0', 10);
        const suffix = el.dataset.suffix || '';
        const i = statEls.indexOf(el);
        const duration = 1500 + i * 80;
        const startAt = performance.now() + 480 + i * 90;
        const easeOutCubic = (p) => 1 - Math.pow(1 - p, 3);

        const tick = (now) => {
          const p = clamp((now - startAt) / duration, 0, 1);
          el.textContent = (target * easeOutCubic(p)).toFixed(decimals) + suffix;
          if (p < 1) requestAnimationFrame(tick);
        };
        requestAnimationFrame(tick);
      });
    }, { threshold: 0.25 });
    statEls.forEach((el) => io.observe(el));
  } else {
    statEls.forEach(renderFinal);
  }

  /* --------------------------------------------
     2. Mobile menu
     -------------------------------------------- */
  const burger = document.querySelector('.burger');
  const overlay = document.querySelector('.menu-overlay');
  const menu = document.querySelector('.mobile-menu');

  const closeMenu = () => {
    document.body.classList.remove('menu-open');
    burger.setAttribute('aria-expanded', 'false');
    burger.setAttribute('aria-label', 'Open menu');
    overlay.hidden = true;
    menu.hidden = true;
  };
  const openMenu = () => {
    document.body.classList.add('menu-open');
    burger.setAttribute('aria-expanded', 'true');
    burger.setAttribute('aria-label', 'Close menu');
    overlay.hidden = false;
    menu.hidden = false;
  };

  if (burger && overlay && menu) {
    burger.addEventListener('click', () => {
      document.body.classList.contains('menu-open') ? closeMenu() : openMenu();
    });
    overlay.addEventListener('click', closeMenu);
    menu.querySelectorAll('a').forEach((a) => a.addEventListener('click', closeMenu));
    window.addEventListener('keydown', (e) => { if (e.key === 'Escape') closeMenu(); });
    window.addEventListener('resize', () => { if (window.innerWidth > 720) closeMenu(); });
  }

  /* --------------------------------------------
     3. 3D orbital dot ring  +  4. tilt / parallax
        (one shared rAF loop)
     -------------------------------------------- */
  const canvas = document.getElementById('orb');
  const heroInner = document.getElementById('hero-inner');
  const video = document.querySelector('.bg-video');
  const cta = document.getElementById('cta');

  if (!canvas || !canvas.getContext) return;
  const ctx = canvas.getContext('2d');

  let W = 0, H = 0, CX = 0, CY = 0, R = 0, DPR = 1;
  const NODE_COUNT = 168;
  const BEACON_EVERY = 11;              // ≈15 pulsing "machine" nodes
  const nodes = [];

  const buildRing = () => {
    nodes.length = 0;
    for (let i = 0; i < NODE_COUNT; i++) {
      nodes.push({
        a: (i / NODE_COUNT) * Math.PI * 2,
        rJit: 1 + (Math.random() - 0.5) * 0.045,   // radial wobble
        yJit: (Math.random() - 0.5) * 0.05,        // depth wobble (× R)
        size: 1 + Math.random() * 1.3,
        beacon: i % BEACON_EVERY === 0,
        phase: Math.random() * Math.PI * 2,
      });
    }
  };

  const resize = () => {
    DPR = Math.min(window.devicePixelRatio || 1, 2);
    W = canvas.clientWidth;
    H = canvas.clientHeight;
    canvas.width = Math.round(W * DPR);
    canvas.height = Math.round(H * DPR);
    ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
    CX = W / 2;
    CY = H / 2;
    R = Math.min(W, H) * (W <= 720 ? 0.56 : 0.46);
    buildRing();
    if (reduceMotion) drawRing(0);               // static frame, no loop
  };

  /* ring state */
  let spin = -0.6;
  let spinVel = 0.0016;
  const baseVel = 0.0016;
  let tiltX = -0.34, tiltXTarget = -0.34;        // plane tilt (pointer-driven)
  let bankZ = 0, bankZTarget = 0;                // roll toward pointer

  /* tilt / parallax state */
  let nX = 0, nY = 0;                            // pointer targets (-1..1)
  let cX = 0, cY = 0;                            // lerped currents

  const project = (node, now) => {
    const r = R * node.rJit;
    const ang = node.a + spin;
    const x = Math.cos(ang) * r;
    const z0 = Math.sin(ang) * r;
    const y0 = node.yJit * R;

    // tilt around X
    const cx1 = Math.cos(tiltX), sx1 = Math.sin(tiltX);
    const y1 = y0 * cx1 - z0 * sx1;
    const z1 = y0 * sx1 + z0 * cx1;

    // bank around Z
    const cb = Math.cos(bankZ), sb = Math.sin(bankZ);
    const x2 = x * cb - y1 * sb;
    const y2 = x * sb + y1 * cb;

    // perspective
    const f = 2.6 * R;
    const s = f / (f + z1);
    return { x: CX + x2 * s, y: CY + y2 * s, t: (1 - z1 / R) / 2 }; // t: 0 back → 1 front
  };

  const drawRing = (now) => {
    ctx.clearRect(0, 0, W, H);
    const pts = nodes.map((n) => project(n, now));

    // connectors along the front arc
    ctx.lineWidth = 1;
    for (let i = 0; i < pts.length; i++) {
      const a = pts[i], b = pts[(i + 1) % pts.length];
      const t = Math.min(a.t, b.t);
      if (t > 0.62) {
        ctx.strokeStyle = 'rgba(255,255,255,' + (0.03 + (t - 0.62) * 0.25).toFixed(3) + ')';
        ctx.beginPath();
        ctx.moveTo(a.x, a.y);
        ctx.lineTo(b.x, b.y);
        ctx.stroke();
      }
    }

    // dots (beacons pulse like machine heartbeats)
    for (let i = 0; i < nodes.length; i++) {
      const n = nodes[i], p = pts[i];
      const pulse = n.beacon ? 0.5 + 0.5 * Math.sin(now * 0.002 + n.phase) : 0;
      const radius = n.size * (0.65 + 1.05 * p.t) + (n.beacon ? pulse * 1.6 * p.t : 0);
      const alpha = clamp(0.16 + 0.6 * p.t + (n.beacon ? pulse * 0.2 : 0), 0, 0.95);

      if (n.beacon && p.t > 0.5) {
        ctx.shadowColor = 'rgba(255,255,255,0.8)';
        ctx.shadowBlur = 6 * p.t;
      } else {
        ctx.shadowBlur = 0;
      }
      ctx.fillStyle = 'rgba(255,255,255,' + alpha.toFixed(3) + ')';
      ctx.beginPath();
      ctx.arc(p.x, p.y, Math.max(0.4, radius), 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.shadowBlur = 0;
  };

  const applyTilt = () => {
    if (!finePointer || reduceMotion) return;
    cX += (nX - cX) * 0.07;
    cY += (nY - cY) * 0.07;
    if (heroInner) {
      heroInner.style.transform =
        'rotateX(' + (-cY * 2.5).toFixed(3) + 'deg) rotateY(' + (cX * 2.5).toFixed(3) + 'deg)';
    }
    if (video) {
      video.style.setProperty('--vx', (-cX * 8).toFixed(2) + 'px');
      video.style.setProperty('--vy', (-cY * 6).toFixed(2) + 'px');
    }
  };

  const frame = (now) => {
    spinVel += (baseVel - spinVel) * 0.02;       // drag momentum decays
    spin += spinVel;
    tiltX += (tiltXTarget - tiltX) * 0.05;
    bankZ += (bankZTarget - bankZ) * 0.05;
    drawRing(now);
    applyTilt();
    requestAnimationFrame(frame);
  };

  /* pointer steering + drag-to-spin */
  let dragging = false, lastX = 0;

  document.addEventListener('pointermove', (e) => {
    if (dragging) {
      spinVel = clamp(spinVel + (e.clientX - lastX) * 0.00006, -0.02, 0.02);
      lastX = e.clientX;
    }
    if (finePointer && !reduceMotion && W > 0) {
      nX = (e.clientX / W) * 2 - 1;
      nY = (e.clientY / H) * 2 - 1;
      tiltXTarget = -0.34 + nY * 0.1;
      bankZTarget = nX * 0.16;
    }
  });

  document.addEventListener('pointerdown', (e) => {
    if (e.target.closest('a, button, .mobile-menu, .stats')) return;
    dragging = true;
    lastX = e.clientX;
    document.body.classList.add('ring-drag');
    e.preventDefault();                          // no text selection while spinning
  });
  const endDrag = () => { dragging = false; document.body.classList.remove('ring-drag'); };
  document.addEventListener('pointerup', endDrag);
  document.addEventListener('pointercancel', endDrag);

  if (cta) {
    cta.addEventListener('pointerenter', () => {
      if (!reduceMotion) spinVel = clamp(spinVel + 0.006, -0.02, 0.02);
    });
  }

  window.addEventListener('resize', resize);
  resize();
  if (!reduceMotion) requestAnimationFrame(frame);
})();