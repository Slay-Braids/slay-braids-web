// Dev aid: render candidate camera keys (JSON file) at a fixed scroll and wind time.
// node scripts/dev/camera-probe.mjs keys.json outDir desktop|mobile
import { chromium } from "@playwright/test";
import { readFileSync } from "node:fs";
const [, , keysFile, outDir, mode = "desktop", vhArg = ""] = process.argv;
const paperVh = vhArg ? Number(vhArg) : undefined;
const keys = JSON.parse(readFileSync(keysFile, "utf8"));
const vp = mode === "desktop" ? { width: 1440, height: 900 } : { width: 412, height: 915 };
const browser = await chromium.launch({ args: ["--use-angle=swiftshader", "--enable-unsafe-swiftshader", "--ignore-gpu-blocklist"] });
const page = await browser.newPage({ viewport: vp, deviceScaleFactor: 1, isMobile: mode !== "desktop", hasTouch: mode !== "desktop" });
await page.goto(`http://127.0.0.1:4173/?tier=A&nodowngrade=1&windt=3&nodamp=1`);
await page.waitForFunction(() => window.__slay?.live === true, null, { timeout: 120000 });
await page.addStyleTag({
  content: paperVh == null
    ? "main, header, footer, .grain, .chapter-index, [data-testid=banner], .paper-layer, .chapter-frame { visibility: hidden !important; }"
    : ".ch1, .end-card, .enquire-section, footer, [data-testid=banner], .chapter-index { visibility: hidden !important; }",
});
if (paperVh != null) await page.evaluate((v) => (window.__probeVh = v), paperVh);
for (const [i, k] of keys.entries()) {
  await page.evaluate((k) => {
    const c = window.__chapters;
    c.scene.setCameraTimeline(() => k);
    c.reselect();
    c.scene.setScrollVh(window.__probeVh ?? 0, true);
  }, k);
  await page.waitForTimeout(900);
  await page.screenshot({ path: `${outDir}/${mode}-k${String(i).padStart(2, "0")}.png` });
}
await browser.close();
