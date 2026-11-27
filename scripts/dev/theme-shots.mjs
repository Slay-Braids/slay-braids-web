// Dev aid (v4): live-page screenshots at each chapter's resting position, both themes, phone and desktop.
//   node scripts/dev/theme-shots.mjs http://127.0.0.1:4173 <outdir> [light|dark]
import { chromium } from "@playwright/test";
const [, , base = "http://127.0.0.1:4173", out = ".", only] = process.argv;
const b = await chromium.launch({ args: ["--use-angle=swiftshader", "--enable-unsafe-swiftshader", "--ignore-gpu-blocklist"] });
const STOPS = {
  mobile: [0, 130, 360, 450, 620, 685, 800, 880, 1205, 1365],
  desktop: [0, 150, 400, 500, 700, 765, 850, 1195, 1375],
};
for (const theme of only ? [only] : ["light", "dark"])
  for (const [name, opts] of [
    ["mobile", { viewport: { width: 412, height: 915 }, isMobile: true, hasTouch: true, deviceScaleFactor: 1 }],
    ["desktop", { viewport: { width: 1440, height: 900 } }],
  ]) {
    const ctx = await b.newContext({ ...opts, colorScheme: theme });
    const p = await ctx.newPage();
    const errs = [];
    p.on("pageerror", (e) => errs.push(e.message));
    p.on("console", (m) => m.type() === "error" && errs.push(m.text()));
    await p.goto(base + "/?tier=A&nodowngrade=1");
    await p.waitForFunction(() => window.__slay?.live === true, null, { timeout: 120000 });
    for (const v of STOPS[name]) {
      await p.evaluate((v) => scrollTo(0, v * parseFloat(getComputedStyle(document.documentElement).getPropertyValue("--vh"))), v);
      await p.waitForTimeout(2600);
      await p.screenshot({ path: `${out}/${theme}-${name}-${String(v).padStart(4, "0")}.png` });
    }
    for (const sel of [".find-look", ".studio", "#enquire"]) {
      await p.locator(sel).scrollIntoViewIfNeeded();
      await p.waitForTimeout(800);
      await p.screenshot({ path: `${out}/${theme}-${name}-z${sel.replace(/\W/g, "")}.png` });
    }
    console.log(theme, name, "errors", errs.length, errs.slice(0, 3).join(" | "));
    await ctx.close();
  }
await b.close();
