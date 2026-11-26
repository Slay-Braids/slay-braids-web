# Approved visual foundation — `anchor_v1`

**Status:** approved by the project owner after the M1 review (hair geometry, hair realism,
shader, lighting and still → live handoff). This is the fixed base the M2 design builds around.

## What is locked

| Element                                                                                     | Where                                                                          | Guard                                        |
| ------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------ | -------------------------------------------- |
| Hair geometry (braids, fibres, unbraiding, clumping, waves; tier A cascade, seed 20261126)  | `src/experience/cascade/geometry.ts`, `TIER_SETTINGS` / `ANCHOR` in `tiers.ts` | `tests/unit/foundation-lock.test.ts`         |
| Hair shader (ribbons, anisotropic highlights, occlusion, transmission, tone mapping)        | `src/experience/cascade/shaders.ts`                                            | same                                         |
| Lighting & material values (champagne key, cool fill, softbox pool, fog, fibre width)       | `CascadeScene.ts` uniforms; `keyDir` / `keyPool` in `framing.ts`               | same                                         |
| Anchor framing (aspect, FOV, anchor pose)                                                   | `framing.ts` (key 0 only)                                                      | same                                         |
| Anchor stills                                                                               | `public/anchors/anchor_v1-*` + `manifest.json` (sha256 per file)               | manifest                                     |
| Handoff behaviour (cover-fit alignment, frozen pose, cross-fade, motion only after handoff) | `controller.ts`, `CascadeScene.ts`                                             | `tests/e2e/experience.spec.ts` handoff tests |

## What may change in M2 (with approval of the M2 plan)

Page design, typography, colour of the page around the hair (ink and ivory grounds), sections,
navigation, transitions, scroll camera path _after_ the anchor pose, copy (approved only).
Tier B fibre budgets may be tuned from real-device results; tier A (the anchor) may not.

## Changing the foundation

Only with explicit owner approval. Bump `ANCHOR.version` to `anchor_v2`, re-render the stills
(`pnpm build && pnpm anchors:render`), update the lock hashes in the same commit, and re-run the
handoff tests. The film workstream's final frame depends on the anchor version.
