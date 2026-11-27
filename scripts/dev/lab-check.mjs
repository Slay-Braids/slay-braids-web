import { chromium } from "@playwright/test";
const browser = await chromium.launch({ args: ["--use-angle=swiftshader", "--enable-unsafe-swiftshader", "--ignore-gpu-blocklist"] });
for (const h of ["#lab-transition-nodowngrade", "#lab-transition"]) {
  const page = await browser.newPage({ viewport: { width: 384, height: 760 }, deviceScaleFactor: 2.8125, isMobile: true, hasTouch: true });
  const errs = []; page.on("pageerror", (e) => errs.push(e.message)); page.on("console", (m) => m.type() === "error" && errs.push(m.text()));
  await page.goto(`http://127.0.0.1:4176/${h}`);
  const ok = await page.waitForFunction(() => !!window.__lab, null, { timeout: 120000 }).then(() => true, () => false);
  console.log(h, "lab:", ok, "tier", await page.evaluate(() => window.__slay?.tier), JSON.stringify(errs));
  await page.close();
}
await browser.close();
