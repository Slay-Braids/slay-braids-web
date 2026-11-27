import { chromium } from "@playwright/test";
const browser = await chromium.launch({
  args: ["--use-angle=swiftshader", "--enable-unsafe-swiftshader"],
});
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
await page.addInitScript(() => {
  window.__ls = [];
  new PerformanceObserver((l) => {
    for (const e of l.getEntries())
      window.__ls.push({
        t: Math.round(e.startTime),
        v: e.value,
        src: e.sources.map((s) => ({
          n: s.node?.className ?? s.node?.nodeName,
          p: [s.previousRect.y, s.previousRect.height],
          c: [s.currentRect.y, s.currentRect.height],
        })),
      });
  }).observe({ type: "layout-shift", buffered: true });
});
await page.goto(`http://127.0.0.1:4173/${process.argv[2] ?? ""}`);
await page.waitForTimeout(5000);
console.log(
  JSON.stringify(
    await page.evaluate(() => [
      window.__ls,
      document.fonts.status,
      getComputedStyle(document.documentElement).getPropertyValue("--vh"),
      innerHeight,
    ]),
    null,
    1,
  ),
);
await browser.close();
