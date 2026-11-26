import { chromium } from "@playwright/test";
const out = process.argv[2];
const browser = await chromium.launch({ args: ["--use-angle=swiftshader", "--enable-unsafe-swiftshader", "--ignore-gpu-blocklist"] });
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
await page.goto("http://127.0.0.1:4174/?tier=A&nodowngrade=1&windt=3&nodamp=1");
await page.waitForFunction(() => window.__slay?.live === true, null, { timeout: 180000 });
for (const v of [470, 480]) {
  await page.evaluate((v) => scrollTo(0, v * parseFloat(getComputedStyle(document.documentElement).getPropertyValue("--vh"))), v);
  for (const wait of [1500, 6000]) {
    await page.waitForTimeout(wait);
    const info = await page.evaluate(() => { const s = document.querySelector("[data-paper]"); return { vis: getComputedStyle(s).visibility, clip: s.querySelector("clipPath path").getAttribute("d").slice(0, 160) }; });
    console.log(v, wait, JSON.stringify(info));
    await page.screenshot({ path: `${out}/away-${v}-${wait}.png` });
  }
}
await browser.close();
