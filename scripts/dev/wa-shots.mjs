// Dev aid: the WhatsApp button and enquiries, phone and desktop, both themes.
import { chromium } from "@playwright/test";
const [, , base = "http://127.0.0.1:4173", out = "."] = process.argv;
const b = await chromium.launch({ args: ["--use-angle=swiftshader", "--enable-unsafe-swiftshader", "--ignore-gpu-blocklist"] });
for (const theme of ["light", "dark"])
  for (const [name, opts] of [
    ["mobile", { viewport: { width: 412, height: 915 }, isMobile: true, hasTouch: true }],
    ["desktop", { viewport: { width: 1440, height: 900 } }],
  ]) {
    const p = await b.newPage({ ...opts, colorScheme: theme });
    await p.goto(base + "/?tier=A&nodowngrade=1");
    await p.waitForFunction(() => window.__slay?.live === true, null, { timeout: 120000 });
    await p.waitForTimeout(1500);
    await p.screenshot({ path: `${out}/wa-${theme}-${name}-hero.png` });
    await p.evaluate(() => scrollTo(0, 700 * parseFloat(getComputedStyle(document.documentElement).getPropertyValue("--vh"))));
    await p.waitForTimeout(2500);
    await p.screenshot({ path: `${out}/wa-${theme}-${name}-futura.png` });
    await p.locator("#enquire").scrollIntoViewIfNeeded();
    await p.waitForTimeout(1200);
    await p.screenshot({ path: `${out}/wa-${theme}-${name}-enquire.png` });
    await p.close();
  }
await b.close();
