// Dev aid: phone FUTURA features in two pages, on a small screen (emulates large text: 412 px / 1.25).
import { chromium } from "@playwright/test";
const [, , base = "http://127.0.0.1:4173", out = "."] = process.argv;
const b = await chromium.launch({ args: ["--use-angle=swiftshader", "--enable-unsafe-swiftshader", "--ignore-gpu-blocklist"] });
const p = await b.newPage({ viewport: { width: 330, height: 690 }, isMobile: true, hasTouch: true, colorScheme: "dark" });
await p.goto(base + "/?tier=A&nodowngrade=1&nodamp=1");
await p.waitForFunction(() => window.__slay?.live === true, null, { timeout: 120000 });
for (const v of [610, 640, 665, 685]) {
  await p.evaluate((v) => scrollTo(0, v * parseFloat(getComputedStyle(document.documentElement).getPropertyValue("--vh"))), v);
  await p.waitForTimeout(2200);
  const top = await p.evaluate(() => {
    const vis = [...document.querySelectorAll(".ch4-features li, .ch4-feat-title, .ch4-line, .ch4-title")].filter((e) => parseFloat(getComputedStyle(e).opacity) > 0.05);
    return { top: Math.min(...vis.map((e) => e.getBoundingClientRect().top)), n: vis.length };
  });
  console.log(v, JSON.stringify(top));
  await p.screenshot({ path: `${out}/feat-${v}.png` });
}
await b.close();
