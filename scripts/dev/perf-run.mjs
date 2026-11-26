// Simulated perf run: load with #perf, scroll Chapters 1–3 smoothly, dump the HUD summary.
import { chromium } from "@playwright/test";
const [, , mode = "desktop", extra = ""] = process.argv;
const mobile = mode !== "desktop";
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
await page.goto(`http://127.0.0.1:4173/?tier=A&nodowngrade=1&perf=1${extra}`);
await page.waitForFunction(() => window.__slay?.live === true, null, { timeout: 120000 });
await page.waitForTimeout(3000);
const vh = await page.evaluate(() => innerHeight);
for (let v = 0; v <= 520; v += 4) {
  await page.evaluate((y) => scrollTo(0, y), (v / 100) * vh);
  await page.waitForTimeout(120);
}
const s = await page.evaluate(
  async () => (await import("/_next/static/chunks/perfHud.js").catch(() => null), window.__slay),
);
const sum = await page.evaluate(
  () => document.querySelector('aside[aria-label="Performance readout"]')?.textContent,
);
const chapters = await page.evaluate(() => {
  const c = window.__chapters.stats;
  const q = (a) => {
    const s = [...a].sort((x, y) => x - y);
    return s.length
      ? { n: s.length, p50: s[s.length >> 1], p95: s[Math.floor(s.length * 0.95)] }
      : null;
  };
  return {
    ch1: q(c.ch1),
    ch2: q(c.ch2),
    ch3: q(c.ch3),
    transition: q(c.transition),
    edgeMs: q(c.edgeMs),
  };
});
console.log(
  JSON.stringify(
    { mode, handoff: s.marks.handoff, stillMatched: s.marks.stillMatched, chapters, hud: sum },
    null,
    2,
  ),
);
await browser.close();
