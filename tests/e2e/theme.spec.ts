import { chromium, expect, test, type Page } from "@playwright/test";
import sharp from "sharp";

/**
 * v4 themes (27 Nov 2026). The site follows the device's light/dark setting, a visitor can pick
 * one (remembered), and browsers' own "dark mode for websites" (Samsung Internet, Chrome
 * auto-dark) must not recolour the page: the owner's phone showed white type on white.
 */

const rgb = (page: Page, sel: string, prop: "color" | "backgroundColor") =>
  page.locator(sel).first().evaluate((el, p) => getComputedStyle(el)[p as "color"], prop);

test("follows a dark system setting: dark ground, light type, dark still", async ({ browser }, info) => {
  const ctx = await browser.newContext({ ...info.project.use, colorScheme: "dark" });
  const page = await ctx.newPage();
  await page.goto("/?tier=C");
  await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
  expect(await rgb(page, "html", "backgroundColor")).toBe("rgb(10, 10, 10)");
  expect(await rgb(page, "#ch1-title", "color")).toBe("rgb(255, 255, 255)");
  expect(await rgb(page, ".hero-sub", "color")).toBe("rgb(255, 255, 255)");
  await page.waitForFunction(() => document.querySelector<HTMLImageElement>(".stage img")?.complete);
  const src = await page.locator(".stage img").evaluate((i: HTMLImageElement) => i.currentSrc);
  expect(src).toContain("-dark-");
  await ctx.close();
});

test("follows a light system setting by default", async ({ browser }, info) => {
  const ctx = await browser.newContext({ ...info.project.use, colorScheme: "light" });
  const page = await ctx.newPage();
  await page.goto("/?tier=C");
  await expect(page.locator("html")).toHaveAttribute("data-theme", "light");
  expect(await rgb(page, "#ch1-title", "color")).toBe("rgb(10, 10, 10)");
  const src = await page.locator(".stage img").evaluate((i: HTMLImageElement) => i.currentSrc);
  expect(src).not.toContain("-dark-");
  await ctx.close();
});

test("the theme switch changes the theme and is remembered", async ({ browser }, info) => {
  const ctx = await browser.newContext({ ...info.project.use, colorScheme: "light" });
  const page = await ctx.newPage();
  await page.goto("/?tier=C");
  const toggle = page.locator("header [data-theme-toggle]");
  await expect(toggle).toHaveAccessibleName("Switch to dark mode");
  await toggle.click();
  await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
  await expect(toggle).toHaveAccessibleName("Switch to light mode");
  await expect(toggle).toHaveAttribute("aria-pressed", "true");
  // The still follows the pick even though the system is light.
  await expect
    .poll(() => page.locator(".stage img").evaluate((i: HTMLImageElement) => i.currentSrc), { timeout: 15_000 })
    .toContain("-dark-");
  await page.reload();
  await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
  expect(await rgb(page, "#ch1-title", "color")).toBe("rgb(255, 255, 255)");
  // Picking the system's own theme again goes back to following the system.
  await page.locator("header [data-theme-toggle]").click();
  await expect(page.locator("html")).toHaveAttribute("data-theme", "light");
  expect(await page.evaluate(() => localStorage.getItem("slay-theme"))).toBeNull();
  await ctx.close();
});

test("live 3D: the dark theme starts on the black world and matches its still", async ({ browser }, info) => {
  test.slow(!!process.env.CI, "SwiftShader on a 2-core CI runner");
  const ctx = await browser.newContext({ ...info.project.use, colorScheme: "dark" });
  const page = await ctx.newPage();
  const hide = `.grain, header, main, [data-testid=banner] { visibility: hidden !important; } .stage canvas { transition: none !important; }`;
  await page.goto("/?tier=C");
  await page.waitForFunction(() => document.querySelector<HTMLImageElement>(".stage img")?.complete);
  await page.addStyleTag({ content: hide });
  await page.waitForTimeout(300);
  const still = await page.screenshot({ animations: "disabled" });
  await page.goto("/?tier=A&freeze=1&nodowngrade=1");
  await page.waitForFunction(() => window.__slay?.live === true, null, { timeout: 120_000 });
  await page.addStyleTag({ content: hide });
  const live = await page.screenshot({ animations: "disabled" });
  const stats = async (b: Buffer) => (await sharp(b).removeAlpha().blur(1.5).raw().toBuffer({ resolveWithObject: true })).data;
  const [a, b] = await Promise.all([stats(still), stats(live)]);
  let sum = 0;
  let lum = 0;
  for (let i = 0; i < a.length; i++) {
    sum += Math.abs(a[i]! - b[i]!);
    lum += b[i]!;
  }
  const mean = sum / a.length;
  console.log(`[${info.project.name}] dark handoff perceptual ${mean.toFixed(2)}/255, live mean ${(lum / b.length).toFixed(1)}`);
  expect(lum / b.length).toBeLessThan(90); // a dark world, not white
  expect(mean).toBeLessThan(2);
  await ctx.close();
});

test("browsers' forced dark mode does not recolour the page", async ({}, info) => {
  test.skip(info.project.name === "mobile", "one engine check is enough");
  // Chromium's "auto dark mode for web contents" (what Samsung Internet and Chrome apply).
  const shot = async (forced: boolean, scheme: "light" | "dark", stored?: "light") => {
    const b = await chromium.launch({
      args: forced ? ["--blink-settings=forceDarkModeEnabled=true"] : [],
    });
    const ctx = await b.newContext({ viewport: { width: 1280, height: 800 }, colorScheme: scheme });
    const page = await ctx.newPage();
    if (stored) {
      await page.goto("http://127.0.0.1:4173/404");
      await page.evaluate((v) => localStorage.setItem("slay-theme", v), stored);
    }
    await page.goto("http://127.0.0.1:4173/?tier=C");
    await page.waitForFunction(() => document.querySelector<HTMLImageElement>(".stage img")?.complete);
    await page.addStyleTag({ content: ".grain { display: none !important; } * { animation: none !important; transition: none !important; }" });
    await page.waitForTimeout(500);
    const png = await page.screenshot();
    await b.close();
    return (await sharp(png).removeAlpha().raw().toBuffer({ resolveWithObject: true })).data;
  };
  // Phones apply it when the system is dark: following the system, and with light picked on the site.
  for (const [scheme, stored] of [["dark", undefined], ["dark", "light"]] as const) {
    const [normal, forced] = [await shot(false, scheme, stored), await shot(true, scheme, stored)];
    let sum = 0;
    for (let i = 0; i < normal.length; i++) sum += Math.abs(normal[i]! - forced[i]!);
    const mean = sum / normal.length;
    console.log(`[forced dark] system ${scheme}${stored ? `, picked ${stored}` : ""}: mean Δ ${mean.toFixed(2)}/255`);
    expect(mean, `system ${scheme}${stored ? `, picked ${stored}` : ""}`).toBeLessThan(1);
  }
});
