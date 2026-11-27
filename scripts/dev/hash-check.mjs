import { chromium } from "@playwright/test";
const browser = await chromium.launch({ args: ["--use-angle=swiftshader", "--enable-unsafe-swiftshader", "--ignore-gpu-blocklist"] });
const hashes = ["#perf", "#perf-tier-b", "#lab-transition-nodowngrade", "#vh-362-windt-3-nodamp", "#reduced-perf", "#perf-still-matched"];
for (const h of hashes) {
  const page = await browser.newPage({ viewport: { width: 384, height: 760 }, deviceScaleFactor: 2.8125, isMobile: true, hasTouch: true });
  await page.goto(`http://127.0.0.1:4176/${h}`);
  await page.waitForFunction(() => window.__slay && (window.__slay.live || window.__slay.tier === "C"), null, { timeout: 180000 });
  await page.waitForTimeout(1500);
  const r = await page.evaluate(() => ({
    tier: window.__slay.tier, reason: window.__slay.tierReason, live: window.__slay.live,
    hud: !!document.querySelector('aside[aria-label="Performance readout"]'), lab: !!window.__lab,
    vh: Math.round(scrollY / parseFloat(getComputedStyle(document.documentElement).getPropertyValue("--vh"))),
    reduced: document.documentElement.dataset.reducedMotion, stillMatched: window.__slay.marks.stillMatched ?? null,
  }));
  console.log(h, JSON.stringify(r));
  if (h.startsWith("#vh")) await page.screenshot({ path: "/tmp/claude-0/-home-user-slay-braids-web/ba6fe974-fa0d-57c1-a0fc-f9829c71473b/scratchpad/vh362.png" });
  await page.close();
}
await browser.close();
