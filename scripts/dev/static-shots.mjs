import { chromium } from "@playwright/test";
const [, , out, mode = "desktop", flags = "reduced=1"] = process.argv;
const vp = mode === "desktop" ? { width: 1440, height: 900 } : { width: 412, height: 915 };
const browser = await chromium.launch();
const page = await browser.newPage({
  viewport: vp,
  deviceScaleFactor: 1,
  isMobile: mode !== "desktop",
});
await page.goto(`http://127.0.0.1:4173/?${flags}`);
await page.waitForTimeout(1500);
const vh = vp.height;
for (const [i, y] of [0, 1, 2, 3, 4].entries()) {
  await page.evaluate((y) => window.scrollTo(0, y), y * vh);
  await page.waitForTimeout(900);
  await page.screenshot({ path: `${out}/static-${mode}-${i}.png` });
}
await browser.close();
