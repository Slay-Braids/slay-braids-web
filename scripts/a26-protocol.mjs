/**
 * Real-device test protocol for the Samsung Galaxy A26 5G (Chapters 1–3 preview).
 * One source, two outputs:
 *   docs/real-device-test-a26.md         (repository copy)
 *   docs/review/a26/index.html           (phone page: steps, links, checklist, copy results)
 *   node scripts/a26-protocol.mjs
 * Documentation only: it changes nothing in the build.
 */
import { mkdir, writeFile } from "node:fs/promises";

const P = "https://claude.ai/artifact/YW1GEiLiyRxQ9QZ1i2C2sn";
const REVIEW = "https://claude.ai/artifact/1ezWjMpK1MZt1gUddGyjdy";

// Mobile (portrait) chapter positions in vh, from the build (cameraTimeline.ts, CH3, CH2_LINES).
// Ch1 0–100 · Ch2 100–230 (lines at 143 / 174 / 204) · Ch3 230–450 (page arrives 296–362,
// rests 362–415, closes 415–450) · end card from 550.
const URLS = [
  ["U1", "Preview (normal)", P, "All manual checks."],
  [
    "U2",
    "Performance readout",
    `${P}#perf`,
    "Frame times, chapter/transition stats, long tasks, CLS, handoff Δ.",
  ],
  [
    "U3",
    "Performance, tier A forced",
    `${P}#perf-tier-a-nodowngrade`,
    "Headroom check: the heavier cascade the phone would not get by default.",
  ],
  [
    "U4",
    "Transition lab",
    `${P}#lab-transition-nodowngrade`,
    "Page-edge accuracy against this phone's GPU.",
  ],
  [
    "U5",
    "Transition lab, tier A forced",
    `${P}#lab-transition-tier-a-nodowngrade`,
    "Accuracy with the heavier cascade.",
  ],
  [
    "U6a",
    "Ch3 30 %: page starts to arrive (296 vh)",
    `${P}#vh-296-windt-3-nodamp`,
    "Fixed wind, exact position; compare with the mobile lab sheet.",
  ],
  ["U6b", "Ch3 45 %: page arriving (329 vh)", `${P}#vh-329-windt-3-nodamp`, ""],
  ["U6c", "Ch3 60 %: page at rest (362 vh)", `${P}#vh-362-windt-3-nodamp`, ""],
  ["U6d", "Ch3 84 %: closing begins (415 vh)", `${P}#vh-415-windt-3-nodamp`, ""],
  ["U6e", "Ch3 92 %: closing (432 vh)", `${P}#vh-432-windt-3-nodamp`, ""],
  ["U6f", "Ch3 100 %: page covers the screen (450 vh)", `${P}#vh-450-windt-3-nodamp`, ""],
  [
    "U7",
    "Reduced motion by flag",
    `${P}#reduced-perf`,
    "Static spreads without changing the phone's setting.",
  ],
  [
    "U8",
    "I6 matched still (experiment)",
    `${P}#perf-still-matched`,
    "Handoff Δ with the density-matched still.",
  ],
  [
    "R",
    "Review pack (frame sheets to compare)",
    `${REVIEW}#sheets`,
    "Open on a second device or later; mobile sheets are the reference.",
  ],
];

// kind: A = manual (eyes and hands) · B = on-device automated, built into the preview, no cable
//       C = needs a computer connected to the phone (USB debugging)
const SECTIONS = [
  {
    id: "S0",
    title: "Set-up and test conditions",
    kind: "A",
    intro: "Do this once before any test. Record what you find; several results depend on it.",
    tests: [
      {
        id: "S0.1",
        name: "Record the device and software",
        steps: [
          "Settings → About phone: note the model name and RAM; Software information → One UI version and Android version.",
          "Chrome → ⋮ → Settings → About Chrome: note the Chrome version.",
          "Settings → Display → Motion smoothness: note Adaptive (120 Hz) or Standard (60 Hz). Leave it on the default, Adaptive.",
        ],
        expected:
          "Galaxy A26 5G, Chrome (not the Claude app, not Samsung Internet) for every test unless a step says otherwise.",
        evidence: "Write the values in the notes field.",
      },
      {
        id: "S0.2",
        name: "Conditions",
        steps: [
          "Battery ≥ 50 %, charger unplugged, Power saving OFF (Settings → Battery). Power saving lowers the frame rate and changes every result.",
          "Wi-Fi on. Data Saver / Lite mode OFF in Chrome (Data Saver makes the page choose the still on purpose).",
          "Close other apps. Phone at room temperature (not just after charging or gaming).",
          "Brightness fixed at about 70 % (Adaptive brightness off) so recordings compare.",
          "Display size and font size at default for all tests except T5.7.",
          "Do Not Disturb on (notifications distort frame times and recordings).",
        ],
        expected: "All conditions met, or the exception written in the notes.",
        evidence: "Notes.",
      },
      {
        id: "S0.3",
        name: "Access and tools",
        steps: [
          "In Chrome on the phone, sign in to claude.ai with the same account. The preview is private and only opens for you.",
          "Open U1 and check that the preview loads. The preview runs inside claude.ai's viewer frame; that is expected.",
          "Screen recorder: Quick panel → Screen recorder → settings: Video quality 1080p, Sound “Media sounds”. You will use it in T2, T5 and T6.",
          "TalkBack shortcut: Settings → Accessibility → Advanced settings → Side and Volume up keys / Volume keys shortcut → TalkBack. Then you can turn TalkBack on and off by holding both volume keys for 3 seconds.",
        ],
        expected: "The preview opens. Screen recorder and the TalkBack shortcut are ready.",
        evidence: "Notes. If the preview does not open, stop and tell me.",
      },
    ],
  },
  {
    id: "T1",
    title: "Page-edge accuracy (Chapter 3)",
    kind: "B",
    intro:
      "Measured on the phone by the transition lab: it runs the locked shader on this phone's GPU and compares it with the code that places the ivory page edge. No cable needed. Criterion (approved): P99 ≤ 2 CSS px and max ≤ 3 CSS px, for the points and for the edge. The scripted run lasts 30 s: it sweeps the page between arriving (Ch3 30 %) and resting (84 %) twice, moves a virtual pointer over the hair, with live wind, and reads the GPU back every 10th frame.",
    tests: [
      {
        id: "T1.1",
        name: "Accuracy run, default tier",
        url: "U4",
        steps: [
          "Open U4. Wait until the hair moves and the lab panel appears (about 10–20 s). The panel covers most of the screen on a phone; that is expected.",
          "Do not touch the screen except to start the run. Tap “Run accuracy test (30 s)”. Put the phone down, screen up, for 35 s.",
          "When the panel shows PASS or FAIL, tap “Copy results” and paste into a note. Then take a screenshot of the panel; scroll the panel to capture every line.",
        ],
        expected:
          "PASS. GPU line names the phone's GPU (Mali, not SwiftShader). Probed frames ≥ 20. Pointer force > 0 in most probed frames. Point and edge P99 ≤ 2 px, max ≤ 3 px. In simulation the worst case was 0.15 px; real GPUs may differ slightly.",
        evidence: "Copied JSON + screenshot(s) of the panel.",
      },
      {
        id: "T1.2",
        name: "Accuracy run, tier A forced",
        url: "U5",
        steps: ["Same as T1.1 with U5."],
        expected:
          "PASS, same criteria. Fewer probed frames is acceptable if the phone renders tier A more slowly.",
        evidence: "Copied JSON + screenshot.",
      },
      {
        id: "T1.3",
        name: "Visual check of the guide points",
        url: "U4",
        steps: [
          "In U4 (no run needed), tick “show guide points”.",
          "Drag the Position slider slowly to about 60–80 % (the page at rest).",
          "Look at the edge of the hair: green dots are the CPU guide points, the white line is the page edge.",
        ],
        expected:
          "Green dots lie on the outer strands of the hair and move with them. The white line runs just outside the outer clump, about one finger-width of dark at most, and moves with the hair, without jumping. Magenta circles (GPU readback, shown after a run) sit on the green dots.",
        evidence: "Two screenshots: slider ~60 % and ~80 %.",
      },
      {
        id: "T1.4",
        name: "Accuracy after warm-up (optional)",
        url: "U4",
        steps: ["After T2 and T3 (phone warm, about 10 minutes of use), repeat T1.1 once."],
        expected: "Still PASS. Fewer probed frames is acceptable.",
        evidence: "Copied JSON.",
      },
    ],
  },
  {
    id: "T2",
    title: "Chapter transitions, especially the Chapter 3 closing",
    kind: "A",
    intro:
      "Manual, recorded. Scroll positions on this phone (portrait): Chapter 1 0–100 vh, Chapter 2 100–230 vh, Chapter 3 230–450 vh (page arrives 296–362, rests 362–415, closes 415–450), then about one screen of ivory and the end card. One “vh” is one screen height.",
    tests: [
      {
        id: "T2.1",
        name: "Slow pass, top to end card",
        url: "U1",
        steps: [
          "Open U1. Wait until the hair starts moving (about 3–5 s after the image appears).",
          "Start the screen recorder. Scroll down slowly with one finger, about one screen every 4–5 seconds, until the ivory “Chapter 4 · FUTURA” end card is centred. Stop recording.",
        ],
        expected: [
          "Handoff: the still image turns into moving hair without a visible jump (slight softening acceptable).",
          "Chapter 1: as the headline scrolls away, no hard horizontal line crosses the hair (fixed in the final build).",
          "Chapter 2: the camera moves in one continuous motion onto the braids (no cut, no reset). A dark field rises at the bottom, the outlined “02” appears, and the three manifesto lines appear one at a time (on a phone only one line shows at a time).",
          "Chapter 3, arriving: the ivory page rises from the bottom. Its top edge follows the loose hair ends; there is no gap flicker and no stepped or banded shadow at the edge.",
          "Chapter 3, at rest: “03”, the portrait placeholder and the Chapter 3 line sit on ivory, and none of the text overlaps hair.",
          "Chapter 3, closing: the page continues upwards over the hair until it covers the whole screen. Its edge straightens as it travels and the text fades. No straight horizontal band or rectangle cuts across the hair (fixed in the final build). No dark flash.",
          "After closing: plain ivory, then the end card text rises with no visible seam or tone step between page and end card. Then the dark enquiry section and footer.",
          "The header (SLAY BRAIDS, Menu) turns dark when it is over ivory and stays readable.",
        ],
        evidence: "Screen recording (keep the file; send it or note timestamps of any problem).",
      },
      {
        id: "T2.2",
        name: "Slow pass back up",
        url: "U1",
        steps: ["Continue from T2.1: record again and scroll slowly back to the top."],
        expected:
          "Everything reverses in order: the ivory page re-opens from full cover, settles against the hair, slides away down; Chapter 2 lines return; the headline returns. No state is stuck (no leftover ivory, no missing text). The header reappears when you scroll up.",
        evidence: "Screen recording.",
      },
      {
        id: "T2.3",
        name: "Fast flicks",
        url: "U1",
        steps: [
          "Flick hard to the bottom, wait 2 s, flick hard to the top. Repeat twice.",
          "Then stop in the middle of Chapter 3 (page at rest) and wait 2 s.",
        ],
        expected:
          "No black or blank screen longer than a moment. The page edge stays on the hair even during a flick: page and camera run on the same clock, so any visible gap between them is a failure. After stopping, the screen settles to match the scroll position within about 1 second.",
        evidence:
          "Screen recording; note the time of any frame where the page edge is detached from the hair.",
      },
      {
        id: "T2.4",
        name: "Exact positions vs the frame sheet",
        url: "U6a–U6f",
        steps: [
          "Open U6a, wait 15 s without touching, screenshot. Repeat for U6b–U6f.",
          "Compare with the mobile lab sheet in the review pack (R, “Mobile — Chapter 3 at lab positions”).",
        ],
        expected:
          "Same composition at each position (hair at the top, page edge along the hair ends, text on ivory; 100 % = all ivory). The phone's screen is a slightly different shape, so compare the arrangement, not pixels.",
        evidence: "Six screenshots.",
      },
    ],
  },
  {
    id: "T3",
    title: "Scrolling smoothness, frame drops and visual stability",
    kind: "B",
    intro:
      "The #perf readout measures on the phone itself; no cable needed. It counts every animation frame. Criteria (approved for phones): Chapter 3 transition frame time P95 ≤ 34 ms; median ≥ 45 fps; CLS ≤ 0.05; no unexplained downgrades. A frame drop shows as a frame time well above the median (at 120 Hz a frame is 8.3 ms, at 60 Hz 16.7 ms).",
    tests: [
      {
        id: "T3.1",
        name: "Load and handoff",
        url: "U2",
        steps: [
          "Open U2 in a fresh tab. Do not touch the screen for 10 s.",
          "Read the box: tier, viewport, “handoff Δ”, “live at … ms”.",
        ],
        expected:
          "Tier B, reason “GPU class (… Mali …)” or “mobile / touch device”: phones get the lighter cascade by design. Handoff Δ perceptual ≤ 2 (the M1 limit). No downgrade line. Visually: seamless or slight softening.",
        evidence: "Screenshot of the box.",
      },
      {
        id: "T3.2",
        name: "Scroll pass with measurements",
        url: "U2",
        steps: [
          "Continue in U2: scroll slowly from the top to the end card and back to the top (about 30–40 s in total).",
          "Immediately tap “Copy results” and paste into a note. If copying is blocked, screenshot the box.",
        ],
        expected:
          "Chapter 3 transition P95 ≤ 34 ms. Median fps ≥ 45 (with Adaptive motion smoothness the browser may run above 60). CLS ≤ 0.05. Downgrades: none. Long tasks: record the count and total; they include start-up, which is why the attribution check is in C1.",
        evidence: "Copied JSON (or screenshot).",
      },
      {
        id: "T3.3",
        name: "Tier A headroom (optional)",
        url: "U3",
        steps: ["Repeat T3.1–T3.2 with U3."],
        expected:
          "For information only: shows whether the phone could carry the heavier cascade. Not a pass/fail criterion.",
        evidence: "Copied JSON.",
      },
      {
        id: "T3.4",
        name: "Visual stability (watch while scrolling)",
        url: "U1",
        steps: [
          "Scroll down slowly so that Chrome's address bar hides, then scroll up a little so it shows again; repeat in each chapter.",
          "Try to scroll sideways anywhere on the page.",
          "Optional: Developer options → Show refresh rate, to see 120/60 Hz while scrolling.",
        ],
        expected:
          "No jump or resize of the chapters when the address bar hides or shows. No sideways scrolling anywhere. No text that jumps after the page has loaded. The header slides away on scroll down and back on scroll up, smoothly.",
        evidence: "Notes; recording if something jumps.",
      },
      {
        id: "T3.5",
        name: "I6 matched still (experiment)",
        url: "U8",
        steps: [
          "Open U8, wait 10 s, read “handoff Δ” and the “stillMatched” value in Copy results.",
        ],
        expected:
          "For the I6 decision: compare handoff Δ with T3.1. Adopted only if it is lower on this phone.",
        evidence: "Copied JSON.",
      },
    ],
  },
  {
    id: "T4",
    title: "Reduced motion",
    kind: "A",
    intro:
      "Checks the static spreads that replace all motion when the phone asks for reduced motion.",
    tests: [
      {
        id: "T4.1",
        name: "Phone setting: Remove animations",
        url: "U2",
        steps: [
          "Settings → Accessibility → Visibility enhancements → Remove animations: ON (or search Settings for “Remove animations”).",
          "Close the Chrome tab, open U2 in a new tab, wait 5 s.",
          "Scroll slowly through the whole page.",
        ],
        expected:
          "The box says tier C, reason “prefers-reduced-motion”. Nothing moves: no hair motion, no camera motion, no page closing. Chapter 1: still image with headline. Chapter 2: still close-up of the braids with all three lines visible at once. Chapter 3: still hair with the ivory page edge along it, “03”, portrait placeholder and Chapter 3 line all visible. Then the ivory end card, enquiry section and footer. All text readable; header turns dark over ivory.",
        evidence: "Screenshot of the box + one screenshot per chapter.",
      },
      {
        id: "T4.2",
        name: "Preview flag (setting OFF)",
        url: "U7",
        steps: ["Turn Remove animations OFF. Open U7 in a new tab and scroll through."],
        expected: "Identical to T4.1.",
        evidence: "One screenshot of Chapter 3.",
      },
      {
        id: "T4.3",
        name: "Back to normal",
        url: "U1",
        steps: ["With the setting OFF, open U1 in a new tab."],
        expected: "Motion is back (hair moves, chapters animate).",
        evidence: "Notes.",
      },
    ],
  },
  {
    id: "T5",
    title: "Touch interactions and mobile layout integrity",
    kind: "A",
    intro: "Manual. Every control must be easy to hit (at least a fingertip) and do what it says.",
    tests: [
      {
        id: "T5.1",
        name: "Buttons and links",
        url: "U1",
        steps: [
          "Tap Menu → the full-screen menu opens. Tap Close → it closes.",
          "Open Menu again; tap “02 The Craft” → the menu closes and the page jumps to Chapter 2. Repeat for “01 Arrival” and “03 The Unbraiding”, and the menu's “Make an enquiry”.",
          "At the top, tap “Make an enquiry” → enquiry section. Scroll up, tap “Discover FUTURA” → the end card. Tap “Back to the top” → top.",
        ],
        expected:
          "Each control works on the first tap. After a jump, the screen settles to the right chapter: jumping to Chapter 3 lands at its start, where the page has not opened yet; scroll on to see it.",
        evidence: "Notes; recording if anything misfires.",
      },
      {
        id: "T5.2",
        name: "Finger on the hair",
        url: "U1",
        steps: [
          "In Chapter 1 and Chapter 3, place a finger on the hair and drag slowly; then lift.",
        ],
        expected:
          "The page scrolls normally (the hair never blocks scrolling). Strands may part slightly at the start of a drag; nothing stays parted or jitters after you lift the finger.",
        evidence: "Notes.",
      },
      {
        id: "T5.3",
        name: "Enquiry form and keyboard",
        url: "U1",
        steps: [
          "Go to “Make an enquiry”. Tap Name: the keyboard opens; type a few letters. Repeat for Email and Message. Tap Topic: the picker opens.",
          "Close the keyboard. Look at the send button.",
        ],
        expected:
          "The field you type in stays visible above the keyboard. The page does not jump, and the 3D does not fade or restart when the keyboard opens or closes. The button reads “Sending is not enabled in the preview” and cannot be pressed. Nothing is sent.",
        evidence: "Notes; screenshot with the keyboard open.",
      },
      {
        id: "T5.4",
        name: "Layout at every chapter",
        url: "U1",
        steps: [
          "Scroll through slowly and look at the edges of the screen, the header and the bottom banner.",
        ],
        expected:
          "Nothing cut off at the left or right edge. Header readable on dark and on ivory. The grey preview banner at the bottom never covers a button or the Chapter 3 line completely. No text over the hair in Chapter 3.",
        evidence: "Screenshot of any problem.",
      },
      {
        id: "T5.5",
        name: "Pinch zoom",
        url: "U1",
        steps: ["Pinch to zoom into the headline, then zoom back out."],
        expected: "Zoom works and the page returns to normal without broken layout.",
        evidence: "Notes.",
      },
      {
        id: "T5.6",
        name: "Rotation",
        url: "U1",
        steps: [
          "Turn auto-rotate on. In Chapter 1, rotate to landscape, wait 5 s, rotate back.",
          "Repeat with the Chapter 3 page at rest.",
        ],
        expected:
          "Each rotation: a short fade to the still image, then the landscape composition (in Chapter 3 the page comes from the right side), then the portrait composition again after rotating back. The page stays in the same chapter. No permanent black screen.",
        evidence: "Screen recording.",
      },
      {
        id: "T5.7",
        name: "Large text",
        url: "U1",
        steps: [
          "Settings → Display → Font size and style: set Font size to the largest. Reload U1 and scroll through.",
          "Reset the font size afterwards.",
        ],
        expected:
          "Text larger, still readable, no text running off the screen. Record any overlap; it is informational.",
        evidence: "Screenshots of any overlap.",
      },
      {
        id: "T5.8",
        name: "Samsung Internet (optional)",
        url: "U1",
        steps: ["In Samsung Internet, sign in to claude.ai, open U1 and repeat T2.1 quickly."],
        expected: "Same as T2.1. Note any difference.",
        evidence: "Notes.",
      },
    ],
  },
  {
    id: "T6",
    title: "TalkBack",
    kind: "A",
    intro:
      "Gestures: swipe right = next item; swipe left = previous; double-tap = activate; two-finger swipe = scroll; swipe up or down with one finger = change what a swipe moves by (for example Headings); swipe down then left = back. Wording varies by TalkBack version; what matters is the order and that nothing is missing or extra. TalkBack first reads claude.ai's own viewer controls; the test starts at the first item of the preview, “Skip to main content”. Fixed in this build (27 Nov 2026): before, in normal (moving) mode, Chapter 2 and 3 content was hidden from TalkBack unless that chapter was on screen. T6.2 and T6.3 now verify the fix: the reading order must be the same in both modes. One thing to watch in normal mode: when TalkBack reads Chapter 2 or 3 text that has not scrolled into view yet, its focus outline may sit over the current picture, because the text only appears visually when you reach it. Record whether that is confusing; it is an observation, not a failure.",
    tests: [
      {
        id: "T6.1",
        name: "Reading order, reduced motion",
        url: "U7",
        steps: [
          "Open U7. Turn TalkBack on (hold both volume keys 3 s).",
          "Swipe right until you reach “Skip to main content”. From there, swipe right item by item to the footer, writing down (or recording) what TalkBack says.",
        ],
        expected: [
          "Skip to main content, link",
          "SLAY BRAIDS, home, link",
          "Menu, button (may add “pop-up”)",
          "Premium look. Affordable price., heading 1",
          "Make an enquiry, link · Discover FUTURA, link",
          "The craft (working title), heading 2",
          "Manifesto line one … · Manifesto line two … · Manifesto line three … · Placeholder copy",
          "The unbraiding (working title), heading 2",
          "Portrait awaiting approved photography · Photo credit pending (figure)",
          "Chapter 3 line — wording to come from SLAY BRAIDS. Placeholder copy",
          "Next review · Chapter 4 · FUTURA, heading 2 · Chapters 4–7 are built after this preview is approved. · Back to the top, link",
          "Make an enquiry, heading 2 · status text · Name, edit box · Email, edit box · Topic, drop-down (General enquiry) · Message, edit box · Sending is not enabled in the preview, button, disabled · note",
          "© SLAY BRAIDS · FUTURA is a SLAY BRAIDS product line. · Legal pages to follow.",
          "M2 preview · Chapters 1–3 · not for publication · placeholder copy is marked",
          "Never read: “01”, “02”, “03”, “Scroll”, images, canvas, graphics.",
        ],
        evidence: "Recording with speech, or the list of announcements, marking any difference.",
      },
      {
        id: "T6.2",
        name: "Reading order, normal motion",
        url: "U1",
        steps: [
          "Open U1 (motion on). With TalkBack on, start at “Skip to main content” and swipe right through the page, as in T6.1.",
        ],
        expected:
          "Exactly the same order as T6.1: nothing missing (in particular the Chapter 2 and Chapter 3 headings, the three manifesto lines, the portrait placeholder and the Chapter 3 line), nothing read twice, no numerals. Note where the focus outline appears while it reads Chapter 2–3 text.",
        evidence: "Recording or list of announcements.",
      },
      {
        id: "T6.3",
        name: "Headings navigation",
        url: "U7, then U1",
        steps: [
          "In U7: swipe down (or up) until TalkBack says “Headings”. Then swipe right repeatedly from the top.",
          "Repeat in U1.",
        ],
        expected:
          "In both U7 and U1: Premium look. Affordable price. (1) → The craft (2) → The unbraiding (2) → Chapter 4 · FUTURA (2) → Make an enquiry (2).",
        evidence: "List of headings heard, for each URL.",
      },
      {
        id: "T6.4",
        name: "Skip link",
        url: "U1",
        steps: ["Go to the top. Focus “Skip to main content” and double-tap."],
        expected:
          "Focus moves to the headline: TalkBack reads “Premium look. Affordable price., heading 1”.",
        evidence: "Notes.",
      },
      {
        id: "T6.5",
        name: "Menu dialog",
        url: "U1",
        steps: [
          "Focus Menu, double-tap.",
          "Swipe right through the menu until nothing new is read.",
          "Focus Close, double-tap.",
          "Open the menu again and use the Android back gesture (swipe down then left, or the system back).",
        ],
        expected:
          "On opening, focus moves into the menu (TalkBack reads “Close, button” or the menu name). Swiping reads: Close, Arrival, The Craft, The Unbraiding (links), the note, Make an enquiry. It does not continue into the page behind. Close returns focus to the Menu button. Back closes the menu and stays on the page. If back leaves the page instead, record it as a failure.",
        evidence: "Notes; recording if focus escapes.",
      },
      {
        id: "T6.6",
        name: "Header focus after scrolling down",
        url: "U1",
        steps: [
          "With TalkBack, two-finger scroll down into Chapter 2 (the header hides), then swipe left back to the Menu button.",
        ],
        expected:
          "The focus outline is visible on screen, or the header comes back into view. Record if the focus outline is off screen.",
        evidence: "Screenshot.",
      },
      {
        id: "T6.7",
        name: "Explore by touch (normal motion)",
        url: "U1",
        steps: [
          "Two-finger scroll until Chapter 2's lines are visible; tap a line once with one finger.",
        ],
        expected:
          "TalkBack reads the line you touched, once.",
        evidence: "Notes.",
      },
    ],
  },
  {
    id: "C",
    title: "Measurements that need a connected computer",
    kind: "C",
    intro:
      "Optional and separate from the tests above. They need a Windows or Mac computer with Chrome and a USB cable, and USB debugging on the phone (Settings → About phone → Software information → tap Build number 7 times → Developer options → USB debugging). The in-page readout cannot see these. Alternatively, connect that computer to this session (Claude desktop app → Settings → Claude Code → Remote Control) and I can run C1–C3 myself while you hold the phone.",
    tests: [
      {
        id: "C1",
        name: "Performance trace of the full scroll",
        steps: [
          "Phone connected by USB, U1 open in Chrome. On the computer: Chrome → chrome://inspect#devices → find the claude.ai tab → inspect.",
          "Performance panel → enable Screenshots → Record → on the phone, do the T2.1 slow pass → Stop. Save the profile (Save profile… → .json).",
        ],
        expected:
          "Gives what the readout cannot: frame-by-frame presentation (dropped and partially presented frames), main-thread long tasks with their causes, raster/GPU time, and the source of any layout shift.",
        evidence: "The saved trace file.",
      },
      {
        id: "C2",
        name: "Long-task attribution: start-up vs scrolling",
        steps: ["From the C1 trace: list tasks over 50 ms with their time and source."],
        expected:
          "Approved phone criterion: no long task over 200 ms while scrolling. Start-up tasks (shader compile, geometry) are reported separately.",
        evidence: "From the C1 trace (I can read it from the file).",
      },
      {
        id: "C3",
        name: "Memory after a full scroll",
        steps: ["DevTools → Memory → take a heap snapshot after T2.1 and after T2.3."],
        expected: "No steady growth between the two snapshots (no leak from repeated scrolling).",
        evidence: "Snapshot sizes.",
      },
      {
        id: "C4",
        name: "Thermal state (optional)",
        steps: ["With adb installed: adb shell dumpsys thermalservice, before T1 and after T3."],
        expected: "Status 0–1 (none or light). Throttling would explain slower results.",
        evidence: "Both outputs.",
      },
    ],
  },
];

const KIND = {
  A: "Manual: your eyes and hands",
  B: "On-device automated: built into the preview, no cable",
  C: "Needs a connected computer",
};
const urlById = Object.fromEntries(URLS.map(([id, , u]) => [id, u]));

// ---------- Markdown ----------
const md = [];
md.push("# Real-device test protocol: Samsung Galaxy A26 5G — Chapters 1–3 preview", "");
md.push(
  "Build under test: the Chapters 1–3 preview with the TalkBack fix (27 Nov 2026), at the same preview URL. Phone page with links, checklist and a copy-results button: https://claude.ai/artifact/G8pcwwkBQxrFwJbTJK798q (private).",
  "",
  "**How the tests are split**",
  "",
  ...Object.entries(KIND).map(([k, v]) => `- **${k}** — ${v}`),
  "",
  "Total time: about 60–75 minutes (S0–T6). C is optional.",
  "",
  "## Preview URLs",
  "",
  "| ID | Purpose | URL | Note |",
  "|---|---|---|---|",
  ...URLS.map(([id, name, u, note]) => `| ${id} | ${name} | ${u} | ${note} |`),
  "",
);
for (const s of SECTIONS) {
  md.push(`## ${s.id} · ${s.title}  _(${KIND[s.kind]})_`, "", s.intro, "");
  for (const t of s.tests) {
    md.push(`### ${t.id} · ${t.name}${t.url ? ` — ${t.url}` : ""}`, "");
    md.push("Steps:", ...t.steps.map((x, i) => `${i + 1}. ${x}`), "");
    md.push(
      "Expected:",
      ...(Array.isArray(t.expected) ? t.expected.map((x) => `- ${x}`) : [t.expected]),
      "",
    );
    md.push(`Evidence: ${t.evidence}`, "");
  }
}
md.push(
  "## Sending results",
  "",
  "On the phone page, mark each test Pass / Fail / Not run, add notes, then tap “Copy all results” and paste them into the chat with the copied lab and readout JSON. Attach or describe recordings and screenshots for any failure. I will analyse failures and propose only the corrections they require; nothing changes before you approve.",
  "",
);

// ---------- HTML ----------
const esc = (s) =>
  String(s).replace(
    /[&<>"']/g,
    (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c],
  );
const urlLinks = (u) =>
  u
    ? u
        .split(/,\s*|\s+then\s+/)
        .map((x) => x.trim())
        .map((x) => {
          if (x === "U6a–U6f") return `<span class="u">U6a–U6f</span>`;
          return urlById[x]
            ? `<a class="u" href="${esc(urlById[x])}">${esc(x)}</a>`
            : `<span class="u">${esc(x)}</span>`;
        })
        .join(" ")
    : "";
const card = (t) => `
<article class="test" id="${t.id}" data-id="${t.id}">
  <header><h3><span class="tid">${t.id}</span> ${esc(t.name)}</h3>${urlLinks(t.url)}</header>
  <h4>Steps</h4><ol>${t.steps.map((x) => `<li>${esc(x)}</li>`).join("")}</ol>
  <h4>Expected</h4>${Array.isArray(t.expected) ? `<ul>${t.expected.map((x) => `<li>${esc(x)}</li>`).join("")}</ul>` : `<p>${esc(t.expected)}</p>`}
  <p class="ev"><b>Evidence:</b> ${esc(t.evidence)}</p>
  <div class="res" role="group" aria-label="Result for ${t.id}">
    <label><input type="radio" name="r-${t.id}" value="pass"><span>Pass</span></label>
    <label><input type="radio" name="r-${t.id}" value="fail"><span>Fail</span></label>
    <label><input type="radio" name="r-${t.id}" value="not run"><span>Not run</span></label>
  </div>
  <label class="notes">Notes<textarea name="n-${t.id}" rows="2"></textarea></label>
</article>`;

const html = `<!DOCTYPE html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>Galaxy A26 test protocol</title>
<link rel="preconnect" href="https://fonts.googleapis.com"><link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Bodoni+Moda:opsz,wght@6..96,500&family=Inter:wght@400;500;600&display=swap" rel="stylesheet">
<style>
/* VOICE: a field test sheet: plain, exact, one thing per line.
   IDEA: the brand's printed run-sheet; ink cover, ivory pages, one card per test.
   PICTURE: the working checklist itself, at the top under a modest title.
   COLOUR and TYPE: ink #0a0908, ivory #f2ece2, espresso, one champagne accent; Bodoni Moda titles, Inter body.
   LAYOUT: phone first; one column; sticky section links on wide screens; results always one tap away. */
:root{color-scheme:light dark;--bg:light-dark(#f2ece2,#13100d);--fg:light-dark(#1c1612,#efe8dc);--mute:light-dark(#5e5248,#b9ad9d);--rule:light-dark(#d8ceBF,#3a322a);--card:light-dark(#fbf7f1,#1c1814);--ch:light-dark(#8a6a3f,#d8c3a0);--ink:#0a0908}
:root[data-theme=light]{color-scheme:light}:root[data-theme=dark]{color-scheme:dark}
*{box-sizing:border-box;min-width:0}
body{margin:0;background:var(--bg);color:var(--fg);font:16px/1.55 Inter,system-ui,sans-serif;overflow-x:clip}
h1,h2,h3{font-family:"Bodoni Moda",Georgia,serif;font-weight:500;line-height:1.08;margin:0 0 .4em;text-wrap:balance}
h1{font-size:clamp(32px,6vw,46px)}h2{font-size:clamp(24px,4vw,32px)}h3{font-size:20px}
h4{font:600 13px Inter,sans-serif;margin:14px 0 4px;color:var(--mute)}
.band{padding:clamp(22px,4vw,48px) max(5vw,16px)}.wrap{max-width:860px;margin:0 auto}
.cover{background:var(--ink);color:#f2ece2}.cover p{color:#d2c7b7;max-width:62ch}
.kinds{display:grid;gap:8px;margin:18px 0 0;padding:0;list-style:none}.kinds li{border:1px solid #3b342c;padding:10px 12px}.kinds b{color:#d8c3a0;margin-right:6px}
nav.toc{display:flex;flex-wrap:wrap;gap:6px 14px;padding:10px max(5vw,16px);border-bottom:1px solid var(--rule);font-size:15px}
nav.toc a{color:var(--fg);padding:6px 0}
@media(min-width:900px){nav.toc{position:sticky;top:0;background:var(--bg);z-index:3}}
html{scroll-padding-top:64px}
table{border-collapse:collapse;width:100%;font-size:14px}td,th{padding:9px 8px;border-bottom:1px solid var(--rule);text-align:left;vertical-align:top}th{font-size:13px;color:var(--mute);font-weight:600}
.url{word-break:break-all;font-size:13px}.copy{min-height:44px;min-width:64px;border:1px solid var(--rule);background:var(--card);color:var(--fg);border-radius:6px;font:500 14px Inter;cursor:pointer}
.sec{margin-top:8px}.kindtag{display:inline-block;font:600 12px Inter;padding:3px 8px;border-radius:999px;border:1px solid var(--ch);color:var(--ch);margin-bottom:8px}
.intro{color:var(--mute);max-width:70ch}
.test{background:var(--card);border:1px solid var(--rule);border-radius:8px;padding:16px;margin:14px 0}
.test header{display:flex;flex-wrap:wrap;align-items:baseline;justify-content:space-between;gap:6px 12px}
.tid{font-family:Inter;font-weight:600;font-size:14px;color:var(--ch);margin-right:6px}
a.u,span.u{display:inline-flex;align-items:center;min-height:36px;padding:0 12px;border-radius:999px;border:1px solid var(--ch);color:var(--fg);text-decoration:none;font:500 14px Inter}
ol,ul{padding-left:1.2em;margin:4px 0}li{margin:3px 0}.ev{font-size:14px;color:var(--mute)}
.res{display:flex;gap:8px;flex-wrap:wrap;margin-top:12px}
.res label{flex:1 1 90px}.res input{position:absolute;opacity:0;pointer-events:none}
.res span{display:flex;justify-content:center;align-items:center;min-height:44px;border:1px solid var(--rule);border-radius:6px;font-weight:500;cursor:pointer}
.res input:focus-visible+span{outline:2px solid var(--ch);outline-offset:2px}
.res input[value=pass]:checked+span{background:light-dark(#dcebd6,#20361e);border-color:light-dark(#2f6b2f,#8fd08a)}
.res input[value=fail]:checked+span{background:light-dark(#f4d9d5,#3d1f1b);border-color:light-dark(#a3332b,#f19a8f)}
.res input[value="not run"]:checked+span{background:light-dark(#e7e1d8,#2a2520)}
.notes{display:grid;gap:4px;margin-top:10px;font-size:14px;color:var(--mute)}
textarea{width:100%;font:16px Inter;padding:10px;border:1px solid var(--rule);border-radius:6px;background:var(--bg);color:var(--fg)}
.bar{position:sticky;bottom:0;z-index:4;background:var(--ink);color:#f2ece2;padding:10px max(5vw,16px);display:flex;flex-wrap:wrap;gap:10px;align-items:center;justify-content:space-between}
.bar button{min-height:44px;padding:0 16px;border-radius:999px;border:0;background:#d8c3a0;color:#0a0908;font:600 15px Inter;cursor:pointer}
.bar .sec2{background:transparent;color:#f2ece2;border:1px solid #6b5e4f}
.count{font-size:14px}
#out{width:100%;height:160px;max-height:40vh;font:13px ui-monospace,Menlo,monospace;display:none;margin-top:10px}
.known{border-left:3px solid var(--ch);padding:8px 12px;background:var(--card)}
@media(max-width:600px){table{font-size:13px}.hide-s{display:none}}
</style></head><body>
<header class="band cover"><div class="wrap">
<h1>Galaxy A26 5G: real-device tests</h1>
<p>Chapters 1–3 preview, final build with the TalkBack fix (27 Nov 2026). Work through the cards in order, mark each result, then copy everything back to the chat. Nothing here changes the build. Results are kept in this browser only until you copy them.</p>
<ul class="kinds">${Object.entries(KIND)
  .map(([k, v]) => `<li><b>${k}</b>${esc(v)}</li>`)
  .join("")}</ul>
</div></header>
<nav class="toc" aria-label="Sections"><a href="#urls">URLs</a>${SECTIONS.map((s) => `<a href="#sec-${s.id}">${s.id} ${esc(s.title.split(",")[0].split(" (")[0])}</a>`).join("")}</nav>

<section class="band" id="urls"><div class="wrap">
<h2>Preview URLs</h2>
<p class="intro">Open in Chrome on the phone, signed in to claude.ai. Each link carries its test settings after the #. The 14 links: U1–U8 (U6 is six positions) and R.</p>
<table><thead><tr><th>ID</th><th>Purpose</th><th class="hide-s">Link</th><th></th></tr></thead><tbody>
${URLS.map(([id, name, u, note]) => `<tr><td><b>${id}</b></td><td><a href="${esc(u)}">${esc(name)}</a>${note ? `<br><small class="intro">${esc(note)}</small>` : ""}<br><span class="url">${esc(u.replace("https://", ""))}</span></td><td class="hide-s"></td><td><button class="copy" data-copy="${esc(u)}" aria-label="Copy ${id} link">Copy</button></td></tr>`).join("")}
</tbody></table>
</div></section>

${SECTIONS.map(
  (s) => `<section class="band sec" id="sec-${s.id}"><div class="wrap">
<span class="kindtag">${s.kind} · ${esc(KIND[s.kind])}</span>
<h2>${s.id} · ${esc(s.title)}</h2>
<p class="intro${s.id === "T6" ? " known" : ""}">${esc(s.intro)}</p>
${s.tests.map(card).join("")}
</div></section>`,
).join("")}

<section class="band"><div class="wrap">
<h2>Sending results</h2>
<p>Tap “Copy all results” and paste into the chat together with the copied lab and readout results (T1, T3). If copying is blocked, tap “Show as text”, select all and copy. Attach or describe recordings and screenshots for every failure. I will analyse failures and propose only the corrections they require; nothing changes before you approve.</p>
</div></section>

<div class="bar"><span class="count" id="count" aria-live="polite"></span><span>
<button type="button" id="copyall">Copy all results</button>
<button type="button" class="sec2" id="show">Show as text</button></span>
<textarea id="out" aria-label="All results as text" readonly></textarea></div>

<script>
{
  const KEY = "a26-protocol-v1";
  const ids = [...document.querySelectorAll(".test")].map((t) => t.dataset.id);
  let saved = {};
  try { saved = JSON.parse(localStorage.getItem(KEY) || "{}"); } catch (e) { saved = {}; }
  const save = () => { try { localStorage.setItem(KEY, JSON.stringify(saved)); } catch (e) {} };
  for (const id of ids) {
    const s = saved[id] || {};
    if (s.r) { const el = document.querySelector('input[name="r-' + id + '"][value="' + s.r + '"]'); if (el) el.checked = true; }
    const ta = document.querySelector('textarea[name="n-' + id + '"]'); if (ta && s.n) ta.value = s.n;
  }
  const count = document.getElementById("count");
  const update = () => {
    const done = ids.filter((id) => saved[id] && saved[id].r).length;
    const fails = ids.filter((id) => saved[id] && saved[id].r === "fail").length;
    count.textContent = done + " of " + ids.length + " marked" + (fails ? " · " + fails + " fail" : "");
  };
  document.addEventListener("change", (e) => {
    const t = e.target; const m = /^(r|n)-(.+)$/.exec(t.name || ""); if (!m) return;
    saved[m[2]] = saved[m[2]] || {}; saved[m[2]][m[1]] = t.value; save(); update();
  });
  document.addEventListener("input", (e) => {
    const t = e.target; const m = /^n-(.+)$/.exec(t.name || ""); if (!m) return;
    saved[m[1]] = saved[m[1]] || {}; saved[m[1]].n = t.value; save();
  });
  const text = () => {
    const lines = ["Galaxy A26 5G — Chapters 1–3 real-device results", "Recorded: " + new Date().toISOString().slice(0, 16).replace("T", " ") + " UTC", ""];
    for (const id of ids) {
      const s = saved[id] || {}; const name = document.querySelector('[data-id="' + id + '"] h3').textContent.trim();
      lines.push(name + ": " + (s.r ? s.r.toUpperCase() : "—") + (s.n ? "\\n    " + s.n.replace(/\\n/g, "\\n    ") : ""));
    }
    return lines.join("\\n");
  };
  const out = document.getElementById("out");
  const copy = async (s, btn, label) => {
    try { await navigator.clipboard.writeText(s); btn.textContent = "Copied"; }
    catch (e) { btn.textContent = "Copy blocked: use Show as text"; out.style.display = "block"; out.value = text(); }
    setTimeout(() => (btn.textContent = label), 2500);
  };
  document.getElementById("copyall").addEventListener("click", (e) => copy(text(), e.currentTarget, "Copy all results"));
  document.getElementById("show").addEventListener("click", () => { out.style.display = out.style.display === "block" ? "none" : "block"; out.value = text(); if (out.style.display === "block") out.select(); });
  document.querySelectorAll("[data-copy]").forEach((b) => b.addEventListener("click", (e) => copy(b.dataset.copy, e.currentTarget, "Copy")));
  update();
}
</script>
</body></html>
`;

await mkdir("docs/review/a26", { recursive: true });
await writeFile("docs/real-device-test-a26.md", md.join("\n"));
await writeFile("docs/review/a26/index.html", html);
console.log(
  "docs/real-device-test-a26.md",
  "docs/review/a26/index.html",
  SECTIONS.reduce((n, s) => n + s.tests.length, 0),
  "tests",
);
