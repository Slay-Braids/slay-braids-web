# slay-braids-web

Official SLAY BRAIDS website (FUTURA product line). **Current stage: M0 foundation + M1 3D proof of concept.** Not for publication.

## Stack

Next.js (App Router, static export, webpack build) · TypeScript strict · Tailwind CSS v4 tokens · three.js (lazy) · GSAP ScrollTrigger + Lenis (lazy) · Vitest · Playwright · Lighthouse.

## Commands

```bash
pnpm install
pnpm dev                # local dev server
pnpm build              # static export to out/
pnpm test               # unit tests (claim gating, framing maths, tiers, geometry)
pnpm test:e2e           # Playwright on the export (handoff, pointer, scroll, lazy-load, fallbacks)
pnpm anchors:render     # re-render anchor stills from the scene (after pnpm build)
pnpm perf:lighthouse    # lab audits → docs/perf/
pnpm perf:bundle        # bundle report → docs/perf/bundle.json
pnpm preview:build      # relative-path preview bundle → dist-preview/ (private artifact preview)
```

## Structure

- `src/experience/` — framework-agnostic experience code. `controller.ts` (initial, ~2 KB) orchestrates; `cascade/` (geometry, worker, shaders, scene) and `scroll.ts` load lazily on capable devices only.
- `src/content/claims.ts` — claim gating: only management-approved claims can be rendered.
- `src/components/` — shared by the Next.js site and the preview harness.
- `public/anchors/` — anchor stills (`anchor_v1`), rendered from the scene itself; `assets/anchors/` keeps lossless masters (never deployed).
- `docs/` — M1 report, performance data, real-device test protocol.

## Review flags (query string or `#hash`)

`perf` HUD · `tier-a|b|c` force a tier · `reduced` simulate reduced motion · `freeze` hold the anchor pose · `nodowngrade`.

## Rules

No recreated logos (original files only) · no unapproved product claims · originals untouched · the AI film is an independent workstream that drops into the hero slot as a sequence package.
