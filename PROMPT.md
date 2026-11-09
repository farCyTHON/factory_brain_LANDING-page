# BunnonBrain landing page — tweaked spec (delta only)

Base spec: single-viewport, full-bleed CloudFront video background, static
HTML + CSS + vanilla JS, Inter + BubbledotICG-FinePos (OnlineWebFonts) +
Geist Pixel Circle local fallback + Font Awesome 6.5.2. All layout tokens,
colors, breakpoints (720/420/700h), entrance animations and constraints are
unchanged from the original spec. Product copy re-targeted per
BunnonBrain_SAD_Project_Proposal.pdf:

| Item | Value |
|---|---|
| Title | BunnonBrain — Intelligence For Connected Factories |
| Headline | `BunnonBrain` / `The Factory Brain` |
| Subhead | Connect buyers, buying houses, factories and workers in one AI-powered platform — from first inquiry to final shipment. |
| Nav | Home · Platform · Modules · Contact |
| Trust | Trusted by 2000+ Factories & Brands (microsoft/amazon/google rings) |
| CTA | Request a Demo |
| Stats | `<` 10 Core Modules · `%` 4 Connected Portals · `*` 24/7 Live Floor Monitoring · `#` 360° Order Visibility |

## 3D component (added)
1. `#orb` canvas — 168-node dot-matrix orbital ring around the hero (the
   connected value chain). Perspective-projected 3D, slow spin, pointer-tilt,
   drag empty space to spin, CTA hover accelerates, beacon nodes pulse.
   Between video (z0) and UI (z1); pointer-events none; static frame under
   prefers-reduced-motion.
2. Hero 3D tilt (±2.5°, CSS perspective 1100px) + video counter-parallax
   (~8px, scale 1.06) — fine pointers only, one shared rAF loop.

## Asset deviations (originals not found in project)
- `assets/logo.svg` (dot-matrix B mark) replaces `assets/logo.webp`.
- `fonts/GeistPixel-Circle.woff2` = DotGothic16 (Google Fonts) saved under
  the spec filename — real Geist Pixel Circle was not publicly downloadable.