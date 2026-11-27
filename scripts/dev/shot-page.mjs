import { chromium } from "@playwright/test";
const [, , file, out, w = "1280"] = process.argv;
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: +w, height: 900 } });
await page.goto("file://" + file);
await page.waitForTimeout(1500);
await page.screenshot({ path: out, fullPage: true });
await browser.close();
