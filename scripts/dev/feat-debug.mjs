import { chromium } from "@playwright/test";
const b = await chromium.launch({ args: ["--use-angle=swiftshader", "--enable-unsafe-swiftshader", "--ignore-gpu-blocklist"] });
const p = await b.newPage({ viewport: { width: 1440, height: 900 } });
await p.goto("http://127.0.0.1:4173/?tier=A&nodowngrade=1&windt=3&nodamp=1");
await p.waitForFunction(() => window.__slay?.live === true, null, { timeout: 120000 });
await p.evaluate(() => scrollTo(0, 765 * parseFloat(getComputedStyle(document.documentElement).getPropertyValue("--vh"))));
await p.waitForTimeout(3000);
console.log(await p.evaluate(() => { const f = document.querySelector("[data-ch4-frame]"); const li = [...document.querySelectorAll(".ch4-features li")]; return { feat: f.style.getPropertyValue("--ch4-feat"), vis: f.dataset.visible, on: li.map((l) => getComputedStyle(l).getPropertyValue("--on") + " | " + getComputedStyle(l).opacity) }; }));
await b.close();
