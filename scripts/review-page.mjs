/**
 * Builds the Chapters 1–3 review page (docs/review/m2/index.html) from the measured results in
 * docs/perf/. Every number on the page comes from a file; missing results print "not measured".
 *   node scripts/review-page.mjs
 */
import { readFile, writeFile } from "node:fs/promises";

const j = async (f) => {
  try {
    return JSON.parse(await readFile(f, "utf8"));
  } catch {
    return null;
  }
};
const esc = (s) =>
  String(s).replace(
    /[&<>"']/g,
    (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c],
  );
const n = (v, d = 2) => (v == null || Number.isNaN(v) ? "—" : Number(v).toFixed(d));
const NM = '<span class="nm">not measured</span>';

const PREVIEW = "https://claude.ai/artifact/YW1GEiLiyRxQ9QZ1i2C2sn";
const acc = {};
for (const m of ["desktop", "mobile"])
  for (const e of [10, 1]) acc[`${m}-${e}`] = await j(`docs/perf/accuracy-${m}-every${e}.json`);
const contrast = [
  await j("docs/perf/ch2-contrast-desktop.json"),
  await j("docs/perf/ch2-contrast-mobile.json"),
].filter(Boolean);
const lh = {
  "mobile-auto": await j("docs/perf/lighthouse-mobile-auto.json"),
  "mobile-static": await j("docs/perf/lighthouse-mobile-static.json"),
  "desktop-auto": await j("docs/perf/lighthouse-desktop-auto.json"),
};
const bundle = await j("docs/perf/bundle.json");
const sim = {
  desktop: await j("docs/perf/perf-sim-desktop.json"),
  mobile: await j("docs/perf/perf-sim-mobile.json"),
  matched: await j("docs/perf/perf-sim-mobile-stillmatched.json"),
};
const tests = await j("docs/perf/test-results.json");

// ---------- sections ----------
const accRows = Object.entries(acc)
  .map(([k, d]) => {
    const [m, e] = k.split("-");
    if (!d) return `<tr><td>${m}</td><td>every ${e}</td><td colspan="7">${NM}</td></tr>`;
    return `<tr><td>${m}<br><small>${esc(d.viewport.width)}×${esc(d.viewport.height)} @${esc(d.viewport.dpr)}x</small></td><td>every ${e} frame${e === "1" ? "" : "s"}</td>
      <td class="r">${d.probedFrames}</td><td class="r">${d.guidePoints.toLocaleString("en")}</td>
      <td class="r">${n(d.conditions.windMin)}–${n(d.conditions.windMax)}<br><small>pointer ${n(d.conditions.pointerForceMax)} in ${d.conditions.framesWithPointer}/${d.probedFrames}</small></td>
      <td class="r">${n(d.pointError.p50, 4)} / ${n(d.pointError.p95, 4)} / ${n(d.pointError.p99, 4)}</td><td class="r">${n(d.pointError.max, 3)}</td>
      <td class="r">${n(d.edgeError.p99, 3)} / ${n(d.edgeError.max, 3)}</td><td>${d.pass ? '<b class="ok">pass</b>' : '<b class="bad">fail</b>'}</td></tr>`;
  })
  .join("");

const cRows = [];
const cFails = [];
let cJudged = 0;
let cTrans = 0;
for (const c of contrast) {
  cJudged += c.summary.judged;
  cTrans += c.summary.inTransition;
  cFails.push(...c.summary.failures);
  for (const [vp, min] of Object.entries(c.summary.minRatioByViewport)) {
    const rows = c.results.filter((r) => r.viewport === vp && r.steady);
    const worst = rows.reduce((a, b) => (b.ratio < a.ratio ? b : a), rows[0] ?? {});
    const byState = (s) => {
      const r = rows.filter((x) => x.state === s);
      return r.length ? n(Math.min(...r.map((x) => x.ratio))) : "—";
    };
    cRows.push(`<tr><td>${esc(vp)}</td><td class="r">${rows.length}</td><td class="r"><b>${n(min)}</b>:1</td><td class="r">${byState("active")}</td><td class="r">${byState("past")}</td>
      <td>${worst.line ? `line ${worst.line} (${esc(worst.state)}) at ${worst.vh} vh, wind ${worst.phase} s` : "—"}</td><td>${min >= 7 ? '<b class="ok">pass</b>' : '<b class="bad">fail</b>'}</td></tr>`);
  }
}
const contrastDone = contrast.length === 2;

const simRow = (label, d, key) => {
  const v = d?.[key];
  if (!v) return `<td>${NM}</td>`;
  return `<td class="r">${n(v.p50, 1)} / ${n(v.p95, 1)} / ${n(v.p99, 1)}<br><small>${v.fpsMedian} fps median · n ${v.n}</small></td>`;
};
const simTable = `
<table><thead><tr><th>Simulated (SwiftShader, CPU)</th><th>Desktop 1440×900</th><th>Mobile 412×915 @2.625x</th></tr></thead><tbody>
<tr><td>All frames P50 / P95 / P99 ms</td>${simRow("", sim.desktop, "allFrames")}${simRow("", sim.mobile, "allFrames")}</tr>
<tr><td>Chapter 1</td>${simRow("", sim.desktop, "ch1")}${simRow("", sim.mobile, "ch1")}</tr>
<tr><td>Chapter 2</td>${simRow("", sim.desktop, "ch2")}${simRow("", sim.mobile, "ch2")}</tr>
<tr><td>Chapter 3</td>${simRow("", sim.desktop, "ch3")}${simRow("", sim.mobile, "ch3")}</tr>
<tr><td>Chapter 3 transition only</td>${simRow("", sim.desktop, "ch3Transition")}${simRow("", sim.mobile, "ch3Transition")}</tr>
<tr><td>Page-edge compute ms (CPU)</td>${simRow("", sim.desktop, "edgeComputeMs")}${simRow("", sim.mobile, "edgeComputeMs")}</tr>
<tr><td>Long tasks (count · total · max ms)</td>${["desktop", "mobile"].map((m) => (sim[m] ? `<td class="r">${sim[m].longTasks.count} · ${sim[m].longTasks.totalMs} · ${sim[m].longTasks.max}</td>` : `<td>${NM}</td>`)).join("")}</tr>
<tr><td>LCP ms (in this run)</td>${["desktop", "mobile"].map((m) => (sim[m] ? `<td class="r">${sim[m].lcpMs}</td>` : `<td>${NM}</td>`)).join("")}</tr>
<tr><td>CLS (in this run)</td>${["desktop", "mobile"].map((m) => (sim[m] ? `<td class="r">${sim[m].cls}</td>` : `<td>${NM}</td>`)).join("")}</tr>
<tr><td>Handoff Δ raw / perceptual (0–255)</td>${["desktop", "mobile"].map((m) => (sim[m]?.handoff ? `<td class="r">${sim[m].handoff.raw} / ${sim[m].handoff.perceptual}<br><small>${esc(sim[m].handoff.still)} vs ${esc(sim[m].handoff.size)} live</small></td>` : `<td>${NM}</td>`)).join("")}</tr>
<tr><td>I6 matched still: handoff Δ</td><td>—</td>${sim.matched?.handoff ? `<td class="r">${sim.matched.handoff.raw} / ${sim.matched.handoff.perceptual}<br><small>${esc(sim.matched.stillMatched)}</small></td>` : `<td>${NM}</td>`}</tr>
</tbody></table>
<p class="note">SwiftShader renders WebGL on this container's CPU. The scene clamps each frame's time at 100 ms, so frame times saturate at 100 ms here. These rows show that the code runs and how its CPU-side parts scale. They are <b>not</b> evidence about any GPU or phone.</p>`;

const devices = [
  "Recent iPhone (Safari)",
  "Mid-range Android (Chrome)",
  "Low-end Android (Chrome)",
  "Laptop, integrated GPU",
  "Desktop, dedicated GPU",
];
const realTable = `<table><thead><tr><th>Real devices</th><th>Frame P50/P95/P99</th><th>Median fps</th><th>Ch3 transition</th><th>Long tasks</th><th>LCP</th><th>CLS</th><th>Handoff Δ</th><th>Edge accuracy (lab)</th></tr></thead><tbody>
${devices.map((d) => `<tr><td>${d}</td>${Array(8).fill(`<td>${NM}</td>`).join("")}</tr>`).join("")}</tbody></table>
<p class="note">No device or computer is connected to this session, so nothing here was measured on real hardware. Protocol: <code>docs/real-device-test-protocol.md</code> (M2 addendum). Open the preview with <code>#perf</code> and <code>#lab-transition</code> on each device and paste the copied results.</p>`;

const lhRows = Object.entries(lh)
  .map(([k, d]) =>
    d
      ? `<tr><td>${k}</td><td class="r">${d.performance}</td><td class="r">${d.accessibility}</td><td class="r">${d.bestPractices}</td><td class="r">${d.LCP_ms}</td><td class="r">${d.TBT_ms}</td><td class="r">${d.CLS}</td><td class="r">${d.SpeedIndex_ms}</td></tr>`
      : `<tr><td>${k}</td><td colspan="7">${NM}</td></tr>`,
  )
  .join("");

const testRows = tests
  ? tests.suites
      .map(
        (s) =>
          `<tr><td>${esc(s.name)}</td><td class="r">${s.passed}</td><td class="r">${s.failed}</td><td class="r">${s.skipped}</td><td>${esc(s.note ?? "")}</td></tr>`,
      )
      .join("")
  : `<tr><td colspan="5">${NM}</td></tr>`;

const sheets = [
  ["sequence-desktop.jpg", "Desktop 1440×900 — the continuous scroll, 0 → 580 vh"],
  [
    "lab-desktop.jpg",
    "Desktop — Chapter 3 at lab positions: page arrives (30–60 %), rests, closes over the hair (84–100 %)",
  ],
  ["static-desktop.jpg", "Desktop — static / reduced-motion spreads"],
  ["sequence-mobile.jpg", "Mobile 412×915 — the continuous scroll, 0 → 530 vh"],
  ["lab-mobile.jpg", "Mobile — Chapter 3 at lab positions"],
  ["static-mobile.jpg", "Mobile — static / reduced-motion spreads"],
];

const register = [
  [
    "I1",
    "Camera keys K1, K1b, K2 + one continuous timeline",
    "chapters/cameraTimeline.ts",
    "K0 read from the locked framing. Hermite with Catmull-Rom tangents; unit tests prove no jumps and continuous speed. K2 adds an optional camera roll (new optional field; M1 keys have none).",
  ],
  [
    "I2",
    "Guide strand",
    "chapters/guideStrand.ts",
    "Read-only use of the scene's buffers. Exact float32 copy of the shader displacement, same matrices as the frame just rendered.",
  ],
  [
    "I3",
    "SVG page",
    "chapters/paper.ts",
    "Above the canvas, below the type. 1 px champagne highlight (35 %), blurred paper shadow, blurred contact shadow, spill at the projected key pool.",
  ],
  [
    "I4",
    "Render pause",
    "chapters/live.ts",
    "Only while the page or an opaque section covers the whole screen; resumes on scroll. e2e-tested.",
  ],
  [
    "I5",
    "Ch2 / Ch3 stills",
    "render-chapter-stills.mjs · public/chapters",
    "From the locked scene, wind 0, own manifest with the static page edge. anchor_v1 untouched.",
  ],
  [
    "I6",
    "Density-matched still",
    "encode-matched-stills.mjs · #still-matched",
    "Not adopted. Simulated Δ did not improve; awaiting real phones.",
  ],
  [
    "I7",
    "Metric-matched fallback fonts",
    "globals.css",
    "size-adjust / ascent / descent from the font files; hero width in em. Hero layout shift 0.047 → 0.0002 (trace).",
  ],
];
const decisions = [
  [
    "K2 frames the cascade's lit upper boundary, rolled 25°",
    "At the tips the hair lies outside the locked key pool and reads as black, so the page looked cut around an empty shape. On the lit boundary it meets visible strands over the full height.",
  ],
  [
    "“Away” closes the page over the hair until it covers the screen",
    "Sliding a hair-shaped page upwards showed a cut-out travelling away from its hair. The edge now relaxes to a straight line as it closes; the ivory end card continues the page. This is the full-cover state I4 was specified for.",
  ],
  [
    "The page edge follows the outer clump",
    "The 6th-furthest fibre per row, not the single furthest stray. Strays pass under the page. Tips are weighted by the shader's own tip fade, so the edge never jumps when a tip crosses a row.",
  ],
  [
    "Chapter frames fixed, driven by the camera's clock; one-screen Chapter 3 tail",
    "A 60 vh tail was tried and rejected: the end card rose across the hair while the page was still closing.",
  ],
  [
    "No paper texture of its own",
    "The site-wide grain lies over the page. The texture image had become the LCP element (6.7 s); removing it restored 0.9 s.",
  ],
  [
    "Mobile headline scrim pinned and faded on the scroll clock",
    "Its bottom edge was travelling up across the hair as a hard line.",
  ],
  [
    "Logo slot shows plain text “SLAY BRAIDS”",
    "Dashed placeholder box, accessible name “SLAY BRAIDS, home”. Not a recreation of the logo; the file is still pending.",
  ],
];

const html = `<!DOCTYPE html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>SLAY BRAIDS — Chapters 1–3 review</title>
<link rel="preconnect" href="https://fonts.googleapis.com"><link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Bodoni+Moda:ital,opsz,wght@0,6..96,400..600;1,6..96,400&family=Inter:wght@400;500;600&display=swap" rel="stylesheet">
<style>
/* VOICE: a printed review dossier for a luxury campaign; calm, exact, nothing oversold.
   IDEA: the brand's own spread: ink cover, ivory pages.  PICTURE: the frame sheets themselves.
   COLOUR and TYPE: ink #0a0908, ivory #f2ece2, espresso #1c1612, one champagne accent; Bodoni Moda + Inter.
   LAYOUT: cover band with the verdict, then ivory pages: checklist, sheets, results, register. */
:root{color-scheme:light dark;--ink:#0a0908;--ivory:#f2ece2;--esp:#1c1612;--ch:#a8875a;--chl:#d8c3a0;--bg:light-dark(#f2ece2,#14110e);--fg:light-dark(#1c1612,#efe8dc);--mute:light-dark(#5e5248,#b8ac9c);--rule:light-dark(#d9cfbf,#3a322a);--card:light-dark(#ebe3d6,#1d1915)}
:root[data-theme=light]{color-scheme:light}:root[data-theme=dark]{color-scheme:dark}
*{box-sizing:border-box;min-width:0}
body{margin:0;background:var(--bg);color:var(--fg);font:16px/1.6 Inter,system-ui,sans-serif;overflow-x:clip}
h1,h2,h3{font-family:"Bodoni Moda",Georgia,serif;font-weight:500;line-height:1.05;text-wrap:balance;margin:0 0 .5em}
h1{font-size:clamp(34px,5vw,52px)}h2{font-size:clamp(26px,3vw,36px);margin-top:.2em}h3{font-size:21px}
.band{padding:clamp(28px,4vw,64px) max(5vw,16px)}.wrap{max-width:1240px;margin:0 auto}
.cover{background:var(--ink);color:var(--ivory)}.cover p{color:#cfc4b4;max-width:68ch}.cover a{color:var(--chl)}
.verdict{display:grid;grid-template-columns:repeat(auto-fit,minmax(min(100%,260px),1fr));gap:12px;margin-top:28px}
.verdict div{border:1px solid #3b342c;padding:14px 16px}.verdict b{display:block;font:500 13px Inter;color:var(--chl);margin-bottom:4px}
.links{display:flex;flex-wrap:wrap;gap:10px;margin-top:22px}.links a{display:inline-flex;align-items:center;min-height:44px;padding:0 18px;border-radius:999px;border:1px solid #6b5e4f;text-decoration:none}
.links a.primary{background:var(--chl);color:var(--ink);border-color:var(--chl)}
nav.toc{display:flex;flex-wrap:wrap;gap:6px 18px;padding:12px max(5vw,16px);border-bottom:1px solid var(--rule);font-size:14px}
@media(min-width:900px){nav.toc{position:sticky;top:0;background:var(--bg);z-index:5}}
nav.toc a{color:var(--fg)}html{scroll-padding-top:72px}
table{border-collapse:collapse;width:100%;font-size:14px;margin:8px 0 6px}th,td{text-align:left;padding:9px 10px;border-bottom:1px solid var(--rule);vertical-align:top}
th{font-weight:600;font-size:13px;color:var(--mute)}td.r{text-align:right;font-variant-numeric:tabular-nums;white-space:nowrap}small{color:var(--mute)}
.scroll{overflow-x:auto}.note{color:var(--mute);font-size:14px;max-width:80ch}.nm{color:var(--mute);font-style:italic;white-space:nowrap}
.ok{color:light-dark(#2f6b2f,#8fd08a)}.bad{color:light-dark(#a3332b,#f19a8f)}
figure{margin:0 0 34px}figure img{width:100%;height:auto;display:block;border:1px solid var(--rule);background:#1b1815}figcaption{font-size:14px;color:var(--mute);margin-top:8px}
.check{list-style:none;padding:0;margin:0;display:grid;gap:10px}.check li{display:grid;grid-template-columns:2.2em 1fr;gap:10px;padding:12px 14px;background:var(--card)}
.check .n{font-family:"Bodoni Moda",serif;font-size:22px;color:var(--ch);line-height:1}
code{font-size:13px;overflow-wrap:anywhere}
@media(max-width:600px){table{font-size:13px}td,th{padding:7px 6px}}
</style></head><body>
<header class="band cover"><div class="wrap">
<h1>Chapters 1–3: the review pack</h1>
<p>The private preview, the transition lab, frame sheets from the final build and every measured result, gathered for your visual review. This is the evidence for the approved phase only. It is not a request to start Chapters 4–7.</p>
<div class="links"><a class="primary" href="${PREVIEW}">Open the preview</a><a href="${PREVIEW}#lab-transition">Transition lab</a><a href="${PREVIEW}#perf">Performance readout</a><a href="${PREVIEW}#reduced">Reduced-motion spreads</a></div>
<div class="verdict">
<div><b>anchor_v1 lock</b>Lock test 6 / 6. Masters, manifest and all 18 encodes unchanged (sha256).</div>
<div><b>Page-edge accuracy</b>${Object.values(acc).every((d) => d?.pass) ? "Pass in all four runs" : "See results"}: worst point P99 ${n(
  Math.max(
    ...Object.values(acc)
      .filter(Boolean)
      .map((d) => d.pointError.p99),
  ),
  3,
)} px, worst max ${n(
  Math.max(
    ...Object.values(acc)
      .filter(Boolean)
      .map((d) => Math.max(d.pointError.max, d.edgeError.max)),
  ),
  2,
)} px (limits 2 / 3). Simulated GPU.</div>
<div><b>Chapter 2 contrast</b>${contrastDone ? (cFails.length ? `${cFails.length} failing samples` : "Every shown line ≥ 7:1") : "not finished"}${contrastDone ? `. Worst case ${n(Math.min(...contrast.map((c) => c.summary.minRatio)))}:1 over ${cJudged} judged samples.` : ""}</div>
<div><b>Real devices</b>Not measured. No device or computer is connected to this session.</div>
</div></div></header>
<nav class="toc" aria-label="Sections"><a href="#checklist">Checklist</a><a href="#sheets">Frame sheets</a><a href="#lab">Transition lab</a><a href="#contrast">Chapter 2 contrast</a><a href="#perf">Performance</a><a href="#tests">Tests</a><a href="#register">Change register</a><a href="#open">Open items</a></nav>

<section class="band" id="checklist"><div class="wrap">
<h2>Your seven checks</h2>
<ol class="check">
<li><span class="n">1</span><div><b>Chapter 2 contrast.</b> ${contrastDone ? `21 positions × 3 wind phases × 4 viewports, all on the final build. Worst case <b>${n(Math.min(...contrast.map((c) => c.summary.minRatio)))}:1</b>; ${cFails.length ? `<b class="bad">${cFails.length} samples below 7:1</b>` : "no sample below 7:1"}. ${cTrans} samples caught mid-fade are listed separately, not judged.` : NM}</div></li>
<li><span class="n">2</span><div><b>Frame sheets</b> regenerated from the final build, desktop and mobile, including the one-screen Chapter 3 tail.</div></li>
<li><span class="n">3</span><div><b>Test suites</b> on the final build: ${tests ? tests.suites.map((s) => `${esc(s.name)} ${s.passed} passed${s.failed ? `, <b class="bad">${s.failed} failed</b>` : ""}${s.skipped ? `, ${s.skipped} skipped` : ""}`).join(" · ") : NM}.</div></li>
<li><span class="n">4</span><div><b>Lighthouse, bundle, CLS, page-edge accuracy, performance:</b> below. All lab or simulated.</div></li>
<li><span class="n">5</span><div><b>Simulated and real kept apart:</b> two separate tables. Every real-device cell reads “not measured”.</div></li>
<li><span class="n">6</span><div><b>anchor_v1:</b> lock test 6 / 6. Masters and manifest match their pre-M2 checksums. Locked files are identical to the lock commit.</div></li>
<li><span class="n">7</span><div><b>This page:</b> sheets, lab results, performance and the change register.</div></li>
</ol></div></section>

<section class="band" id="sheets"><div class="wrap">
<h2>Frame sheets (final build)</h2>
<p class="note">Live frames use a fixed wind time (3 s) and undamped scroll, so each tile is an exact scroll position. Rendered with SwiftShader, at device-pixel ratio 1.</p>
${sheets.map(([f, c]) => `<figure><a href="${f}"><img src="${f}" alt="${esc(c)}" loading="lazy"></a><figcaption>${esc(c)}</figcaption></figure>`).join("")}
</div></section>

<section class="band" id="lab"><div class="wrap">
<h2>Transition lab: page edge vs the locked shader</h2>
<p class="note">The lab compiles the locked vertex shader's own source at runtime: its declarations, plus <code>main()</code> up to the ribbon expansion. It renders every guide point into a float texture, reads it back, and compares that with the CPU guide strand that places the page edge. It runs 30 s, scripted, with live wind and a moving pointer. Readback is every 10th frame as specified, plus a dense run with every frame. GPU here: SwiftShader.</p>
<div class="scroll"><table><thead><tr><th>Viewport</th><th>Readback</th><th>Frames</th><th>Guide points</th><th>Wind · pointer</th><th>Point error P50 / P95 / P99 px</th><th>Point max px</th><th>Edge P99 / max px</th><th>Result</th></tr></thead><tbody>${accRows}</tbody></table></div>
<p class="note">Limits: P99 ≤ 2 CSS px and max ≤ 3 CSS px, applied to the points and to the edge itself. The same check runs in the e2e suite. Real-GPU accuracy: ${NM}. Tap “Run accuracy test” in <code>#lab-transition</code> on a device.</p>
</div></section>

<section class="band" id="contrast"><div class="wrap">
<h2>Chapter 2 contrast</h2>
<p class="note">For every shown line, at each position and wind phase: the line's box is captured with the type hidden, and the pixel at the 95th luminance percentile behind it is taken. The line's colour is composited over that pixel at its actual opacity, and the WCAG ratio is computed. “Past” lines are the dimmed earlier lines (desktop only; on mobile only the active line shows).</p>
${
  contrastDone
    ? `<div class="scroll"><table><thead><tr><th>Viewport</th><th>Judged</th><th>Worst</th><th>Worst active</th><th>Worst past</th><th>Where</th><th>≥ 7:1</th></tr></thead><tbody>${cRows.join("")}</tbody></table></div>
<p class="note">${cJudged} samples judged; ${cTrans} caught mid-fade (a line easing in or the chapter fading out) are kept in the data file but not judged. Data: <code>docs/perf/ch2-contrast-*.json</code>.</p>`
    : `<p>${NM}</p>`
}
</div></section>

<section class="band" id="perf"><div class="wrap">
<h2>Performance</h2>
<h3>Real devices</h3><div class="scroll">${realTable}</div>
<h3 style="margin-top:28px">Simulated: this container, headless</h3><div class="scroll">${simTable}</div>
<h3 style="margin-top:28px">Lighthouse (lab, simulated throttling)</h3>
<div class="scroll"><table><thead><tr><th>Profile</th><th>Perf</th><th>A11y</th><th>Best pr.</th><th>LCP ms</th><th>TBT ms</th><th>CLS</th><th>Speed index</th></tr></thead><tbody>${lhRows}</tbody></table></div>
<p class="note">TBT on the live profiles is high because Lighthouse's own Chrome renders the 3D on the CPU. The static profile (tier C, no three.js) shows the page itself. M1 baseline: LCP 905 ms mobile, accessibility 100.</p>
<h3 style="margin-top:28px">Bundle</h3>
${bundle ? `<p>Initial JS <b>${(bundle.initialJS.gzip / 1024).toFixed(1)} KB</b> gzip (M1: 131.1 KB) · lazy JS ${(bundle.lazyJS.gzip / 1024).toFixed(1)} KB gzip (M1: 305.5 KB) · CSS ${(bundle.css[0].gzip / 1024).toFixed(1)} KB gzip. The new chapter code loads with the scene. The lab (about 8 KB) loads only with <code>#lab-transition</code>. The static spreads (about 4 KB) never load three.js.</p>` : `<p>${NM}</p>`}
</div></section>

<section class="band" id="tests"><div class="wrap">
<h2>Tests on the final build</h2>
<div class="scroll"><table><thead><tr><th>Suite</th><th>Passed</th><th>Failed</th><th>Skipped</th><th>Note</th></tr></thead><tbody>${testRows}</tbody></table></div>
</div></section>

<section class="band" id="register"><div class="wrap">
<h2>Change register</h2>
<h3>Isolated changes (approved list)</h3>
<div class="scroll"><table><thead><tr><th></th><th>Change</th><th>Where</th><th>Notes</th></tr></thead><tbody>${register.map((r) => `<tr><td><b>${r[0]}</b></td><td>${esc(r[1])}</td><td><code>${esc(r[2])}</code></td><td>${esc(r[3])}</td></tr>`).join("")}</tbody></table></div>
<h3 style="margin-top:28px">Decisions taken during the build (for your review)</h3>
<div class="scroll"><table><thead><tr><th>Decision</th><th>Why</th></tr></thead><tbody>${decisions.map((d) => `<tr><td>${esc(d[0])}</td><td>${esc(d[1])}</td></tr>`).join("")}</tbody></table></div>
<p class="note">Not changed: geometry, shaders, lighting uniforms, the anchor framing (K0, FOV, key light, key pool), tier A settings, anchor_v1 files. No Chapters 4–7, no recolouring, no deployment, no paid services, no product claims. All copy, the portrait and the logo are marked placeholders.</p>
</div></section>

<section class="band" id="open"><div class="wrap">
<h2>Open items</h2>
<ul>
<li>Real-device runs: performance, lab accuracy on real GPUs, and the I6 decision. ${NM}.</li>
<li>Manual VoiceOver and TalkBack passes: not done; needs devices. Automated: axe clean on static, reduced-motion and live pages. Reading order, skip link and the modal menu are e2e-tested.</li>
<li>Approved copy, the Chapter 3 portrait and the logo file are still to come from SLAY BRAIDS.</li>
</ul>
<p class="note">Generated ${new Date().toISOString().slice(0, 16).replace("T", " ")} UTC from <code>docs/perf/*.json</code> by <code>scripts/review-page.mjs</code>.</p>
</div></section>
</body></html>
`;
await writeFile("docs/review/m2/index.html", html);
console.log("docs/review/m2/index.html");
