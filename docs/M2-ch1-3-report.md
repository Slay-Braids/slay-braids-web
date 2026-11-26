# M2 — Chapters 1–3 preview: implementation report

Scope: Chapters 1–3 and the separate Chapter 3 transition lab, as approved (breakdown Revision 2).
Nothing from Chapters 4–7, no product recolouring, no public deployment, no paid services, no
product claims. All copy, the portrait and the logo are marked placeholders.

## 1. Approval conditions

| # | Condition | Result |
|---|-----------|--------|
| 1 | anchor_v1 and all lock tests preserved exactly | Foundation lock test unchanged and passing (geometry both orientations, shaders, lighting uniforms, anchor framing). anchor_v1 masters, encodes and manifest unchanged (sha256 verified). No locked file edited. |
| 2 | Ch3 transition: P99 ≤ 2 px, max ≤ 3 px, and visual review | Passes in every simulated run (§4); real-GPU accuracy not measured. Visual review: yours, using the preview and the frame sheets in `docs/review/m2/`. |
| 3 | Strictly Chapters 1–3 + lab | Yes. The end card says "Chapter 4 · FUTURA — built after this preview is approved". |
| 4 | Existing tests intact, failures reported | M1 e2e suite unmodified: 15 passed, 1 skipped (pointer test on mobile, skipped by design since M1). Unit 36/36. New suite: 18/18. |
| 5 | Preview, lab, frame sheets, performance report before further approval | See the review page. |

## 2. Isolated changes (I1–I7)

| | Change | Where | Notes |
|---|---|---|---|
| I1 | Camera keys K1, K1b, K2 and the continuous timeline | `chapters/cameraTimeline.ts` | K0 read from the locked framing. Cubic Hermite, non-uniform Catmull-Rom tangents; unit tests prove no jumps and continuous speed. K2 uses an optional camera roll (`up`), a new optional field; M1 keys have none, so the anchor framing hash is unchanged. |
| I2 | Guide strand | `chapters/guideStrand.ts` | Read-only use of the scene's buffers. Exact float32 copy of the shader's displacement; same matrices as the frame just rendered. |
| I3 | SVG page | `chapters/paper.ts` | Above the canvas, below the type. Highlight 1 px champagne 35 %, blurred paper shadow, blurred contact shadow, light spill at the projected key pool. |
| I4 | Render pause | `chapters/live.ts` | Only while the page (or an opaque section) covers the whole screen; resumes on scroll back. Tested. |
| I5 | Ch2/Ch3 stills | `scripts/render-chapter-stills.mjs`, `public/chapters/` | Rendered from the locked scene, wind 0, own manifest (with the static page edge). anchor_v1 untouched. |
| I6 | Density-matched still | `scripts/encode-matched-stills.mjs`, `public/anchors-matched/`, `#still-matched` | Not adopted. Simulated Δ did not improve (§5). Awaiting real phones. |
| I7 | Metric-matched fallback fonts | `globals.css` | size-adjust / ascent / descent overrides computed from the font files; hero width in em (not ch). Hero CLS 0.047 → 0.0002 in the trace. |

## 3. Decisions taken during the build (for your review)

1. **K2 frames the cascade's lit upper boundary**, rolled 25°, instead of the loose tips. At the
   tips the hair is outside the locked key pool and reads as black, so the page looked cut around
   an empty shape. On the lit boundary the page meets visible strands over the full height.
2. **"Away" now closes the page over the hair until it covers the screen** (instead of sliding a
   hair-shaped page upwards, which showed a cut-out travelling away from its hair). The edge
   relaxes to a straight line as it travels. The end card is printed on the same ivory, so it
   continues the page seamlessly. This is the full-cover state I4 was specified for.
3. **The page edge follows the outer clump**: the 6th-furthest fibre per row, not the single
   furthest stray. Strays pass under the page (it lies over the hair). Fibre tips are weighted by
   the shader's own tip fade, so a tip crossing a row can't make the edge jump.
4. **Chapter frames are fixed and driven by the same clock as the camera** (not CSS sticky), and
   Chapter 3 has a one-screen tail, so the next section only rises after the page has closed.
5. **No paper texture of its own**: the site-wide film grain lies over the page. The texture image
   had become the LCP element (6.7 s); removing it restored LCP to 0.9 s.
6. **Logo slot shows plain text "SLAY BRAIDS"** in a dashed placeholder box (accessible name
   "SLAY BRAIDS, home"). It is not a recreation of the logo; the file is still pending.

## 4. Results (final build)

Review page (published, private): https://claude.ai/artifact/1ezWjMpK1MZt1gUddGyjdy
Preview (private): https://claude.ai/artifact/YW1GEiLiyRxQ9QZ1i2C2sn (`#lab-transition`, `#perf`, `#reduced`)

**Page-edge accuracy** (`docs/perf/accuracy-*.json`). The lab compiles the locked shader's own
source at runtime and reads back the displaced centre lines from a float render target. Each run
lasts 30 s, with live wind and a moving pointer. **Simulated GPU (SwiftShader).**

| Run | Probed frames | Point P99 / max px | Edge P99 / max px | Result |
|---|---|---|---|---|
| desktop, every 10th frame | 4 | 0.0083 / 0.017 | 0.005 / 0.005 | pass |
| desktop, every frame | 13 | 0.0050 / 0.082 | 0.002 / 0.003 | pass |
| mobile, every 10th frame | 4 | 0.0053 / 0.007 | 0.013 / 0.015 | pass |
| mobile, every frame | 15 | 0.0035 / 0.153 | 0.017 / 0.029 | pass |

**Chapter 2 contrast** (`docs/perf/ch2-contrast-*.json`): 21 positions × 3 wind phases × 4
viewports. 225 samples judged; 24 caught mid-fade are recorded but not judged. Worst case 8.76:1
(dimmed line, 1440×900); active lines 16.04:1 or better. No sample below 7:1. At the original
0.62 opacity, dimmed lines measured 6.71:1; they were raised to 0.72.

**Tests** (`docs/perf/test-results.json`): unit 36/36 (including the lock test, 6/6). M1 e2e,
unmodified: 15 passed, 1 skipped (by design since M1). M2 e2e: 18/18. The M1 handoff numbers
are identical to M1.

**Lighthouse** (lab): LCP 902 ms on mobile (M1: 905), accessibility 100 on all profiles,
CLS 0.001 mobile and 0 desktop (M1: 0.02–0.05).

**Bundle:** initial JS 131.8 KB gzip (M1: 131.1); lazy JS 325.4 KB (M1: 305.5).

## 5. Performance

**Real devices: not measured.** No device or computer is connected to this session. Protocol:
`docs/real-device-test-protocol.md` (M2 addendum).

**Simulated** (`docs/perf/perf-sim-*.json`, SwiftShader). Frame times saturate at the scene's
100 ms dt clamp, so they say nothing about real hardware. Page-edge compute on the CPU:
P50 2.4 / P95 5.8 ms desktop, 2.8 / 5.8 ms mobile. CLS in the run: 0.0002 desktop, 0 mobile.
Handoff Δ (perceptual): 1.10 desktop, 1.13 mobile. With the I6 matched still: 1.17, so I6 is not
adopted.

## 6. Open items

- Real-device runs (performance, lab accuracy on real GPUs, I6 decision).
- Manual VoiceOver and TalkBack passes: **not done** (no devices here). Automated: axe clean on
  static, reduced-motion and live pages; reading order, skip link and modal menu tested.
- Approved copy, portrait photography and the logo file.
