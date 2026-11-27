// Smoke check of the deployed preview (not committed): headers, 404, console, failed requests, screenshots.
import { chromium } from "@playwright/test";
const [, , base, state, outDir] = process.argv;
const b = await chromium.launch({ args: ["--use-angle=swiftshader", "--enable-unsafe-swiftshader", "--ignore-gpu-blocklist"] });
for (const [name, opts, stops] of [
  ["desktop", { viewport: { width: 1440, height: 900 } }, [0, 400, 685, 820, 1065, 1245, 1345]],
  ["mobile", { viewport: { width: 412, height: 915 }, isMobile: true, hasTouch: true }, [0, 380, 605, 800, 1045, 1205, 1300]],
]) {
  const ctx = await b.newContext({ ...opts, storageState: state });
  const p = await ctx.newPage();
  const errors = [], failed = [];
  p.on("console", (m) => m.type() === "error" && errors.push(m.text().slice(0, 160)));
  p.on("pageerror", (e) => errors.push("pageerror " + e.message.slice(0, 160)));
  p.on("requestfailed", (r) => failed.push(r.url().slice(0, 120)));
  p.on("response", (r) => r.status() >= 400 && failed.push(`${r.status()} ${r.url().slice(0, 120)}`));
  const r = await p.goto(base + "/?nodowngrade=1", { waitUntil: "load" });
  if (name === "desktop") {
    const h = r.headers();
    console.log("headers", JSON.stringify({ robots: h["x-robots-tag"], nosniff: h["x-content-type-options"], referrer: h["referrer-policy"], frame: h["x-frame-options"], enc: h["content-encoding"] }));
  }
  await p.waitForFunction(() => window.__slay?.live === true, null, { timeout: 120000 });
  const st = await p.evaluate(() => ({ tier: window.__slay.tier, reason: window.__slay.tierReason, marks: window.__slay.marks }));
  console.log(name, "tier", st.tier, "|", st.reason, "| handoffDone", st.marks.handoffDone, "ms");
  for (const v of stops) {
    await p.evaluate((v) => scrollTo(0, v * parseFloat(getComputedStyle(document.documentElement).getPropertyValue("--vh"))), v);
    await p.waitForTimeout(2500);
    await p.screenshot({ path: `${outDir}/${name}-${String(v).padStart(4, "0")}.png` });
  }
  const assets = await p.evaluate(() => [...document.images].map((i) => [i.currentSrc.split("/").pop(), i.complete && i.naturalWidth > 0]));
  console.log(name, "images", JSON.stringify(assets));
  console.log(name, "console errors", errors.length, JSON.stringify(errors.slice(0, 5)));
  console.log(name, "failed requests", failed.length, JSON.stringify(failed.slice(0, 5)));
  await ctx.close();
}
const ctx = await b.newContext({ storageState: state });
const p = await ctx.newPage();
const r = await p.goto(base + "/no-such-page");
console.log("404 status", r.status(), "|", await p.locator("h1").textContent());
await b.close();
