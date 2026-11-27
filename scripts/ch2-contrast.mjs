/**
 * Chapter 2 text contrast (approved criterion): every shown line ≥ 7:1 against the brightest 5 %
 * of the pixels behind it, at 21 scroll positions × 3 wind phases, on each reference viewport.
 *
 * For each sample: render the live page (deterministic wind time, undamped scroll), read each
 * line's box and effective opacity, hide the type (layout kept), capture the background, and take
 * the 95th-percentile-luminance pixel behind the line. The line's colour is composited over that
 * pixel at its effective opacity (as the browser blends), and the WCAG ratio is computed.
 * Lines mid-fade (effective opacity between states) are reported separately, not judged.
 *
 * node scripts/ch2-contrast.mjs  → docs/perf/ch2-contrast.json
 */
import { chromium } from "@playwright/test";
import sharp from "sharp";
import { writeFile, mkdir } from "node:fs/promises";

const BASE = process.env.BASE ?? "http://127.0.0.1:4173/";
const ALL_VIEWPORTS = [
  { name: "desktop 1440×900", width: 1440, height: 900, mobile: false },
  { name: "desktop 1920×1080", width: 1920, height: 1080, mobile: false },
  { name: "mobile 412×915", width: 412, height: 915, mobile: true },
  { name: "mobile 390×844", width: 390, height: 844, mobile: true },
];
// Optional filter for parallel runs: ONLY=desktop or ONLY=mobile; OUT names the result file.
const VIEWPORTS = ALL_VIEWPORTS.filter((v) => !process.env.ONLY || v.name.startsWith(process.env.ONLY));
const OUTFILE = process.env.OUT ?? "docs/perf/ch2-contrast.json";
const PHASES = [0, 2.1, 4.2]; // wind time, s (full wind)
const POSITIONS = 21;
const TARGET = 7;

const lin = (c) => ((c /= 255) <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4);
const lum = (r, g, b) => 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b);
const ratio = (a, b) => (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05);

const browser = await chromium.launch({
  args: ["--use-angle=swiftshader", "--enable-unsafe-swiftshader", "--ignore-gpu-blocklist"],
});
const results = [];
for (const vp of VIEWPORTS) {
  for (const phase of PHASES) {
    const page = await browser.newPage({
      viewport: { width: vp.width, height: vp.height },
      deviceScaleFactor: 1,
      isMobile: vp.mobile,
      hasTouch: vp.mobile,
    });
    await page.goto(`${BASE}?tier=A&nodowngrade=1&nodamp=1&windt=${phase}`);
    await page.waitForFunction(() => window.__slay?.live === true, null, { timeout: 180000 });
    const range = await page.evaluate(() => {
      const s = document.getElementById("ch2");
      const top = s.getBoundingClientRect().top + scrollY;
      const vh = parseFloat(getComputedStyle(document.documentElement).getPropertyValue("--vh"));
      return [top / vh, (top + s.offsetHeight) / vh];
    });
    for (let i = 0; i < POSITIONS; i++) {
      const v = range[0] + ((range[1] - range[0]) * i) / (POSITIONS - 1);
      const lines = await page.evaluate(async (v) => {
        const vh = parseFloat(getComputedStyle(document.documentElement).getPropertyValue("--vh"));
        scrollTo(0, v * vh);
        const frames = (n) =>
          new Promise((r) => {
            const f = () => (n-- ? requestAnimationFrame(f) : r());
            f();
          });
        await frames(3);
        await new Promise((r) => setTimeout(r, 1000)); // CSS state transitions (900 ms)
        await frames(2);
        const frame = document.querySelector("[data-ch2-frame]");
        const copy = parseFloat(getComputedStyle(frame).getPropertyValue("--ch2-copy") || "0");
        const out = [...document.querySelectorAll("[data-ch2-line]")].map((l, idx) => {
          const r = l.getBoundingClientRect();
          const op = parseFloat(getComputedStyle(l).opacity);
          return {
            idx,
            state: l.dataset.state,
            opacity: op * copy,
            copy,
            rect: [r.left, r.top, r.width, r.height],
          };
        });
        document
          .querySelectorAll("[data-ch2-line]")
          .forEach((l) => (l.style.color = "transparent"));
        await frames(2);
        return out;
      }, v);
      const png = await page.screenshot();
      await page.evaluate(() =>
        document.querySelectorAll("[data-ch2-line]").forEach((l) => (l.style.color = "")),
      );
      const { data, info } = await sharp(png).raw().toBuffer({ resolveWithObject: true });
      for (const l of lines) {
        if (l.opacity < 0.01 || l.state === "hidden") continue;
        const [x, y, w, h] = l.rect.map(Math.round);
        const x0 = Math.max(0, x),
          y0 = Math.max(0, y),
          x1 = Math.min(info.width, x + w),
          y1 = Math.min(info.height, y + h);
        if (x1 <= x0 || y1 <= y0) continue;
        const px = [];
        for (let yy = y0; yy < y1; yy++)
          for (let xx = x0; xx < x1; xx++) {
            const k = (yy * info.width + xx) * info.channels;
            px.push([data[k], data[k + 1], data[k + 2]]);
          }
        px.sort((a, b) => lum(...a) - lum(...b));
        const bg = px[Math.floor(px.length * 0.95)];
        const a = l.opacity;
        const txt = [0xf2, 0xec, 0xe2].map((c, j) => a * c + (1 - a) * bg[j]);
        const steady =
          (l.state === "active" && Math.abs(l.opacity - 1) < 0.01) ||
          (l.state === "past" && l.copy > 0.99);
        results.push({
          viewport: vp.name,
          phase,
          vh: +v.toFixed(1),
          line: l.idx + 1,
          state: l.state,
          opacity: +a.toFixed(3),
          steady,
          bgP95: bg,
          ratio: +ratio(lum(...txt), lum(...bg)).toFixed(2),
        });
      }
    }
    await page.close();
    await mkdir("docs/perf", { recursive: true });
    await writeFile(`${OUTFILE}.partial`, JSON.stringify(results) + "\n"); // progress is never lost
    console.log(`${vp.name} phase ${phase}: done`);
  }
}
await browser.close();
const judged = results.filter((r) => r.steady);
const fails = judged.filter((r) => r.ratio < TARGET);
const summary = {
  criterion: `each shown line ≥ ${TARGET}:1 vs the 95th-percentile-luminance pixel behind it`,
  samples: { positions: POSITIONS, phases: PHASES, viewports: VIEWPORTS.map((v) => v.name) },
  judged: judged.length,
  inTransition: results.length - judged.length,
  minRatio: judged.length ? Math.min(...judged.map((r) => r.ratio)) : null,
  minRatioByViewport: Object.fromEntries(
    VIEWPORTS.map((v) => [
      v.name,
      Math.min(...judged.filter((r) => r.viewport === v.name).map((r) => r.ratio)),
    ]),
  ),
  failures: fails,
  pass: fails.length === 0 && judged.length > 0,
};
await mkdir("docs/perf", { recursive: true });
await writeFile(
  OUTFILE,
  JSON.stringify({ summary, results }, null, 2) + "\n",
);
console.log(JSON.stringify(summary, null, 2));
