import { test, expect, type Page } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";

/**
 * M2 Chapters 1–3. Runs beside the unchanged M1 suite (experience.spec.ts).
 * Live checks use tier A with deterministic wind (windt) and undamped scroll (nodamp).
 */

const LIVE = "/?tier=A&nodowngrade=1&windt=3&nodamp=1";

async function waitLive(page: Page) {
  await page.waitForFunction(() => window.__slay?.live === true, null, { timeout: 120_000 });
}
async function scrollVh(page: Page, vh: number) {
  await page.evaluate((v) => {
    const px = parseFloat(getComputedStyle(document.documentElement).getPropertyValue("--vh"));
    window.scrollTo(0, v * px);
  }, vh);
  // Two rendered frames after the scroll (SwiftShader frames are slow).
  await page.waitForFunction(
    (v) =>
      Math.abs(
        (window as unknown as { __chapters: { currentScene: { scrollValue: number } } }).__chapters
          .currentScene.scrollValue - v,
      ) < 0.6,
    vh,
    { timeout: 30_000 },
  );
  await page.waitForTimeout(1200);
}

test.describe("document structure and accessibility", () => {
  test("title, landmarks and reading order follow the approved order", async ({ page }) => {
    await page.goto("/?tier=C");
    await expect(page).toHaveTitle("SLAY BRAIDS — Premium look. Affordable price.");
    const order = await page.evaluate(() => {
      const root = document.getElementById("experience")!;
      const els = [
        ...root.querySelectorAll("a.skip-link, header, main, nav[aria-label='Chapters'], footer"),
      ];
      return els.map(
        (e) => e.tagName.toLowerCase() + (e.classList.contains("skip-link") ? ".skip" : ""),
      );
    });
    expect(order).toEqual(["a.skip", "header", "main", "nav", "footer"]);
    const headings = await page
      .locator("main h1, main h2")
      .evaluateAll((hs) => hs.map((h) => `${h.tagName}:${h.textContent?.trim()}`));
    expect(headings[0]).toMatch(/^H1:Premium look\./);
    // Production: real headings, the craft film and the portrait replace the placeholder copy.
    expect(headings[1]).toBe("H2:The Craft");
    expect(headings[2]).toBe("H2:The Unbraiding");
    await expect(page.locator("main #ch2 video[data-loop-video]")).toHaveCount(1);
    await expect(page.locator("main #ch3 figure img")).toHaveCount(1);
    await expect(page.getByRole("link", { name: "SLAY BRAIDS, home" })).toBeVisible();
    await expect(page.getByRole("button", { name: "Menu" })).toBeVisible();
  });

  test("skip link moves focus to the h1", async ({ page }) => {
    await page.goto("/?tier=C");
    await page.keyboard.press("Tab");
    await expect(page.locator("a.skip-link")).toBeFocused();
    await page.keyboard.press("Enter");
    await expect(page.locator("#ch1-title")).toBeFocused();
  });

  test("menu is a modal dialog: focus moves in, Escape closes, focus returns", async ({ page }) => {
    await page.goto("/?tier=C");
    const menu = page.getByRole("button", { name: "Menu" });
    await menu.click();
    const dialog = page.getByRole("dialog", { name: "Menu" });
    await expect(dialog).toBeVisible();
    expect(
      await page.evaluate(() =>
        document.getElementById("site-menu")!.contains(document.activeElement),
      ),
    ).toBe(true);
    await page.keyboard.press("Escape");
    await expect(dialog).toBeHidden();
    await expect(menu).toBeFocused();
  });

  for (const url of ["/?tier=C", "/?reduced=1"]) {
    test(`axe: no WCAG 2.1 A/AA violations (${url})`, async ({ page }) => {
      await page.goto(url);
      await page.waitForTimeout(1500);
      const r = await new AxeBuilder({ page })
        .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"])
        .analyze();
      const v = r.violations.map(
        (x) => `${x.id}: ${x.nodes.map((n) => n.target.join(" ")).join(", ")}`,
      );
      expect(v).toEqual([]);
    });
  }

  test("axe on the live page at the Chapter 3 page", async ({ page }) => {
    test.setTimeout(180_000);
    await page.goto(LIVE);
    await waitLive(page);
    const portrait = page.viewportSize()!.width < page.viewportSize()!.height;
    await scrollVh(page, portrait ? 390 : 430); // hold: portrait fully shown (mid-fade text is transitional)
    const r = await new AxeBuilder({ page })
      .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"])
      .analyze();
    const v = r.violations.map(
      (x) => `${x.id}: ${x.nodes.map((n) => n.target.join(" ")).join(", ")}`,
    );
    expect(v).toEqual([]);
  });
});

test.describe("screen readers get every chapter, whatever the scroll position", () => {
  test.setTimeout(240_000);

  const check = (tree: string) => {
    expect(tree).toContain('heading "The Craft" [level=2]');
    expect(tree).toContain('heading "The Unbraiding" [level=2]');
    expect(tree).toContain("Portrait of a model with long copper curls");
    expect(tree).toContain('img "SLAY BRAIDS"');
    // Decorative numerals and the scroll cue never.
    // A decorative numeral would appear as its own text node ("Look 01" is a real heading).
    for (const deco of ["01", "02", "03", "Scroll"])
      expect(tree).not.toMatch(new RegExp(`^\\s*- (text|paragraph): "?${deco}"?$`, "m"));
  };

  test("live: same accessibility tree at the top, in Chapter 2, in Chapter 3 and after the page closes, matching reduced motion", async ({
    page,
  }) => {
    await page.goto("/?reduced=1");
    await page.waitForTimeout(1500);
    const reduced = await page.locator("main").ariaSnapshot();
    check(reduced);

    await page.goto(LIVE);
    await waitLive(page);
    const portrait = page.viewportSize()!.width < page.viewportSize()!.height;
    for (const vh of portrait ? [0, 160, 380, 470] : [0, 160, 400, 520]) {
      await scrollVh(page, vh);
      const live = await page.locator("main").ariaSnapshot();
      check(live);
      expect(live, `accessibility tree at ${vh} vh`).toBe(reduced);
    }
  });
});

test.describe("live chapters", () => {
  test.setTimeout(240_000);

  test("Chapter 2 shows the craft film; Chapter 3 page opens, covers, and the loop pauses (I4)", async ({
    page,
  }) => {
    await page.goto(LIVE);
    await waitLive(page);
    const portrait = page.viewportSize()!.width < page.viewportSize()!.height;
    const L = portrait
      ? { l2: 190, ch3: 380, cover: 470, back: 300 }
      : { l2: 200, ch3: 400, cover: 520, back: 300 };
    await scrollVh(page, L.l2);
    await expect(page.locator("[data-ch2-frame]")).toHaveAttribute("data-visible", "true");
    await expect
      .poll(() => page.locator("#ch2 video").evaluate((v: HTMLVideoElement) => !v.paused), { timeout: 45_000 })
      .toBe(true);

    await scrollVh(page, L.ch3);
    await expect(page.locator("[data-ch3-frame]")).toHaveAttribute("data-visible", "true");
    await expect(page.locator("[data-paper]")).toHaveCSS("visibility", "visible");
    expect(await page.locator("[data-paper] path").count()).toBeGreaterThan(3);
    await expect(page.locator("[data-ch3-line]")).toHaveAttribute("data-state", "active");

    await page.evaluate((v) => {
      const px = parseFloat(getComputedStyle(document.documentElement).getPropertyValue("--vh"));
      window.scrollTo(0, v * px);
    }, L.cover);
    await expect(page.locator("#experience")).toHaveAttribute("data-render-paused", "true", {
      timeout: 30_000,
    });
    await page.evaluate((v) => {
      const px = parseFloat(getComputedStyle(document.documentElement).getPropertyValue("--vh"));
      window.scrollTo(0, v * px);
    }, L.back);
    await expect(page.locator("#experience")).toHaveAttribute("data-render-paused", "false", {
      timeout: 30_000,
    });
  });

  test("page edge accuracy: CPU guide strand vs the locked shader on the GPU (P99 ≤ 2 px, max ≤ 3 px)", async ({
    page,
  }) => {
    await page.goto(`/?tier=A&nodowngrade=1&lab=transition`);
    await page.waitForFunction(() => window.__slay?.live === true && !!window.__lab, null, {
      timeout: 120_000,
    });
    // On CI's 2-core CPU renderer a probed frame can take many seconds, so one run may hold only
    // 1–2 probes. Runs are repeated until more than 3 frames are probed in total, and EVERY run
    // must meet the limits (P99 ≤ 2 px, max ≤ 3 px): stricter than a single run, never looser.
    if (process.env.CI) test.setTimeout(480_000);
    let probed = 0;
    let pointerFrames = 0;
    for (let i = 0; i < 6 && probed <= 3; i++) {
      const res = await page.evaluate(() => window.__lab!.run(15_000, 1));
      console.log(
        `[accuracy] ${res.orientation} run ${i + 1} · points ${res.guidePoints} · frames ${res.probedFrames} · point P99 ${res.pointError.p99.toFixed(4)} max ${res.pointError.max.toFixed(4)} · edge P99 ${res.edgeError.p99.toFixed(4)} max ${res.edgeError.max.toFixed(4)} px · pointer ${res.conditions.framesWithPointer} frames`,
      );
      probed += res.probedFrames;
      pointerFrames += res.conditions.framesWithPointer;
      if (res.probedFrames === 0) continue;
      expect(res.pointError.p99).toBeLessThanOrEqual(2);
      expect(res.pointError.max).toBeLessThanOrEqual(3);
      expect(res.edgeError.p99).toBeLessThanOrEqual(2);
      expect(res.edgeError.max).toBeLessThanOrEqual(3);
    }
    expect(probed).toBeGreaterThan(3);
    expect(pointerFrames).toBeGreaterThan(0);
  });
});

test.describe("static and reduced-motion spreads", () => {
  test("stills from the locked scene, every chapter visible, the page drawn once", async ({
    page,
  }) => {
    await page.goto("/?reduced=1");
    await expect(page.locator("html")).toHaveAttribute("data-static", "true");
    await expect(page.locator("[data-ch2-frame] .spread-still img")).toHaveCount(1);
    await expect(page.locator("[data-ch3-frame] .spread-still img")).toHaveCount(1);
    // Reduced motion: the craft film shows its poster and never plays by itself.
    await expect(page.locator("#ch2 video")).toHaveAttribute("poster", /craft-poster/);
    expect(await page.locator("#ch2 video").evaluate((v: HTMLVideoElement) => v.paused)).toBe(true);
    await page.locator("#ch3").scrollIntoViewIfNeeded();
    await expect(page.locator("[data-ch3-frame] .paper-static path").first()).toBeAttached();
    await expect(page.locator(".ch3-portrait")).toHaveCSS("opacity", "1");
    // The live chapters (and with them the scene) are never created in the static spreads.
    expect(await page.evaluate(() => "__chapters" in window)).toBe(false);
  });
});
