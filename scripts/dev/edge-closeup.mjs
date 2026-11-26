// Dev aid: DPR-2 close-ups of the Chapter 3 page edge with each treatment on/off.
import { chromium } from "@playwright/test";
const [, , outDir, mode = "desktop", vh = "400"] = process.argv;
const vp = mode === "desktop" ? { width: 1440, height: 900 } : { width: 412, height: 915 };
const browser = await chromium.launch({ args: ["--use-angle=swiftshader", "--enable-unsafe-swiftshader", "--ignore-gpu-blocklist"] });
const page = await browser.newPage({ viewport: vp, deviceScaleFactor: 2, isMobile: mode !== "desktop", hasTouch: mode !== "desktop" });
await page.goto(`http://127.0.0.1:4173/?tier=A&nodowngrade=1&windt=3&nodamp=1&vh=${vh}`);
await page.waitForFunction(() => window.__slay?.live === true, null, { timeout: 120000 });
const sets = { all: {}, none: { highlight: false, paperShadow: false, contactShadow: false, spill: false } };
for (const [name, t] of Object.entries(sets)) {
  await page.evaluate((t) => Object.assign(window.__chapters.toggles, { highlight: true, paperShadow: true, contactShadow: true, spill: true }, t), t);
  await page.waitForTimeout(1500);
  await page.screenshot({ path: `${outDir}/${mode}-edge-${name}.png` });
}
await browser.close();
