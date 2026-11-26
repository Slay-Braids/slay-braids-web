# M1 — Visual & technical proof of concept: report

**Status:** ready for review. **Not** approval to build the full experience. **M2 not started.**
Scope: the six M1 demonstrations only. All copy except the approved positioning line is visibly
marked placeholder; no product claims; no logos (original files not yet supplied).

## 1. What was built

| M1 item                   | Delivered                                                                                                                                                                                                                                           | Evidence                                                           |
| ------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------ |
| 1. Unbraiding Cascade     | Procedural three-strand braids built from individual hair fibres (24 per strand), unbraiding into clumped, softly waving loose hair with uneven ends. Anisotropic hair shading, champagne key light in a softbox "pool", per-fibre shade variation. | Anchor stills; unit tests (deterministic, braided + loose present) |
| 2. Anchor still → live 3D | Separate landscape (2560×1440) and portrait (1440×2560) anchors rendered **from the scene code itself** (frozen pose, seed `20261126`). Live canvas uses cover-fit camera maths to match the still at any aspect, then cross-fades over it.         | e2e handoff test (below)                                           |
| 3. Pointer interaction    | Strands part softly around the pointer (screen-space, loose hair responds most, braids barely) and spring back. Touch: while a finger drags.                                                                                                        | e2e pointer test                                                   |
| 4. Scroll camera          | GSAP ScrollTrigger drives a 5-key camera path (hero → woven braids → unbraiding → side light → pull-back); light cools subtly in the FUTURA chapter; Lenis smoothing on desktop only.                                                               | e2e scroll test                                                    |
| 5. Performance            | Three tiers; geometry built in a Web Worker; async shader compile; runtime monitor drops A→B→still within ~3 s on slow devices.                                                                                                                     | Bundle + Lighthouse below; real devices pending                    |
| 6. Fallbacks              | Tier C / reduced motion / Data Saver / no WebGL2: static anchor only, three.js never downloaded, text fully visible.                                                                                                                                | e2e lazy-load + reduced-motion tests                               |

Realism decision (per brief "do not compromise realism for strand count"): fewer fibres, sampled
densely and smoothly (18 samples per weave cycle, dense sampling through the whole unbraiding
transition), rather than many coarse fibres. Lower tiers remove whole braids only — per-braid
fibre density and sampling are identical on every tier (unit-tested).

## 2. Measurements (lab — headless Chromium)

> Headless WebGL is rendered on the **CPU** (SwiftShader). These numbers prove behaviour, load
> order and pixel continuity. They do **not** represent real GPU frame rates. Real-device numbers
> are pending (section 4).

### Handoff continuity (still vs first live frame, same viewport)

| Viewport             | Raw mean Δ | Perceptual Δ (1.5 px blur) | Image content level | Luminance still / live |
| -------------------- | ---------- | -------------------------- | ------------------- | ---------------------- |
| Desktop 1440×900 @1x | 4.40 / 255 | **1.19 / 255**             | 12.04 / 255         | 20.64 / 20.42          |
| Mobile 412×839 @2.6x | 3.18 / 255 | **1.44 / 255**             | 10.61 / 255         | 19.21 / 19.11          |

Raw differences are sub-pixel sampling of 1-px fibres (still rendered at 2560 and downsampled;
live renders natively). No misalignment or brightness jump. Mobile residual: canvas DPR is
capped at 2×, so on 2.6× screens the live frame is marginally softer than the still → M2 item.

### Load order and bundles (production export)

|                                 | Size                                                                          |
| ------------------------------- | ----------------------------------------------------------------------------- |
| First-load JS (modern browsers) | **111 KB brotli** / 134 KB gzip — React 19 + Next.js runtime; app code < 1 KB |
| CSS                             | 4.7 KB gzip                                                                   |
| Anchor still (LCP image, AVIF)  | 107 KB landscape 1920 · 96 KB portrait 1080                                   |
| Lazy: three.js + scene          | 82 KB gzip                                                                    |
| Lazy: GSAP + ScrollTrigger      | ~44 KB gzip (two chunks)                                                      |
| Lazy: Lenis (desktop only)      | 5 KB gzip                                                                     |
| Lazy: geometry worker           | 2 KB gzip                                                                     |
| Tier C total JS                 | 448 KB raw — **three.js never requested** (verified)                          |
| Tier A                          | still requested at 16–68 ms, three.js chunk at 188–297 ms (after the still)   |

### Lighthouse (lab, simulated throttling)

| Profile                      | Perf | LCP    | CLS  | TBT     | A11y | Best practice |
| ---------------------------- | ---- | ------ | ---- | ------- | ---- | ------------- |
| Mobile, static path (tier C) | 99   | 0.9 s  | 0.05 | 112 ms  | 100  | 100           |
| Mobile, auto                 | 63   | 0.9 s  | 0.02 | 18.9 s* | 100  | 100           |
| Desktop, auto                | 64   | 0.25 s | 0.04 | 4.0 s*  | 100  | 100           |

\*TBT in the 3D runs is dominated by CPU-rendered WebGL in the lab browser (each software frame
takes ~2.6 s). Our own main-thread work before the first live frame is one ~200 ms setup task
(GPU upload + compile, software-rendered); geometry runs in a worker. Real-GPU TBT must be
confirmed on devices. SEO 60 is expected: the prototype is deliberately `noindex`.

## 3. Tests

- Unit (20): claim gating (unapproved/research claims can never render), cover-fit maths,
  camera keyframes, tier decisions, URL flags, geometry determinism and integrity.
- E2E (15 + 1 skipped): handoff continuity desktop + mobile, pointer response, scroll camera,
  lazy-loading order, tier C never loads three.js, reduced motion, orientation-correct anchor,
  no unapproved product claims on the page, enquiry CTA never pretends to send.

## 4. Real-device testing — not yet done

There is no phone or computer attached to this session, so I could not run real-device tests.
The preview includes a performance readout (`#perf`) with a one-tap "Copy results".
Protocol and pass criteria: `docs/real-device-test-protocol.md` (5 device classes, ~5 min each).
**M1 should not be considered passed on performance until those results are in.**

## 5. Known items for M2 (not fixed in M1)

1. Mobile handoff softening from the 2× DPR cap (render first frame at device DPR, or match the still's resolution).
2. CLS 0.05 on mobile static from the display-font swap → metric-matched fallback font.
3. Fibre count tuning against real-device results (budget per tier).
4. Touch interaction feel (only verifiable on devices).
5. Logo, FUTURA lockup, approved copy, product data — all pending from management.
