/**
 * Automated evidence at an A26-like viewport (384×832 CSS px, DPR 2.8125, touch), headless
 * Chromium + SwiftShader. Measurement only. NOT a substitute for the device.
 *   1. Page-edge accuracy at tier B (the A26's default tier), spec (every 10th frame) and dense
 *   2. Horizontal overflow at 40 scroll positions, live and reduced
 *   3. Rotation round-trip portrait → landscape → portrait, at Chapter 1 and at the Chapter 3 rest
 * → docs/perf/a26-emulated-evidence.json
 */
import { chromium } from "@playwright/test";
import { writeFile } from "node:fs/promises";

const BASE = process.env.BASE ?? "http://127.0.0.1:4173/";
const VP = {
  viewport: { width: 384, height: 832 },
  deviceScaleFactor: 2.8125,
  isMobile: true,
  hasTouch: true,
};
const browser = await chromium.launch({
  args: ["--use-angle=swiftshader", "--enable-unsafe-swiftshader", "--ignore-gpu-blocklist"],
});
const out = {
  kind: "AUTOMATED, EMULATED — headless Chromium + SwiftShader at an A26-like viewport. Not measured on the A26.",
  viewport: "384×832 @2.8125x, touch",
  date: new Date().toISOString(),
};

// 1. Accuracy at tier B
out.accuracyTierB = {};
for (const every of [10, 1]) {
  const page = await browser.newPage(VP);
  await page.goto(`${BASE}?tier=B&nodowngrade=1&lab=transition`);
  await page.waitForFunction(() => window.__slay?.live === true && !!window.__lab, null, {
    timeout: 180000,
  });
  const r = await page.evaluate((e) => window.__lab.run(30000, e), every);
  out.accuracyTierB[`every${every}`] = {
    tier: await page.evaluate(() => window.__slay.tier),
    guidePoints: r.guidePoints,
    probedFrames: r.probedFrames,
    conditions: r.conditions,
    pointError: r.pointError,
    edgeError: r.edgeError,
    pass: r.pass,
  };
  await page.close();
}

// 2. Horizontal overflow
const overflow = async (url, live) => {
  const page = await browser.newPage(VP);
  await page.goto(`${BASE}${url}`);
  if (live)
    await page.waitForFunction(() => window.__slay?.live === true, null, { timeout: 180000 });
  else await page.waitForTimeout(2000);
  const res = [];
  const total = await page.evaluate(() => document.documentElement.scrollHeight / innerHeight);
  for (let i = 0; i <= 40; i++) {
    const r = await page.evaluate(async (f) => {
      scrollTo(0, f * (document.documentElement.scrollHeight - innerHeight));
      await new Promise((ok) => setTimeout(ok, 250));
      const W = document.documentElement.clientWidth;
      const wide = [...document.querySelectorAll("body *")]
        .filter((e) => {
          const b = e.getBoundingClientRect();
          const cs = getComputedStyle(e);
          return (
            b.width > 0 &&
            cs.visibility !== "hidden" &&
            cs.position !== "fixed" &&
            (b.right > W + 1 || b.left < -1) &&
            !e.closest("[aria-hidden=true]")
          );
        })
        .slice(0, 3)
        .map((e) => `${e.tagName.toLowerCase()}.${[...e.classList].join(".")}`);
      return { scrollWidth: document.documentElement.scrollWidth, W, wide };
    }, i / 40);
    res.push(r);
  }
  await page.close();
  return {
    screens: +total.toFixed(1),
    maxScrollWidth: Math.max(...res.map((r) => r.scrollWidth)),
    clientWidth: res[0].W,
    overflowingElements: [...new Set(res.flatMap((r) => r.wide))],
    pass: res.every((r) => r.scrollWidth <= r.W),
  };
};
out.horizontalOverflow = {
  live: await overflow("?tier=B&nodowngrade=1", true),
  reduced: await overflow("?reduced=1", false),
};

// 3. Rotation round-trip
out.rotation = [];
for (const vh of [0, 380]) {
  const page = await browser.newPage(VP);
  const errors = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.goto(`${BASE}?tier=B&nodowngrade=1&windt=3&nodamp=1`);
  await page.waitForFunction(() => window.__slay?.live === true, null, { timeout: 180000 });
  await page.evaluate(
    (v) =>
      scrollTo(
        0,
        v * parseFloat(getComputedStyle(document.documentElement).getPropertyValue("--vh")),
      ),
    vh,
  );
  await page.waitForTimeout(2000);
  const state = () =>
    page.evaluate(() => ({
      orientation: window.__slay.orientation,
      stageLive: document.querySelector("[data-stage]").dataset.live,
      mode: document.querySelector("[data-stage]").dataset.mode ?? null,
      vh: +(
        scrollY / parseFloat(getComputedStyle(document.documentElement).getPropertyValue("--vh"))
      ).toFixed(0),
    }));
  const steps = [{ step: "portrait", ...(await state()) }];
  await page.setViewportSize({ width: 832, height: 384 });
  await page
    .waitForFunction(
      () =>
        window.__slay.orientation === "landscape" &&
        document.querySelector("[data-stage]").dataset.live === "true",
      null,
      { timeout: 120000 },
    )
    .catch(() => undefined);
  await page.waitForTimeout(1500);
  steps.push({ step: "landscape", ...(await state()) });
  await page.setViewportSize({ width: 384, height: 832 });
  await page
    .waitForFunction(
      () =>
        window.__slay.orientation === "portrait" &&
        document.querySelector("[data-stage]").dataset.live === "true",
      null,
      { timeout: 120000 },
    )
    .catch(() => undefined);
  await page.waitForTimeout(1500);
  steps.push({ step: "portrait again", ...(await state()) });
  out.rotation.push({
    startVh: vh,
    steps,
    errors,
    pass:
      errors.length === 0 &&
      steps[1].orientation === "landscape" &&
      steps[1].stageLive === "true" &&
      steps[2].orientation === "portrait" &&
      steps[2].stageLive === "true",
  });
  await page.close();
}
await browser.close();
await writeFile("docs/perf/a26-emulated-evidence.json", JSON.stringify(out, null, 2) + "\n");
console.log(
  JSON.stringify(
    {
      accuracy: Object.fromEntries(
        Object.entries(out.accuracyTierB).map(([k, v]) => [
          k,
          {
            tier: v.tier,
            frames: v.probedFrames,
            p99: v.pointError.p99,
            max: v.pointError.max,
            edgeMax: v.edgeError.max,
            pass: v.pass,
          },
        ]),
      ),
      overflow: out.horizontalOverflow,
      rotation: out.rotation.map((r) => ({
        startVh: r.startVh,
        pass: r.pass,
        steps: r.steps,
        errors: r.errors,
      })),
    },
    null,
    1,
  ),
);
