import { chromium } from "@playwright/test";
const browser = await chromium.launch({ args: ["--use-angle=swiftshader", "--enable-unsafe-swiftshader", "--ignore-gpu-blocklist"] });
const page = await browser.newPage({ viewport: { width: 412, height: 915 }, deviceScaleFactor: 2.625, isMobile: true, hasTouch: true });
await page.addInitScript(() => {
  window.__ls = [];
  new PerformanceObserver((l) => { for (const e of l.getEntries()) window.__ls.push({ t: Math.round(e.startTime), v: +e.value.toFixed(4), y: Math.round(scrollY), src: e.sources.map((s) => `${s.node?.className ?? s.node?.nodeName} ${Math.round(s.previousRect.y)}→${Math.round(s.currentRect.y)} h${Math.round(s.previousRect.height)}→${Math.round(s.currentRect.height)}`) }); }).observe({ type: "layout-shift", buffered: true });
});
await page.goto("http://127.0.0.1:4173/?tier=A&nodowngrade=1&perf=1");
await page.waitForFunction(() => window.__slay?.live === true, null, { timeout: 180000 });
await page.waitForTimeout(2000);
const vh = await page.evaluate(() => parseFloat(getComputedStyle(document.documentElement).getPropertyValue("--vh")));
for (let v = 0; v <= 520; v += 8) { await page.evaluate((y) => scrollTo(0, y), v * vh); await page.waitForTimeout(80); }
console.log(JSON.stringify(await page.evaluate(() => window.__ls), null, 1));
await browser.close();
