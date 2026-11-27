# Chapters 1–3: technical assessment (27 Nov 2026)

Build: Chapters 1–3 preview with the TalkBack fix (`out/index.html` md5 9c3bbabf…; preview
https://claude.ai/artifact/YW1GEiLiyRxQ9QZ1i2C2sn). Assessment only; no implementation change.

## Recommendation

**Provisional approval is supportable. Suggested wording:** "Chapters 1–3 are provisionally
approved as the design and technical baseline, on automated evidence only. Real-device validation
is outstanding. Not approved for public release."

The evidence shows no genuine blocker for that. No check that was run has failed. It does not
show how the experience performs or feels on a real phone. No result here should be read as a
device result.

## What the automated evidence shows

All of it comes from headless Chromium with SwiftShader (WebGL on the CPU) and emulated phones,
never the A26.

| Area | Result |
|---|---|
| Locked foundation | anchor_v1 lock test 6/6; masters, manifest and all 18 encodes unchanged (sha256) |
| Tests | Unit 36/36 · M1 e2e 15 passed, 1 skipped by design · M2 e2e 20/20 |
| Page-edge accuracy (limit P99 ≤ 2 px, max ≤ 3 px) | 6 of 6 runs pass: tier A on desktop and mobile, tier B at an A26-sized screen, spec and dense modes. Worst point max 0.24 px. Worst edge max **2.23 px**, in 1 of 7,178 samples (tier B dense; P99 0.024 px). |
| Chapter 2 contrast (≥ 7:1) | 225 samples on 4 viewports, worst 8.76:1 |
| Accessibility | axe: no WCAG 2.1 A/AA violations (static, reduced, live) · Lighthouse accessibility 100 · accessibility tree identical in live and reduced mode at every scroll position |
| Loading and stability (Lighthouse lab) | LCP 0.90 s mobile / 0.25 s desktop · CLS 0.001 / 0 |
| Layout at 384 px | No horizontal overflow at 41 positions (live and reduced). Rotation round-trip works with no errors |
| Visuals | Frame sheets reviewed. The TalkBack fix is pixel-identical before and after (34 frames) |

## What is not known

Each of these needs the device or another browser:

1. **Real-device performance.** Frame rate, dropped frames, the Chapter 3 transition timing and
   thermal behaviour. SwiftShader frames saturate at 100 ms, so there is no valid frame-time
   evidence. Built-in safeguard: the runtime monitor judges the first 1–3 s of motion and
   drops to the lighter tier, then to the static spreads, if the device is too slow. It does
   not react to a slowdown later in the session, for example thermal throttling. The static spreads are fully
   tested.
2. **Page-edge accuracy on a real GPU (Mali).** Low risk: the shader uses highp and the CPU copy
   matches float32 exactly. The 2.23 px sample comes from the edge algorithm's own row-switching,
   not from the GPU.
3. **Touch feel.** Scrolling, the address bar showing and hiding, the on-screen keyboard, pinch
   zoom.
4. **TalkBack speech, and the Android back gesture with the menu open.** The accessibility tree
   is verified; the spoken output is not.
5. **Rotation position (open risk).** In emulation, rotating at the Chapter 3 rest moved the scroll
   position to the end card (380 → 865 vh). Real Chrome may keep the place by scroll anchoring.
   Unconfirmed.
6. **iOS / Safari and Samsung Internet.** Not tested in any form. WebKit was never run.

## Release blockers

**For provisional approval:** none.

**Before any public release (must be resolved):**

1. Real-device evidence on at least one mid-range Android (the A26) and one iPhone. A short smoke
   subset is enough; see below.
2. Rotation position confirmed on a device. If it jumps, a small, contained fix: keep the
   chapter-relative position across an orientation change.
3. Approved content: copy, Chapter 3 portrait photography and the logo file. All are marked
   placeholders today.
4. A short manual screen-reader pass (TalkBack, and VoiceOver on the iPhone).
5. Hosting and deployment approval. The site exists only as a private preview.

**Watch items (not blockers):**
- The edge max of 2.23 px leaves the thinnest margin under the 3 px limit.
- TalkBack's focus outline can sit over the current picture while it reads chapter text that has
  not scrolled into view.
- The density-matched still (I6) remains undecided.
- Start-up long tasks are unattributed; that needs a connected-device trace.

## If 12 minutes become available

Five checks on the A26 would close most of the unknowns. Run them from the protocol page:

- T1.1 lab run (3 min, unattended)
- T3.2 performance readout during one scroll pass (2 min)
- T2.1 one slow scroll pass, recorded (3 min)
- T5.6 rotation at the Chapter 3 rest (1 min)
- T6.2 a quick TalkBack swipe through Chapters 2–3 (3 min)

Chapters 4–7 are not started.
