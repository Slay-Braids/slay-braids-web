// Dev aid (v4): computed style of the Chapter 7 secondary button on a phone.
import { chromium } from "@playwright/test";
const b = await chromium.launch({ args: ["--use-angle=swiftshader", "--enable-unsafe-swiftshader", "--ignore-gpu-blocklist"] });
const p = await b.newPage({ viewport: { width: 412, height: 915 }, isMobile: true, hasTouch: true, colorScheme: process.argv[3] ?? "light" });
await p.goto((process.argv[2] ?? "http://127.0.0.1:4173") + "/?tier=A&nodowngrade=1&nodamp=1");
await p.waitForFunction(() => window.__slay?.live === true, null, { timeout: 120000 });
await p.evaluate(() => scrollTo(0, 1365 * parseFloat(getComputedStyle(document.documentElement).getPropertyValue("--vh"))));
await p.waitForTimeout(3000);
console.log(await p.evaluate(() => {
  const e = [...document.querySelectorAll(".ch7-frame .btn-secondary")][0];
  const cs = getComputedStyle(e);
  const r = e.getBoundingClientRect();
  return { text: e.textContent, bg: cs.backgroundColor, color: cs.color, filter: cs.backdropFilter, rect: [r.x, r.y, r.width, r.height], opacity: cs.opacity };
}));
await p.screenshot({ path: process.argv[4] ?? "ch7.png" });
await b.close();
