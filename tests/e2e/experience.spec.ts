import { expect, test, type Page } from "@playwright/test";
import sharp from "sharp";

/**
 * M1 acceptance tests, run against the static export in headless Chromium.
 * NOTE: headless Chromium renders WebGL with SwiftShader (CPU). These tests prove behaviour and
 * pixel continuity, NOT real-device frame rates — those come from the real-device protocol.
 */

const ISOLATE_STAGE = `
  .grain, header, main, [data-testid=banner], body > div > p { visibility: hidden !important; }
  .stage canvas { transition: none !important; }
`;

async function stageShot(page: Page) {
  await page.addStyleTag({ content: ISOLATE_STAGE });
  return page.screenshot({ animations: "disabled" });
}

async function diff(
  a: Buffer,
  b: Buffer,
  region?: { left: number; top: number; width: number; height: number },
  blurSigma = 0,
) {
  const load = async (buf: Buffer) => {
    let img = sharp(buf).removeAlpha();
    if (region) img = img.extract(region);
    if (blurSigma > 0) img = img.blur(blurSigma);
    return img.raw().toBuffer({ resolveWithObject: true });
  };
  const [x, y] = await Promise.all([load(a), load(b)]);
  let sum = 0;
  let big = 0;
  for (let i = 0; i < x.data.length; i++) {
    const d = Math.abs(x.data[i]! - y.data[i]!);
    sum += d;
    if (d > 24) big++;
  }
  return { mean: sum / x.data.length, bigFraction: big / x.data.length };
}

async function waitLive(page: Page) {
  await page.waitForFunction(() => window.__slay?.live === true, null, { timeout: 120_000 });
}

test.describe("anchor still → live 3D handoff", () => {
  test("live first frame matches the anchor still", async ({ page }, info) => {
    await page.goto("/?tier=C");
    await page.waitForFunction(
      () => document.querySelector<HTMLImageElement>(".stage img")?.complete,
    );
    await page.waitForTimeout(300);
    const still = await stageShot(page);

    await page.goto("/?tier=A&freeze=1&nodowngrade=1");
    await waitLive(page);
    const live = await stageShot(page);

    const meta = await sharp(still).metadata();
    const black = await sharp({
      create: { width: meta.width!, height: meta.height!, channels: 3, background: "#0a0908" },
    })
      .png()
      .toBuffer();
    // Raw per-pixel difference is dominated by sub-pixel sampling of 1-px fibres (the still is
    // rendered at 2560 px and downsampled; the live frame renders natively). What a viewer sees
    // during the 600 ms cross-fade is the perceptual difference: compare at a 1.5 px blur.
    const raw = await diff(still, live);
    const perceptual = await diff(still, live, undefined, 1.5);
    const content = await diff(still, black, undefined, 1.5);
    const lum = async (buf: Buffer) =>
      (await sharp(buf).stats()).channels.slice(0, 3).reduce((s, c) => s + c.mean, 0) / 3;
    const [lumStill, lumLive] = await Promise.all([lum(still), lum(live)]);
    const msg = `raw ${raw.mean.toFixed(2)}/255 · perceptual ${perceptual.mean.toFixed(2)}/255 · content ${content.mean.toFixed(2)}/255 · luminance ${lumStill.toFixed(2)} vs ${lumLive.toFixed(2)}`;
    info.annotations.push({ type: "handoff", description: msg });
    console.log(`[${info.project.name}] handoff ${msg}`);
    expect(perceptual.mean).toBeLessThan(2);
    // 0.15: on high-DPR phones the canvas is capped at 2x, so it is marginally softer than the
    // full-resolution still (documented in the M1 report as a known item for M2).
    expect(perceptual.mean).toBeLessThan(content.mean * 0.15);
    expect(Math.abs(lumStill - lumLive) / lumStill).toBeLessThan(0.03);
  });
});

// CI: GitHub's 2-core runner renders WebGL on the CPU (SwiftShader); these screenshot tests need
// more time there (assertions unchanged). Both failed the same way before the production redesign.
const CI_SLOW = "SwiftShader on a 2-core CI runner: frames take seconds";

test("pointer parts the loose strands", async ({ page }, info) => {
  test.skip(info.project.name === "mobile", "touch drag covered on real devices");
  test.slow(!!process.env.CI, CI_SLOW);
  await page.goto("/?tier=A&freeze=1&nodowngrade=1");
  await waitLive(page);
  await page.addStyleTag({ content: ISOLATE_STAGE });
  const vp = page.viewportSize()!;
  const region = {
    left: Math.round(vp.width * 0.55),
    top: Math.round(vp.height * 0.45),
    width: Math.round(vp.width * 0.3),
    height: Math.round(vp.height * 0.4),
  };
  const before = await page.screenshot();
  for (let i = 0; i <= 12; i++) {
    await page.mouse.move(region.left + (region.width * i) / 12, region.top + region.height / 2);
    await page.waitForTimeout(40);
  }
  const during = await page.screenshot();
  const d = await diff(before, during, region);
  console.log(`[pointer] mean Δ in pointer region ${d.mean.toFixed(2)}`);
  expect(d.mean).toBeGreaterThan(1.5);
});

test("scroll drives the camera", async ({ page }) => {
  test.slow(!!process.env.CI, CI_SLOW);
  await page.goto("/?tier=A&freeze=1&nodowngrade=1");
  await waitLive(page);
  await page.addStyleTag({ content: ISOLATE_STAGE });
  const top = await page.screenshot();
  await page.evaluate(() => window.scrollTo(0, document.documentElement.scrollHeight * 0.35));
  await page.waitForTimeout(2500);
  const mid = await page.screenshot();
  const d = await diff(top, mid);
  console.log(`[scroll] mean Δ after scrolling 35% ${d.mean.toFixed(2)}`);
  expect(d.mean).toBeGreaterThan(4);
});

test.describe("lazy loading and fallbacks", () => {
  async function loadAndRecord(page: Page, url: string) {
    let bytes = 0;
    let threeAt = -1;
    let anchorAt = -1;
    const t0 = Date.now();
    page.on("response", async (r) => {
      const u = r.url();
      if (u.includes("/anchors/") && anchorAt < 0) anchorAt = Date.now() - t0;
      if (u.endsWith(".js")) {
        const b = await r.body().catch(() => Buffer.alloc(0));
        bytes += b.length;
        // three.js keeps this string in its error messages even when minified.
        if (b.includes("THREE.WebGLRenderer") && threeAt < 0) threeAt = Date.now() - t0;
      }
    });
    await page.goto(url);
    await page.waitForLoadState("networkidle");
    await page.waitForTimeout(1500);
    return { bytes, threeAt, anchorAt };
  }

  test("tier C never downloads three.js; tier A downloads it only after the still", async ({
    page,
    browser,
  }) => {
    test.slow(!!process.env.CI, CI_SLOW);
    const c = await loadAndRecord(page, "/?tier=C");
    const pageA = await browser.newPage({ viewport: page.viewportSize()! });
    const a = await loadAndRecord(pageA, "/?tier=A&freeze=1&nodowngrade=1");
    console.log(
      `[lazy] JS tier C ${(c.bytes / 1024).toFixed(0)} KB (three: ${c.threeAt}) · tier A ${(a.bytes / 1024).toFixed(0)} KB (anchor at ${a.anchorAt} ms, three at ${a.threeAt} ms)`,
    );
    expect(c.threeAt).toBe(-1);
    expect(a.threeAt).toBeGreaterThan(-1);
    expect(a.anchorAt).toBeLessThanOrEqual(a.threeAt);
    await pageA.close();
  });

  test("reduced motion shows the static anchor, no canvas, all text visible", async ({ page }) => {
    await page.emulateMedia({ reducedMotion: "reduce" });
    await page.goto("/");
    await page.waitForFunction(() => window.__slay?.tier === "C");
    await expect(page.locator(".stage")).toHaveAttribute("data-mode", "static");
    await expect(page.locator(".stage canvas")).toBeHidden();
    await expect(page.locator("html")).toHaveAttribute("data-reduced-motion", "true");
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
    const opacity = await page
      .locator("[data-reveal]")
      .first()
      .evaluate((el) => getComputedStyle(el).opacity);
    expect(opacity).toBe("1");
  });

  test("shows the anchor that matches the orientation", async ({ page }, info) => {
    await page.goto("/?tier=C");
    const src = await page
      .locator(".stage img")
      .evaluate((img: HTMLImageElement) => img.currentSrc);
    expect(src).toContain(info.project.name === "mobile" ? "portrait" : "landscape");
  });
});

test("publishes no unapproved product claims", async ({ page }) => {
  await page.goto("/?tier=C");
  const text = (await page.locator("body").innerText()).toLowerCase();
  for (const banned of [
    "°c",
    "°f",
    "flame",
    "heat friendly",
    "heat resistant",
    "tangle",
    "curl retention",
    "polyester",
    "kanekalon",
    "kaneka",
    "fibre composition",
  ]) {
    expect(text, `found "${banned}"`).not.toContain(banned);
  }
});

// Production (27 Nov 2026): no verified enquiry destination exists, so there is no form at all
// (the M1 version checked a disabled "not enabled" button). The site must never pretend to send.
test("enquiries never pretend to send", async ({ page }) => {
  await page.goto("/?tier=C");
  await expect(page.locator("#enquire")).toContainText("Online enquiries are not open yet.");
  await expect(page.locator("form")).toHaveCount(0);
  await expect(page.getByRole("button", { name: /send|submit/i })).toHaveCount(0);
});
