import { chromium } from "@playwright/test";
const b = await chromium.launch({ args: ["--use-angle=swiftshader", "--enable-unsafe-swiftshader", "--ignore-gpu-blocklist"] });
const p = await b.newPage({ viewport: { width: 1440, height: 900 } });
p.on("console", (m) => console.log("console:", m.type(), m.text().slice(0, 200)));
await p.goto("http://127.0.0.1:4173/?tier=A&nodowngrade=1&windt=3&nodamp=1");
await p.waitForFunction(() => window.__slay?.live === true, null, { timeout: 120000 });
await p.evaluate(() => scrollTo(0, 770 * parseFloat(getComputedStyle(document.documentElement).getPropertyValue("--vh"))));
await p.waitForTimeout(4000);
console.log(JSON.stringify(await p.evaluate(() => [...document.querySelectorAll("video")].map((v) => {
  const f = v.closest(".chapter-frame"); const r = v.getBoundingClientRect();
  return { src: v.currentSrc.split("/").pop(), paused: v.paused, preload: v.preload, ready: v.readyState, net: v.networkState, err: v.error?.code, frame: f?.dataset.visible, step: v.closest("[data-product]")?.dataset.active, rect: [Math.round(r.top), Math.round(r.height)], toggle: document.querySelector("[data-motion-toggle]")?.getAttribute("aria-pressed") };
})), null, 0));
await b.close();
