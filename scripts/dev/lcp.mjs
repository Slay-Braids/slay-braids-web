import { chromium, devices } from "@playwright/test";
const browser = await chromium.launch();
const ctx = await browser.newContext({
  ...(devices["Moto G4"] ?? {}),
  viewport: { width: 412, height: 823 },
  isMobile: true,
  deviceScaleFactor: 1.75,
});
const page = await ctx.newPage();
await page.addInitScript(() => {
  window.__lcp = [];
  new PerformanceObserver((l) => {
    for (const e of l.getEntries())
      window.__lcp.push({
        t: Math.round(e.startTime),
        size: e.size,
        el: e.element ? e.element.outerHTML.slice(0, 140) : null,
        url: e.url,
      });
  }).observe({ type: "largest-contentful-paint", buffered: true });
});
await page.goto(`http://127.0.0.1:4173/${process.argv[2] ?? "?tier=C"}`);
await page.waitForTimeout(4000);
console.log(JSON.stringify(await page.evaluate(() => window.__lcp), null, 1));
await browser.close();
