// Like frames.mjs, with the film grain frozen and transitions settled, for exact before/after diffs.
import { chromium } from "@playwright/test";
const [, , outDir, mode = "desktop", list = "0", base = "http://127.0.0.1:4173/"] = process.argv;
const vp = mode === "desktop" ? { width: 1440, height: 900, deviceScaleFactor: 1 } : { width: 412, height: 915, deviceScaleFactor: 1, isMobile: true, hasTouch: true };
const browser = await chromium.launch({ args: ["--use-angle=swiftshader", "--enable-unsafe-swiftshader", "--ignore-gpu-blocklist"] });
const page = await browser.newPage({ viewport: { width: vp.width, height: vp.height }, deviceScaleFactor: 1, isMobile: vp.isMobile, hasTouch: vp.hasTouch });
await page.goto(`${base}?tier=A&nodowngrade=1&windt=3&nodamp=1`);
await page.waitForFunction(() => window.__slay?.live === true, null, { timeout: 180000 });
await page.addStyleTag({ content: ".grain{animation:none!important}.scroll-cue i{animation:none!important}" });
for (const v of list.split(",").map(Number)) {
  await page.evaluate((v) => scrollTo(0, v * parseFloat(getComputedStyle(document.documentElement).getPropertyValue("--vh"))), v);
  await page.waitForTimeout(2500);
  await page.screenshot({ path: `${outDir}/${mode}-${String(v).padStart(3, "0")}.png`, animations: "disabled" });
}
await browser.close();
