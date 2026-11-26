/**
 * SIMULATED performance run (headless Chromium, WebGL on the CPU via SwiftShader).
 * These numbers describe this container, NOT any real GPU or phone. Real devices: see
 * docs/real-device-test-protocol.md.
 *
 * Loads the live page with #perf, waits 3 s, scrolls Chapters 1–3 to the end card and back, and
 * records: frame time P50/P95/P99 and median fps (all frames, per chapter, Chapter 3 transition
 * only), edge-compute time, long tasks, LCP, CLS and the on-device handoff Δ.
 *   node scripts/perf-sim.mjs desktop|mobile [baseUrl] [extraFlags]  → docs/perf/perf-sim-<mode>.json
 */
import { chromium } from "@playwright/test";
import { writeFile } from "node:fs/promises";

const [, , mode = "desktop", base = "http://127.0.0.1:4173/", extra = ""] = process.argv;
const mobile = mode === "mobile";
const browser = await chromium.launch({
  args: ["--use-angle=swiftshader", "--enable-unsafe-swiftshader", "--ignore-gpu-blocklist"],
});
const page = await browser.newPage(
  mobile
    ? {
        viewport: { width: 412, height: 915 },
        deviceScaleFactor: 2.625,
        isMobile: true,
        hasTouch: true,
      }
    : { viewport: { width: 1440, height: 900 }, deviceScaleFactor: 1 },
);
await page.addInitScript(() => {
  const o = (window.__obs = { longTasks: [], cls: 0, lcp: 0 });
  new PerformanceObserver((l) =>
    l.getEntries().forEach((e) => o.longTasks.push(Math.round(e.duration))),
  ).observe({ type: "longtask", buffered: true });
  new PerformanceObserver((l) =>
    l.getEntries().forEach((e) => {
      if (!e.hadRecentInput) o.cls += e.value;
    }),
  ).observe({ type: "layout-shift", buffered: true });
  new PerformanceObserver((l) =>
    l.getEntries().forEach((e) => (o.lcp = Math.round(e.startTime))),
  ).observe({ type: "largest-contentful-paint", buffered: true });
});
await page.goto(`${base}?tier=A&nodowngrade=1&perf=1${extra}`);
await page.waitForFunction(() => window.__slay?.live === true, null, { timeout: 180000 });
await page.waitForTimeout(3000);
const vh = await page.evaluate(() =>
  parseFloat(getComputedStyle(document.documentElement).getPropertyValue("--vh")),
);
const end = mobile ? 520 : 580;
for (let v = 0; v <= end; v += 4) {
  await page.evaluate((y) => scrollTo(0, y), v * vh);
  await page.waitForTimeout(100);
}
for (let v = end; v >= 0; v -= 8) {
  await page.evaluate((y) => scrollTo(0, y), v * vh);
  await page.waitForTimeout(100);
}
const r = await page.evaluate(() => {
  const q = (a) => {
    const s = [...a].sort((x, y) => x - y);
    if (!s.length) return null;
    const p = (k) => +s[Math.min(s.length - 1, Math.floor(k * s.length))].toFixed(1);
    return {
      n: s.length,
      p50: p(0.5),
      p95: p(0.95),
      p99: p(0.99),
      fpsMedian: Math.round(1000 / p(0.5)),
    };
  };
  const c = window.__chapters.stats;
  const st = window.__slay;
  return {
    allFrames: q(st.frameTimes),
    ch1: q(c.ch1),
    ch2: q(c.ch2),
    ch3: q(c.ch3),
    ch3Transition: q(c.transition),
    edgeComputeMs: q(c.edgeMs),
    longTasks: {
      count: window.__obs.longTasks.length,
      totalMs: window.__obs.longTasks.reduce((a, b) => a + b, 0),
      max: Math.max(0, ...window.__obs.longTasks),
    },
    lcpMs: window.__obs.lcp,
    cls: +window.__obs.cls.toFixed(4),
    handoff: st.marks.handoff ? JSON.parse(st.marks.handoff) : null,
    stillMatched: st.marks.stillMatched ?? null,
    scene: st.stats,
    tier: st.tier,
    downgrades: st.downgrades,
  };
});
const out = {
  kind: "SIMULATED — headless Chromium + SwiftShader (CPU). Not a real-GPU or real-device result.",
  note: "The scene clamps a frame's dt at 100 ms, so frame times here saturate at 100 ms and say nothing about real devices.",
  mode,
  viewport: mobile ? "412×915 @2.625x" : "1440×900 @1x",
  date: new Date().toISOString(),
  flags: extra || null,
  ...r,
};
const file = `docs/perf/perf-sim-${mode}${extra ? "-" + extra.replace(/[^a-z]/gi, "") : ""}.json`;
await writeFile(file, JSON.stringify(out, null, 2) + "\n");
console.log(
  file,
  JSON.stringify({
    all: r.allFrames,
    transition: r.ch3Transition,
    edge: r.edgeComputeMs,
    lt: r.longTasks,
    cls: r.cls,
    lcp: r.lcpMs,
    handoff: r.handoff,
  }),
);
await browser.close();
