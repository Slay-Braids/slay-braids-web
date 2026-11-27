import { test, expect, type Page } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";

/**
 * M3: the complete site (Chapters 4–7, navigation, showcase, enquiry, fallbacks). Runs beside
 * the M1 (experience.spec.ts) and M2 (chapters.spec.ts) suites, which are unchanged.
 * Live checks: tier A, deterministic wind, undamped scroll. SwiftShader — behaviour only.
 */
const LIVE = "/?tier=A&nodowngrade=1&windt=3&nodamp=1";
type W = Window & {
  __chapters: { currentScene: { scrollValue: number } };
};

async function waitLive(page: Page) {
  await page.waitForFunction(() => window.__slay?.live === true, null, { timeout: 120_000 });
}
async function scrollVh(page: Page, vh: number) {
  await page.evaluate((v) => {
    const px = parseFloat(getComputedStyle(document.documentElement).getPropertyValue("--vh"));
    window.scrollTo(0, v * px);
  }, vh);
  await page.waitForFunction(
    (v) => Math.abs((window as unknown as W).__chapters.currentScene.scrollValue - v) < 0.6,
    vh,
    { timeout: 30_000 },
  );
  await page.waitForTimeout(1200);
}
const isPortrait = (page: Page) => page.viewportSize()!.width < page.viewportSize()!.height;
const opacity = (page: Page, sel: string) =>
  page.locator(sel).evaluate((e) => parseFloat(getComputedStyle(e).opacity));

// Settled positions per chapter (story.ts): landing points used by the chapter links.
// Production: four looks (one step each) in Chapter 5.
const AT = {
  landscape: { cover: 530, ch4: 685, p: [770, 820, 870, 920], ch6: 1115, ch7: 1295 },
  portrait: { cover: 475, ch4: 605, p: [720, 800, 880, 960], ch6: 1125, ch7: 1285 },
};

test.describe("structure", () => {
  test("seven chapters, in order, one h1; enquiry and footer last", async ({ page }) => {
    await page.goto("/?tier=C");
    const hs = await page
      .locator("main h1, main h2")
      .evaluateAll((hs) => hs.map((h) => `${h.tagName}:${h.textContent?.replace(/\s+/g, " ").trim()}`));
    expect(hs.filter((h) => h.startsWith("H1"))).toHaveLength(1);
    expect(hs.map((h) => h.split(":")[1]!.split(" ")[0])).toEqual([
      "Premium",
      "The",
      "The",
      "FUTURA",
      "The",
      "Lookbook",
      "Premium",
      "Enquiries",
    ]);
    await expect(page.locator("[data-chapter-tick]")).toHaveCount(7);
    await expect(page.locator("main section.chapter")).toHaveCount(7);
    await expect(page.locator("[data-product]")).toHaveCount(4);
    await expect(page.locator("footer nav a")).toHaveCount(8);
  });

  test("no invented prices, contacts, testimonials or placeholder copy", async ({ page }) => {
    await page.goto("/?tier=C");
    const text = (await page.locator("body").innerText()).toLowerCase();
    expect(text).not.toMatch(/[£$€₦]\s?\d/);
    expect(text).not.toMatch(/@[a-z0-9-]+\.[a-z]{2,}/); // no email address
    expect(text).not.toMatch(/\+?\d[\d\s-]{8,}\d/); // no phone number
    expect(text).not.toMatch(/testimonial|★|wording to come|placeholder|pending|preview/);
    await expect(page.locator(".placeholder-tag")).toHaveCount(0);
  });

  test("the original logo and the brand media load", async ({ page }) => {
    await page.goto("/?tier=C");
    const logo = page.locator("header .logo-slot img");
    await expect(logo).toHaveAttribute("src", /media\/logo-red/);
    await expect.poll(() => logo.evaluate((i: HTMLImageElement) => i.naturalWidth)).toBeGreaterThan(0);
    for (const img of await page.locator("main figure img").all()) {
      await img.scrollIntoViewIfNeeded();
      await expect.poll(() => img.evaluate((i: HTMLImageElement) => i.naturalWidth)).toBeGreaterThan(0);
    }
    // Every clip has 720p/1080p sources that exist and a poster.
    const srcs = await page.locator("video source").evaluateAll((ss) => ss.map((x) => (x as HTMLSourceElement).src));
    expect(srcs.length).toBe(12);
    for (const u of [...new Set(srcs)]) {
      const r = await page.request.head(u);
      expect(r.status(), u).toBe(200);
      expect(r.headers()["content-type"]).toContain("video/mp4");
    }
    const posters = await page.locator("video").evaluateAll((vs) => vs.map((v) => (v as HTMLVideoElement).poster));
    for (const u of posters) expect((await page.request.head(u)).status(), u).toBe(200);
  });

  test("404 page is on brand with a way back", async ({ page }) => {
    const r = await page.goto("/no-such-page");
    expect(r?.status()).toBe(404);
    await expect(page.getByRole("heading", { level: 1 })).toHaveText("This page is not here.");
    await expect(page.getByRole("link", { name: "Back to SLAY BRAIDS" })).toHaveAttribute("href", "/");
  });

  test("without JavaScript every chapter is readable (printed spreads)", async ({ browser }) => {
    const ctx = await browser.newContext({ javaScriptEnabled: false });
    const page = await ctx.newPage();
    await page.goto("/");
    await expect(page.locator("html")).toHaveAttribute("data-static", "true");
    for (const sel of ["#ch2-title", "#ch4-title", "#ch5-title", "#ch6-title", "#ch7-title"]) {
      const frame = page.locator(sel).locator("xpath=ancestor::div[contains(@class,'chapter-frame')]");
      await expect(frame).toHaveCSS("opacity", "1");
    }
    await ctx.close();
  });
});

test.describe("static and reduced-motion spreads (Chapters 4–7)", () => {
  test("stills for Chapters 4, 5 and 7; every product and the lookbook visible; axe clean", async ({
    page,
  }) => {
    await page.goto("/?reduced=1");
    await expect(page.locator("html")).toHaveAttribute("data-static", "true");
    for (const ch of ["ch4", "ch5", "ch7"]) {
      const img = page.locator(`[data-${ch}-frame] .spread-still img`);
      await expect(img).toHaveCount(1);
      await img.scrollIntoViewIfNeeded();
      await expect.poll(() => img.evaluate((i: HTMLImageElement) => i.naturalWidth)).toBeGreaterThan(0);
    }
    for (const p of await page.locator("[data-product]").all()) await expect(p).toHaveCSS("opacity", "1");
    await expect(page.locator("[data-ch6-spread]")).toHaveCSS("opacity", "1");
    await expect(page.locator("[data-ch7-content]")).toHaveCSS("opacity", "1");
    const r = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"]).analyze();
    expect(r.violations.map((v) => `${v.id}: ${v.nodes.map((n) => n.target.join(" ")).join(", ")}`)).toEqual([]);
  });

  test("no horizontal overflow anywhere (static)", async ({ page }) => {
    await page.goto("/?reduced=1");
    await page.waitForTimeout(800);
    const over = await page.evaluate(() => document.documentElement.scrollWidth - innerWidth);
    expect(over).toBeLessThanOrEqual(0);
  });
});

test.describe("live Chapters 4–7", () => {
  test.setTimeout(300_000);

  test("FUTURA, the Looks, Lookbook and Promise states follow the one scroll clock", async ({ page }) => {
    await page.goto(LIVE);
    await waitLive(page);
    const A = AT[isPortrait(page) ? "portrait" : "landscape"];

    // Ch 4 opens on the page that closed Chapter 3: full cover, printed FUTURA, render paused.
    await page.evaluate((v) => {
      const px = parseFloat(getComputedStyle(document.documentElement).getPropertyValue("--vh"));
      window.scrollTo(0, v * px);
    }, A.cover);
    await expect(page.locator("#experience")).toHaveAttribute("data-render-paused", "true", { timeout: 30_000 });
    expect(await opacity(page, "[data-ch4-printed]")).toBeGreaterThan(0.99);

    await scrollVh(page, A.ch4);
    await expect(page.locator("#experience")).toHaveAttribute("data-render-paused", "false");
    expect(await opacity(page, "[data-ch4-title]")).toBeGreaterThan(0.9);
    await expect(page.locator("[data-ch4-frame]")).toHaveAttribute("data-visible", "true");
    await expect(page.locator("[data-chapter-tick='4']")).toHaveAttribute("aria-current", "true");

    // Ch 5: one product per step, driven by scroll.
    for (const [i, v] of A.p.entries()) {
      await scrollVh(page, v);
      await expect(page.locator(`[data-product='${i}']`)).toHaveAttribute("data-active", "true");
      await expect(page.locator("[data-counter]")).toHaveText(`0${i + 1}`);
      // Only the active look plays.
      await expect
        .poll(() => page.locator(`[data-product='${i}'] video`).evaluate((v: HTMLVideoElement) => !v.paused), { timeout: 45_000 })
        .toBe(true);
      await expect
        .poll(
          () => page.locator("[data-product] video").evaluateAll((vs) => vs.filter((v) => !(v as HTMLVideoElement).paused).length),
          { timeout: 15_000 },
        )
        .toBe(1);
    }
    await expect(page.locator("[data-ch4-frame]")).toHaveAttribute("data-visible", "false");

    // Ch 6: the spread printed on the covering page; rendering pauses under it.
    await scrollVh(page, A.ch6);
    expect(await opacity(page, "[data-ch6-spread]")).toBeGreaterThan(0.99);
    await expect(page.locator("#experience")).toHaveAttribute("data-render-paused", "true", { timeout: 30_000 });

    // Ch 7: the promise returns over the hair.
    await scrollVh(page, A.ch7);
    await expect(page.locator("#experience")).toHaveAttribute("data-render-paused", "false");
    expect(await opacity(page, "[data-ch7-content]")).toBeGreaterThan(0.99);
    await expect(page.locator("[data-chapter-tick='7']")).toHaveAttribute("aria-current", "true");
    await expect(page.locator("[data-paper]")).toHaveCSS("visibility", "hidden");
  });

  test("accessibility tree in Chapters 4–7 matches reduced motion; axe clean at Ch5 and Ch7", async ({
    page,
  }) => {
    await page.goto("/?reduced=1");
    await page.waitForTimeout(1500);
    const reduced = await page.locator("main").ariaSnapshot();
    await page.goto(LIVE);
    await waitLive(page);
    const A = AT[isPortrait(page) ? "portrait" : "landscape"];
    for (const vh of [A.ch4, A.p[1]!, A.ch6, A.ch7]) {
      await scrollVh(page, vh);
      expect(await page.locator("main").ariaSnapshot(), `tree at ${vh} vh`).toBe(reduced);
      if (vh === A.p[1] || vh === A.ch7) {
        const r = await new AxeBuilder({ page })
          .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"])
          .analyze();
        expect(r.violations.map((v) => `${v.id}: ${v.nodes.map((n) => n.target.join(" ")).join(", ")}`)).toEqual([]);
      }
    }
  });

  test("menu link lands FUTURA at its settled state; showcase buttons step products; focus follows", async ({
    page,
  }) => {
    await page.goto(LIVE);
    await waitLive(page);
    const portrait = isPortrait(page);
    await page.getByRole("button", { name: "Menu" }).click();
    await page.getByRole("dialog", { name: "Menu" }).getByRole("link", { name: /FUTURA/ }).click();
    await page.waitForTimeout(1500);
    await expect(page.locator("#ch4-title")).toBeFocused();
    expect(await opacity(page, "[data-ch4-title]")).toBeGreaterThan(0.9);

    await page.getByRole("link", { name: "The Looks" }).first().evaluate((a: HTMLElement) => a.click());
    await page.waitForTimeout(1500);
    await expect(page.locator("[data-product='0']")).toHaveAttribute("data-active", "true");
    await page.locator("[data-next]").click();
    await expect(page.locator("[data-product='1']")).toHaveAttribute("data-active", "true", { timeout: 20_000 });
    await expect(page.locator("[data-showcase-status]")).toHaveText(/Look 2 of 4/);
    // Keyboard focus on Chapter 7's call to action brings Chapter 7 on screen.
    await page.locator("#ch7 a.btn-secondary").focus();
    await expect(page.locator("[data-ch7-frame]")).toHaveAttribute("data-visible", "true", { timeout: 20_000 });
    void portrait;
  });
});

test.describe("enquiries and motion", () => {
  test("no form without a verified destination; nothing is ever sent", async ({ page }) => {
    const posts: string[] = [];
    page.on("request", (r) => r.method() !== "GET" && r.method() !== "HEAD" && posts.push(r.url()));
    await page.goto("/?tier=C");
    await expect(page.locator("#enquire h2")).toHaveText("Enquiries");
    await expect(page.locator("#enquire")).toContainText("Online enquiries are not open yet.");
    await expect(page.locator("form, input, textarea, select")).toHaveCount(0);
    await page.locator("#enquire").scrollIntoViewIfNeeded();
    expect(posts).toEqual([]);
  });

  test("the header control pauses and resumes the brand footage (WCAG 2.2.2)", async ({ page }) => {
    test.setTimeout(240_000);
    await page.goto(LIVE);
    await waitLive(page);
    await scrollVh(page, AT[isPortrait(page) ? "portrait" : "landscape"].p[0]!);
    const v = page.locator("[data-product='0'] video");
    await expect.poll(() => v.evaluate((x: HTMLVideoElement) => !x.paused), { timeout: 45_000 }).toBe(true);
    // Keyboard: focusing the control brings the (scroll-hidden) header back.
    const toggle = page.locator("[data-motion-toggle]");
    await toggle.focus();
    await expect(toggle).toBeInViewport({ timeout: 20_000 }); // 500 ms slide; slow on the CPU renderer
    await page.keyboard.press("Enter");
    await expect(toggle).toHaveAttribute("aria-pressed", "true");
    await expect.poll(() => v.evaluate((x: HTMLVideoElement) => x.paused), { timeout: 15_000 }).toBe(true);
    await page.keyboard.press("Enter");
    await expect.poll(() => v.evaluate((x: HTMLVideoElement) => !x.paused), { timeout: 45_000 }).toBe(true);
  });

  test("reduced motion: footage never plays by itself; posters show", async ({ page }) => {
    await page.goto("/?reduced=1");
    await page.waitForTimeout(1500);
    await page.locator("#ch5").scrollIntoViewIfNeeded();
    await page.waitForTimeout(1200);
    const playing = await page.locator("video").evaluateAll((vs) => vs.filter((v) => !(v as HTMLVideoElement).paused).length);
    expect(playing).toBe(0);
    await expect(page.locator("[data-motion-toggle]")).toHaveAttribute("aria-pressed", "true");
  });
});

test.describe("resilience", () => {
  test.setTimeout(240_000);
  test("a lost WebGL context falls back to the static spreads", async ({ page }) => {
    await page.goto("/?tier=A&nodowngrade=1&windt=3");
    await waitLive(page);
    await page.evaluate(() => {
      const gl = document.querySelector("canvas")!.getContext("webgl2");
      gl?.getExtension("WEBGL_lose_context")?.loseContext();
    });
    await expect(page.locator("html")).toHaveAttribute("data-static", "true", { timeout: 20_000 });
    await expect(page.locator("[data-ch5-frame] .spread-still img")).toHaveCount(1);
  });

  test("rotation keeps the reader's place in the story", async ({ browser }) => {
    const ctx = await browser.newContext({ viewport: { width: 412, height: 915 }, isMobile: true, hasTouch: true });
    const page = await ctx.newPage();
    await page.goto("/?tier=B&nodowngrade=1&windt=3&nodamp=1");
    await waitLive(page);
    await scrollVh(page, 800); // Chapter 5, product 2 (portrait)
    await page.setViewportSize({ width: 915, height: 412 });
    await page.waitForTimeout(2500);
    const vh = await page.evaluate(
      () => scrollY / parseFloat(getComputedStyle(document.documentElement).getPropertyValue("--vh")),
    );
    // Portrait 800 vh is the middle of product 2's step; landscape product 2 is centred at 820.
    expect(Math.abs(vh - 820)).toBeLessThan(3);
    await expect(page.locator("[data-product='1']")).toHaveAttribute("data-active", "true");
    await ctx.close();
  });
});
