// Runs the transition lab's GPU accuracy test headlessly and prints the results JSON.
// node scripts/lab-accuracy.mjs desktop|mobile [durationMs] [probeEvery] [baseUrl]
import { chromium } from "@playwright/test";
const [, , mode = "desktop", dur = "30000", every = "10", base = "http://127.0.0.1:4173/"] =
  process.argv;
const vp = mode === "desktop" ? { width: 1440, height: 900 } : { width: 412, height: 915 };
const browser = await chromium.launch({
  args: ["--use-angle=swiftshader", "--enable-unsafe-swiftshader", "--ignore-gpu-blocklist"],
});
const page = await browser.newPage({
  viewport: vp,
  deviceScaleFactor: mode === "desktop" ? 1 : 2.625,
  isMobile: mode !== "desktop",
  hasTouch: mode !== "desktop",
});
page.on("pageerror", (e) => console.error("pageerror", e.message));
await page.goto(`${base}?tier=A&nodowngrade=1&lab=transition`);
await page.waitForFunction(() => window.__slay?.live === true && !!window.__lab, null, {
  timeout: 120000,
});
const res = await page.evaluate(([d, e]) => window.__lab.run(d, e), [Number(dur), Number(every)]);
console.log(JSON.stringify({ mode, ...res }, null, 2));
await browser.close();
