# Real-device test protocol: Samsung Galaxy A26 5G — Chapters 1–3 preview

Build under test: the Chapters 1–3 preview with the TalkBack fix (27 Nov 2026), at the same preview URL. Phone page with links, checklist and a copy-results button: https://claude.ai/artifact/G8pcwwkBQxrFwJbTJK798q (private).

**How the tests are split**

- **A** — Manual: your eyes and hands
- **B** — On-device automated: built into the preview, no cable
- **C** — Needs a connected computer

**Recorded 27 Nov 2026:** Chapters 1–3 are provisionally approved as the technical and design baseline, on automated evidence only. Real-device validation is outstanding. Not approved for public release.

**Status:** automated PASSED 9 · automated PARTIAL 14 · no automated evidence 15 · on the A26: 0 of 38 tested (all NOT TESTED).

Total time: about 60–75 minutes (S0–T6). C is optional.

## Preview URLs

| ID | Purpose | URL | Note |
|---|---|---|---|
| U1 | Preview (normal) | https://claude.ai/artifact/YW1GEiLiyRxQ9QZ1i2C2sn | All manual checks. |
| U2 | Performance readout | https://claude.ai/artifact/YW1GEiLiyRxQ9QZ1i2C2sn#perf | Frame times, chapter/transition stats, long tasks, CLS, handoff Δ. |
| U3 | Performance, tier A forced | https://claude.ai/artifact/YW1GEiLiyRxQ9QZ1i2C2sn#perf-tier-a-nodowngrade | Headroom check: the heavier cascade the phone would not get by default. |
| U4 | Transition lab | https://claude.ai/artifact/YW1GEiLiyRxQ9QZ1i2C2sn#lab-transition-nodowngrade | Page-edge accuracy against this phone's GPU. |
| U5 | Transition lab, tier A forced | https://claude.ai/artifact/YW1GEiLiyRxQ9QZ1i2C2sn#lab-transition-tier-a-nodowngrade | Accuracy with the heavier cascade. |
| U6a | Ch3 30 %: page starts to arrive (296 vh) | https://claude.ai/artifact/YW1GEiLiyRxQ9QZ1i2C2sn#vh-296-windt-3-nodamp | Fixed wind, exact position; compare with the mobile lab sheet. |
| U6b | Ch3 45 %: page arriving (329 vh) | https://claude.ai/artifact/YW1GEiLiyRxQ9QZ1i2C2sn#vh-329-windt-3-nodamp |  |
| U6c | Ch3 60 %: page at rest (362 vh) | https://claude.ai/artifact/YW1GEiLiyRxQ9QZ1i2C2sn#vh-362-windt-3-nodamp |  |
| U6d | Ch3 84 %: closing begins (415 vh) | https://claude.ai/artifact/YW1GEiLiyRxQ9QZ1i2C2sn#vh-415-windt-3-nodamp |  |
| U6e | Ch3 92 %: closing (432 vh) | https://claude.ai/artifact/YW1GEiLiyRxQ9QZ1i2C2sn#vh-432-windt-3-nodamp |  |
| U6f | Ch3 100 %: page covers the screen (450 vh) | https://claude.ai/artifact/YW1GEiLiyRxQ9QZ1i2C2sn#vh-450-windt-3-nodamp |  |
| U7 | Reduced motion by flag | https://claude.ai/artifact/YW1GEiLiyRxQ9QZ1i2C2sn#reduced-perf | Static spreads without changing the phone's setting. |
| U8 | I6 matched still (experiment) | https://claude.ai/artifact/YW1GEiLiyRxQ9QZ1i2C2sn#perf-still-matched | Handoff Δ with the density-matched still. |
| R | Review pack (frame sheets to compare) | https://claude.ai/artifact/1ezWjMpK1MZt1gUddGyjdy#sheets | Open on a second device or later; mobile sheets are the reference. |

## S0 · Set-up and test conditions  _(Manual: your eyes and hands)_

Do this once before any test. Record what you find; several results depend on it.

### S0.1 · Record the device and software

**Automated (headless, emulated phone): NONE** — Device facts: nothing to automate.

**On the A26: NOT TESTED**

Steps:
1. Settings → About phone: note the model name and RAM; Software information → One UI version and Android version.
2. Chrome → ⋮ → Settings → About Chrome: note the Chrome version.
3. Settings → Display → Motion smoothness: note Adaptive (120 Hz) or Standard (60 Hz). Leave it on the default, Adaptive.

Expected:
Galaxy A26 5G, Chrome (not the Claude app, not Samsung Internet) for every test unless a step says otherwise.

Evidence: Write the values in the notes field.

### S0.2 · Conditions

**Automated (headless, emulated phone): NONE** — Test conditions on the phone.

**On the A26: NOT TESTED**

Steps:
1. Battery ≥ 50 %, charger unplugged, Power saving OFF (Settings → Battery). Power saving lowers the frame rate and changes every result.
2. Wi-Fi on. Data Saver / Lite mode OFF in Chrome (Data Saver makes the page choose the still on purpose).
3. Close other apps. Phone at room temperature (not just after charging or gaming).
4. Brightness fixed at about 70 % (Adaptive brightness off) so recordings compare.
5. Display size and font size at default for all tests except T5.7.
6. Do Not Disturb on (notifications distort frame times and recordings).

Expected:
All conditions met, or the exception written in the notes.

Evidence: Notes.

### S0.3 · Access and tools

**Automated (headless, emulated phone): PARTIAL** — The published preview bundle loads with no failed requests, in live, lab and static modes (smoke test). Signing in and the phone's Chrome: not tested.

**On the A26: NOT TESTED**

Steps:
1. In Chrome on the phone, sign in to claude.ai with the same account. The preview is private and only opens for you.
2. Open U1 and check that the preview loads. The preview runs inside claude.ai's viewer frame; that is expected.
3. Screen recorder: Quick panel → Screen recorder → settings: Video quality 1080p, Sound “Media sounds”. You will use it in T2, T5 and T6.
4. TalkBack shortcut: Settings → Accessibility → Advanced settings → Side and Volume up keys / Volume keys shortcut → TalkBack. Then you can turn TalkBack on and off by holding both volume keys for 3 seconds.

Expected:
The preview opens. Screen recorder and the TalkBack shortcut are ready.

Evidence: Notes. If the preview does not open, stop and tell me.

## T1 · Page-edge accuracy (Chapter 3)  _(On-device automated: built into the preview, no cable)_

Measured on the phone by the transition lab: it runs the locked shader on this phone's GPU and compares it with the code that places the ivory page edge. No cable needed. Criterion (approved): P99 ≤ 2 CSS px and max ≤ 3 CSS px, for the points and for the edge. The scripted run lasts 30 s: it sweeps the page between arriving (Ch3 30 %) and resting (84 %) twice, moves a virtual pointer over the hair, with live wind, and reads the GPU back every 10th frame.

### T1.1 · Accuracy run, default tier — U4

**Automated (headless, emulated phone): PASSED** — Tier B (the A26 default) at an A26-sized screen (384×832 @2.8125). Spec run: 8 probed frames, point P99 0.005 px / max 0.011 px, edge max 0.018 px. Dense run: 74 frames, point P99 0.005 px / max 0.24 px, edge P99 0.024 px / max 2.23 px (limit 3 px; thinnest margin seen). GPU: SwiftShader, not the A26's Mali GPU.

**On the A26: NOT TESTED**

Steps:
1. Open U4. Wait until the hair moves and the lab panel appears (about 10–20 s). The panel covers most of the screen on a phone; that is expected.
2. Do not touch the screen except to start the run. Tap “Run accuracy test (30 s)”. Put the phone down, screen up, for 35 s.
3. When the panel shows PASS or FAIL, tap “Copy results” and paste into a note. Then take a screenshot of the panel; scroll the panel to capture every line.

Expected:
PASS. GPU line names the phone's GPU (Mali, not SwiftShader). Probed frames ≥ 20. Pointer force > 0 in most probed frames. Point and edge P99 ≤ 2 px, max ≤ 3 px. In simulation the worst case was 0.15 px; real GPUs may differ slightly.

Evidence: Copied JSON + screenshot(s) of the panel.

### T1.2 · Accuracy run, tier A forced — U5

**Automated (headless, emulated phone): PASSED** — Tier A, spec and dense runs, desktop and mobile: worst point max 0.15 px, edge max 0.03 px; repeated in the e2e suite on every run. SwiftShader.

**On the A26: NOT TESTED**

Steps:
1. Same as T1.1 with U5.

Expected:
PASS, same criteria. Fewer probed frames is acceptable if the phone renders tier A more slowly.

Evidence: Copied JSON + screenshot.

### T1.3 · Visual check of the guide points — U4

**Automated (headless, emulated phone): PARTIAL** — CPU/GPU point agreement is measured (T1.1). The edge's visual position was reviewed on headless frame sheets and close-ups; the overlay itself not viewed on the phone.

**On the A26: NOT TESTED**

Steps:
1. In U4 (no run needed), tick “show guide points”.
2. Drag the Position slider slowly to about 60–80 % (the page at rest).
3. Look at the edge of the hair: green dots are the CPU guide points, the white line is the page edge.

Expected:
Green dots lie on the outer strands of the hair and move with them. The white line runs just outside the outer clump, about one finger-width of dark at most, and moves with the hair, without jumping. Magenta circles (GPU readback, shown after a run) sit on the green dots.

Evidence: Two screenshots: slider ~60 % and ~80 %.

### T1.4 · Accuracy after warm-up (optional) — U4

**Automated (headless, emulated phone): NONE** — Needs a warm phone.

**On the A26: NOT TESTED**

Steps:
1. After T2 and T3 (phone warm, about 10 minutes of use), repeat T1.1 once.

Expected:
Still PASS. Fewer probed frames is acceptable.

Evidence: Copied JSON.

## T2 · Chapter transitions, especially the Chapter 3 closing  _(Manual: your eyes and hands)_

Manual, recorded. Scroll positions on this phone (portrait): Chapter 1 0–100 vh, Chapter 2 100–230 vh, Chapter 3 230–450 vh (page arrives 296–362, rests 362–415, closes 415–450), then about one screen of ivory and the end card. One “vh” is one screen height.

### T2.1 · Slow pass, top to end card — U1

**Automated (headless, emulated phone): PARTIAL** — Automated: M1 handoff test (perceptual Δ 1.44 on mobile, limit 2); Chapter 2 lines reveal in order; the Chapter 3 page opens and covers; render pause at full cover. The look of the sequence was reviewed on headless frame sheets. Smoothness and appearance on the A26: not tested.

**On the A26: NOT TESTED**

Steps:
1. Open U1. Wait until the hair starts moving (about 3–5 s after the image appears).
2. Start the screen recorder. Scroll down slowly with one finger, about one screen every 4–5 seconds, until the ivory “Chapter 4 · FUTURA” end card is centred. Stop recording.

Expected:
- Handoff: the still image turns into moving hair without a visible jump (slight softening acceptable).
- Chapter 1: as the headline scrolls away, no hard horizontal line crosses the hair (fixed in the final build).
- Chapter 2: the camera moves in one continuous motion onto the braids (no cut, no reset). A dark field rises at the bottom, the outlined “02” appears, and the three manifesto lines appear one at a time (on a phone only one line shows at a time).
- Chapter 3, arriving: the ivory page rises from the bottom. Its top edge follows the loose hair ends; there is no gap flicker and no stepped or banded shadow at the edge.
- Chapter 3, at rest: “03”, the portrait placeholder and the Chapter 3 line sit on ivory, and none of the text overlaps hair.
- Chapter 3, closing: the page continues upwards over the hair until it covers the whole screen. Its edge straightens as it travels and the text fades. No straight horizontal band or rectangle cuts across the hair (fixed in the final build). No dark flash.
- After closing: plain ivory, then the end card text rises with no visible seam or tone step between page and end card. Then the dark enquiry section and footer.
- The header (SLAY BRAIDS, Menu) turns dark when it is over ivory and stays readable.

Evidence: Screen recording (keep the file; send it or note timestamps of any problem).

### T2.2 · Slow pass back up — U1

**Automated (headless, emulated phone): PARTIAL** — Automated: rendering resumes when scrolling back from full cover (I4 test). Reverse visuals: not tested.

**On the A26: NOT TESTED**

Steps:
1. Continue from T2.1: record again and scroll slowly back to the top.

Expected:
Everything reverses in order: the ivory page re-opens from full cover, settles against the hair, slides away down; Chapter 2 lines return; the headline returns. No state is stuck (no leftover ivory, no missing text). The header reappears when you scroll up.

Evidence: Screen recording.

### T2.3 · Fast flicks — U1

**Automated (headless, emulated phone): NONE** — Fast flicks: no automated equivalent.

**On the A26: NOT TESTED**

Steps:
1. Flick hard to the bottom, wait 2 s, flick hard to the top. Repeat twice.
2. Then stop in the middle of Chapter 3 (page at rest) and wait 2 s.

Expected:
No black or blank screen longer than a moment. The page edge stays on the hair even during a flick: page and camera run on the same clock, so any visible gap between them is a failure. After stopping, the screen settles to match the scroll position within about 1 second.

Evidence: Screen recording; note the time of any frame where the page edge is detached from the hair.

### T2.4 · Exact positions vs the frame sheet — U6a–U6f

**Automated (headless, emulated phone): PARTIAL** — Reference frames exist for every position (mobile lab sheet, headless). Not compared on the phone.

**On the A26: NOT TESTED**

Steps:
1. Open U6a, wait 15 s without touching, screenshot. Repeat for U6b–U6f.
2. Compare with the mobile lab sheet in the review pack (R, “Mobile — Chapter 3 at lab positions”).

Expected:
Same composition at each position (hair at the top, page edge along the hair ends, text on ivory; 100 % = all ivory). The phone's screen is a slightly different shape, so compare the arrangement, not pixels.

Evidence: Six screenshots.

## T3 · Scrolling smoothness, frame drops and visual stability  _(On-device automated: built into the preview, no cable)_

The #perf readout measures on the phone itself; no cable needed. It counts every animation frame. Criteria (approved for phones): Chapter 3 transition frame time P95 ≤ 34 ms; median ≥ 45 fps; CLS ≤ 0.05; no unexplained downgrades. A frame drop shows as a frame time well above the median (at 120 Hz a frame is 8.3 ms, at 60 Hz 16.7 ms).

### T3.1 · Load and handoff — U2

**Automated (headless, emulated phone): PARTIAL** — Handoff Δ passes in emulation (M1 test 1.44, readout 1.13; limit 2). Tier choice rule is unit-tested. Visual seamlessness and absence of downgrades on the A26: not tested.

**On the A26: NOT TESTED**

Steps:
1. Open U2 in a fresh tab. Do not touch the screen for 10 s.
2. Read the box: tier, viewport, “handoff Δ”, “live at … ms”.

Expected:
Tier B, reason “GPU class (… Mali …)” or “mobile / touch device”: phones get the lighter cascade by design. Handoff Δ perceptual ≤ 2 (the M1 limit). No downgrade line. Visually: seamless or slight softening.

Evidence: Screenshot of the box.

### T3.2 · Scroll pass with measurements — U2

**Automated (headless, emulated phone): PARTIAL** — CLS passes (Lighthouse 0.001 mobile; scripted scroll 0). Frame-time criteria (Ch3 transition P95 ≤ 34 ms, median ≥ 45 fps) have NO valid automated evidence: SwiftShader frames saturate at 100 ms.

**On the A26: NOT TESTED**

Steps:
1. Continue in U2: scroll slowly from the top to the end card and back to the top (about 30–40 s in total).
2. Immediately tap “Copy results” and paste into a note. If copying is blocked, screenshot the box.

Expected:
Chapter 3 transition P95 ≤ 34 ms. Median fps ≥ 45 (with Adaptive motion smoothness the browser may run above 60). CLS ≤ 0.05. Downgrades: none. Long tasks: record the count and total; they include start-up, which is why the attribution check is in C1.

Evidence: Copied JSON (or screenshot).

### T3.3 · Tier A headroom (optional) — U3

**Automated (headless, emulated phone): NONE** — Tier A headroom on the A26: device only.

**On the A26: NOT TESTED**

Steps:
1. Repeat T3.1–T3.2 with U3.

Expected:
For information only: shows whether the phone could carry the heavier cascade. Not a pass/fail criterion.

Evidence: Copied JSON.

### T3.4 · Visual stability (watch while scrolling) — U1

**Automated (headless, emulated phone): PARTIAL** — No horizontal overflow at 41 scroll positions, live and reduced, at 384 px. CLS passes. Address-bar show/hide behaviour: not tested.

**On the A26: NOT TESTED**

Steps:
1. Scroll down slowly so that Chrome's address bar hides, then scroll up a little so it shows again; repeat in each chapter.
2. Try to scroll sideways anywhere on the page.
3. Optional: Developer options → Show refresh rate, to see 120/60 Hz while scrolling.

Expected:
No jump or resize of the chapters when the address bar hides or shows. No sideways scrolling anywhere. No text that jumps after the page has loaded. The header slides away on scroll down and back on scroll up, smoothly.

Evidence: Notes; recording if something jumps.

### T3.5 · I6 matched still (experiment) — U8

**Automated (headless, emulated phone): PARTIAL** — Simulated: matched still Δ 1.17 vs 1.13 for the standard still, so I6 stays not adopted. The decision needs the phone.

**On the A26: NOT TESTED**

Steps:
1. Open U8, wait 10 s, read “handoff Δ” and the “stillMatched” value in Copy results.

Expected:
For the I6 decision: compare handoff Δ with T3.1. Adopted only if it is lower on this phone.

Evidence: Copied JSON.

## T4 · Reduced motion  _(Manual: your eyes and hands)_

Checks the static spreads that replace all motion when the phone asks for reduced motion.

### T4.1 · Phone setting: Remove animations — U2

**Automated (headless, emulated phone): PASSED** — prefers-reduced-motion emulated (M1 test): static anchor, no canvas, all text visible; static spreads checked (stills, every line visible, page drawn, no 3D). The Samsung “Remove animations” → Chrome mapping itself: not tested.

**On the A26: NOT TESTED**

Steps:
1. Settings → Accessibility → Visibility enhancements → Remove animations: ON (or search Settings for “Remove animations”).
2. Close the Chrome tab, open U2 in a new tab, wait 5 s.
3. Scroll slowly through the whole page.

Expected:
The box says tier C, reason “prefers-reduced-motion”. Nothing moves: no hair motion, no camera motion, no page closing. Chapter 1: still image with headline. Chapter 2: still close-up of the braids with all three lines visible at once. Chapter 3: still hair with the ivory page edge along it, “03”, portrait placeholder and Chapter 3 line all visible. Then the ivory end card, enquiry section and footer. All text readable; header turns dark over ivory.

Evidence: Screenshot of the box + one screenshot per chapter.

### T4.2 · Preview flag (setting OFF) — U7

**Automated (headless, emulated phone): PASSED** — Static spreads e2e test with the reduced flag, desktop and mobile.

**On the A26: NOT TESTED**

Steps:
1. Turn Remove animations OFF. Open U7 in a new tab and scroll through.

Expected:
Identical to T4.1.

Evidence: One screenshot of Chapter 3.

### T4.3 · Back to normal — U1

**Automated (headless, emulated phone): PASSED** — Every live e2e test runs with motion on, after reduced-motion tests in the same suite.

**On the A26: NOT TESTED**

Steps:
1. With the setting OFF, open U1 in a new tab.

Expected:
Motion is back (hair moves, chapters animate).

Evidence: Notes.

## T5 · Touch interactions and mobile layout integrity  _(Manual: your eyes and hands)_

Manual. Every control must be easy to hit (at least a fingertip) and do what it says.

### T5.1 · Buttons and links — U1

**Automated (headless, emulated phone): PARTIAL** — Menu dialog opens, closes and returns focus (e2e); CTA targets (#enquire, #next) and the skip link are tested. Tapping on the phone and the landing position after a jump: not tested.

**On the A26: NOT TESTED**

Steps:
1. Tap Menu → the full-screen menu opens. Tap Close → it closes.
2. Open Menu again; tap “02 The Craft” → the menu closes and the page jumps to Chapter 2. Repeat for “01 Arrival” and “03 The Unbraiding”, and the menu's “Make an enquiry”.
3. At the top, tap “Make an enquiry” → enquiry section. Scroll up, tap “Discover FUTURA” → the end card. Tap “Back to the top” → top.

Expected:
Each control works on the first tap. After a jump, the screen settles to the right chapter: jumping to Chapter 3 lands at its start, where the page has not opened yet; scroll on to see it.

Evidence: Notes; recording if anything misfires.

### T5.2 · Finger on the hair — U1

**Automated (headless, emulated phone): NONE** — The M1 pointer test is skipped on touch by design.

**On the A26: NOT TESTED**

Steps:
1. In Chapter 1 and Chapter 3, place a finger on the hair and drag slowly; then lift.

Expected:
The page scrolls normally (the hair never blocks scrolling). Strands may part slightly at the start of a drag; nothing stays parted or jitters after you lift the finger.

Evidence: Notes.

### T5.3 · Enquiry form and keyboard — U1

**Automated (headless, emulated phone): PARTIAL** — The send button is disabled and nothing is ever sent (M1 test). On-screen keyboard behaviour: not tested.

**On the A26: NOT TESTED**

Steps:
1. Go to “Make an enquiry”. Tap Name: the keyboard opens; type a few letters. Repeat for Email and Message. Tap Topic: the picker opens.
2. Close the keyboard. Look at the send button.

Expected:
The field you type in stays visible above the keyboard. The page does not jump, and the 3D does not fade or restart when the keyboard opens or closes. The button reads “Sending is not enabled in the preview” and cannot be pressed. Nothing is sent.

Evidence: Notes; screenshot with the keyboard open.

### T5.4 · Layout at every chapter — U1

**Automated (headless, emulated phone): PARTIAL** — No horizontal overflow at 384 px; axe finds no WCAG 2.1 A/AA violations (static, reduced, live). Banner overlap reviewed on headless sheets only.

**On the A26: NOT TESTED**

Steps:
1. Scroll through slowly and look at the edges of the screen, the header and the bottom banner.

Expected:
Nothing cut off at the left or right edge. Header readable on dark and on ivory. The grey preview banner at the bottom never covers a button or the Chapter 3 line completely. No text over the hair in Chapter 3.

Evidence: Screenshot of any problem.

### T5.5 · Pinch zoom — U1

**Automated (headless, emulated phone): NONE** — Pinch zoom: device only.

**On the A26: NOT TESTED**

Steps:
1. Pinch to zoom into the headline, then zoom back out.

Expected:
Zoom works and the page returns to normal without broken layout.

Evidence: Notes.

### T5.6 · Rotation — U1

**Automated (headless, emulated phone): PARTIAL** — Emulated rotation round-trip at Chapter 1 and the Chapter 3 rest: no errors, live 3D restored in both orientations. OPEN RISK: in emulation, rotating at the Chapter 3 rest moved the scroll position to the end card (380 vh → 865 vh in landscape → 679 vh back in portrait). Real Chrome may keep the place by scroll anchoring; only the phone can tell.

**On the A26: NOT TESTED**

Steps:
1. Turn auto-rotate on. In Chapter 1, rotate to landscape, wait 5 s, rotate back.
2. Repeat with the Chapter 3 page at rest.

Expected:
Each rotation: a short fade to the still image, then the landscape composition (in Chapter 3 the page comes from the right side), then the portrait composition again after rotating back. The page stays in the same chapter. No permanent black screen.

Evidence: Screen recording.

### T5.7 · Large text — U1

**Automated (headless, emulated phone): NONE** — Large system font: device only.

**On the A26: NOT TESTED**

Steps:
1. Settings → Display → Font size and style: set Font size to the largest. Reload U1 and scroll through.
2. Reset the font size afterwards.

Expected:
Text larger, still readable, no text running off the screen. Record any overlap; it is informational.

Evidence: Screenshots of any overlap.

### T5.8 · Samsung Internet (optional) — U1

**Automated (headless, emulated phone): NONE** — Samsung Internet: not available here.

**On the A26: NOT TESTED**

Steps:
1. In Samsung Internet, sign in to claude.ai, open U1 and repeat T2.1 quickly.

Expected:
Same as T2.1. Note any difference.

Evidence: Notes.

## T6 · TalkBack  _(Manual: your eyes and hands)_

Gestures: swipe right = next item; swipe left = previous; double-tap = activate; two-finger swipe = scroll; swipe up or down with one finger = change what a swipe moves by (for example Headings); swipe down then left = back. Wording varies by TalkBack version; what matters is the order and that nothing is missing or extra. TalkBack first reads claude.ai's own viewer controls; the test starts at the first item of the preview, “Skip to main content”. Fixed in this build (27 Nov 2026): before, in normal (moving) mode, Chapter 2 and 3 content was hidden from TalkBack unless that chapter was on screen. T6.2 and T6.3 now verify the fix: the reading order must be the same in both modes. One thing to watch in normal mode: when TalkBack reads Chapter 2 or 3 text that has not scrolled into view yet, its focus outline may sit over the current picture, because the text only appears visually when you reach it. Record whether that is confusing; it is an observation, not a failure.

### T6.1 · Reading order, reduced motion — U7

**Automated (headless, emulated phone): PASSED** — Chromium's accessibility tree (what TalkBack reads), reduced motion: every heading and line present once, in this order; no decorative items; axe clean. TalkBack's speech itself: not heard.

**On the A26: NOT TESTED**

Steps:
1. Open U7. Turn TalkBack on (hold both volume keys 3 s).
2. Swipe right until you reach “Skip to main content”. From there, swipe right item by item to the footer, writing down (or recording) what TalkBack says.

Expected:
- Skip to main content, link
- SLAY BRAIDS, home, link
- Menu, button (may add “pop-up”)
- Premium look. Affordable price., heading 1
- Make an enquiry, link · Discover FUTURA, link
- The craft (working title), heading 2
- Manifesto line one … · Manifesto line two … · Manifesto line three … · Placeholder copy
- The unbraiding (working title), heading 2
- Portrait awaiting approved photography · Photo credit pending (figure)
- Chapter 3 line — wording to come from SLAY BRAIDS. Placeholder copy
- Next review · Chapter 4 · FUTURA, heading 2 · Chapters 4–7 are built after this preview is approved. · Back to the top, link
- Make an enquiry, heading 2 · status text · Name, edit box · Email, edit box · Topic, drop-down (General enquiry) · Message, edit box · Sending is not enabled in the preview, button, disabled · note
- © SLAY BRAIDS · FUTURA is a SLAY BRAIDS product line. · Legal pages to follow.
- M2 preview · Chapters 1–3 · not for publication · placeholder copy is marked
- Never read: “01”, “02”, “03”, “Scroll”, images, canvas, graphics.

Evidence: Recording with speech, or the list of announcements, marking any difference.

### T6.2 · Reading order, normal motion — U1

**Automated (headless, emulated phone): PASSED** — Live-mode tree identical to reduced motion at 0, 160, 380 and 470 vh (e2e; the test fails on the build before the fix).

**On the A26: NOT TESTED**

Steps:
1. Open U1 (motion on). With TalkBack on, start at “Skip to main content” and swipe right through the page, as in T6.1.

Expected:
Exactly the same order as T6.1: nothing missing (in particular the Chapter 2 and Chapter 3 headings, the three manifesto lines, the portrait placeholder and the Chapter 3 line), nothing read twice, no numerals. Note where the focus outline appears while it reads Chapter 2–3 text.

Evidence: Recording or list of announcements.

### T6.3 · Headings navigation — U7, then U1

**Automated (headless, emulated phone): PASSED** — Headings in order (h1, then four h2) in the tree, in both modes.

**On the A26: NOT TESTED**

Steps:
1. In U7: swipe down (or up) until TalkBack says “Headings”. Then swipe right repeatedly from the top.
2. Repeat in U1.

Expected:
In both U7 and U1: Premium look. Affordable price. (1) → The craft (2) → The unbraiding (2) → Chapter 4 · FUTURA (2) → Make an enquiry (2).

Evidence: List of headings heard, for each URL.

### T6.4 · Skip link — U1

**Automated (headless, emulated phone): PASSED** — The skip link moves focus to the h1 (e2e, keyboard). TalkBack double-tap: not tested.

**On the A26: NOT TESTED**

Steps:
1. Go to the top. Focus “Skip to main content” and double-tap.

Expected:
Focus moves to the headline: TalkBack reads “Premium look. Affordable price., heading 1”.

Evidence: Notes.

### T6.5 · Menu dialog — U1

**Automated (headless, emulated phone): PARTIAL** — Focus moves into the dialog, Escape closes it, focus returns to Menu (e2e). Android back gesture and TalkBack swipe containment: not tested.

**On the A26: NOT TESTED**

Steps:
1. Focus Menu, double-tap.
2. Swipe right through the menu until nothing new is read.
3. Focus Close, double-tap.
4. Open the menu again and use the Android back gesture (swipe down then left, or the system back).

Expected:
On opening, focus moves into the menu (TalkBack reads “Close, button” or the menu name). Swiping reads: Close, Arrival, The Craft, The Unbraiding (links), the note, Make an enquiry. It does not continue into the page behind. Close returns focus to the Menu button. Back closes the menu and stays on the page. If back leaves the page instead, record it as a failure.

Evidence: Notes; recording if focus escapes.

### T6.6 · Header focus after scrolling down — U1

**Automated (headless, emulated phone): NONE** — TalkBack focus outline position: device only.

**On the A26: NOT TESTED**

Steps:
1. With TalkBack, two-finger scroll down into Chapter 2 (the header hides), then swipe left back to the Menu button.

Expected:
The focus outline is visible on screen, or the header comes back into view. Record if the focus outline is off screen.

Evidence: Screenshot.

### T6.7 · Explore by touch (normal motion) — U1

**Automated (headless, emulated phone): NONE** — Explore by touch: device only.

**On the A26: NOT TESTED**

Steps:
1. Two-finger scroll until Chapter 2's lines are visible; tap a line once with one finger.

Expected:
TalkBack reads the line you touched, once.

Evidence: Notes.

## C · Measurements that need a connected computer  _(Needs a connected computer)_

Optional and separate from the tests above. They need a Windows or Mac computer with Chrome and a USB cable, and USB debugging on the phone (Settings → About phone → Software information → tap Build number 7 times → Developer options → USB debugging). The in-page readout cannot see these. Alternatively, connect that computer to this session (Claude desktop app → Settings → Claude Code → Remote Control) and I can run C1–C3 myself while you hold the phone.

### C1 · Performance trace of the full scroll

**Automated (headless, emulated phone): NONE** — Needs a computer connected to the phone.

**On the A26: NOT TESTED**

Steps:
1. Phone connected by USB, U1 open in Chrome. On the computer: Chrome → chrome://inspect#devices → find the claude.ai tab → inspect.
2. Performance panel → enable Screenshots → Record → on the phone, do the T2.1 slow pass → Stop. Save the profile (Save profile… → .json).

Expected:
Gives what the readout cannot: frame-by-frame presentation (dropped and partially presented frames), main-thread long tasks with their causes, raster/GPU time, and the source of any layout shift.

Evidence: The saved trace file.

### C2 · Long-task attribution: start-up vs scrolling

**Automated (headless, emulated phone): NONE** — Needs a computer connected to the phone.

**On the A26: NOT TESTED**

Steps:
1. From the C1 trace: list tasks over 50 ms with their time and source.

Expected:
Approved phone criterion: no long task over 200 ms while scrolling. Start-up tasks (shader compile, geometry) are reported separately.

Evidence: From the C1 trace (I can read it from the file).

### C3 · Memory after a full scroll

**Automated (headless, emulated phone): NONE** — Needs a computer connected to the phone.

**On the A26: NOT TESTED**

Steps:
1. DevTools → Memory → take a heap snapshot after T2.1 and after T2.3.

Expected:
No steady growth between the two snapshots (no leak from repeated scrolling).

Evidence: Snapshot sizes.

### C4 · Thermal state (optional)

**Automated (headless, emulated phone): NONE** — Needs a computer connected to the phone.

**On the A26: NOT TESTED**

Steps:
1. With adb installed: adb shell dumpsys thermalservice, before T1 and after T3.

Expected:
Status 0–1 (none or light). Throttling would explain slower results.

Evidence: Both outputs.

## Sending results

On the phone page, mark each test Pass / Fail / Not run, add notes, then tap “Copy all results” and paste them into the chat with the copied lab and readout JSON. Attach or describe recordings and screenshots for any failure. I will analyse failures and propose only the corrections they require; nothing changes before you approve.
