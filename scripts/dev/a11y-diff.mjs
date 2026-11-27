import { chromium } from "@playwright/test";
const b = await chromium.launch({ args: ["--use-angle=swiftshader","--enable-unsafe-swiftshader","--ignore-gpu-blocklist"] });
const p = await b.newPage({ viewport: { width: 1440, height: 900 } });
await p.goto("http://127.0.0.1:4173/?reduced=1"); await p.waitForTimeout(1500);
const r = await p.locator("main").ariaSnapshot();
await p.goto("http://127.0.0.1:4173/?tier=A&nodowngrade=1&windt=3");
await p.waitForFunction(() => window.__slay?.live === true, null, { timeout: 180000 });
await p.waitForTimeout(1000);
const l = await p.locator("main").ariaSnapshot();
const a = r.split("\n"), c = l.split("\n");
for (let i = 0; i < Math.max(a.length, c.length); i++) if (a[i] !== c[i]) { console.log(i, "R:", a[i], "\n   L:", c[i]); }
await b.close();
