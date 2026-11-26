import { chromium } from "@playwright/test";
const browser = await chromium.launch();
for (const block of [true, false]) {
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  if (block) await page.route("**/*.woff2", (r) => r.abort());
  await page.goto("http://127.0.0.1:4173/?tier=C");
  await page.waitForTimeout(1500);
  const info = await page.evaluate(() =>
    [...document.querySelectorAll(".hero-title span")].map((s) => {
      const r = s.getBoundingClientRect();
      return [
        s.textContent,
        Math.round(r.width),
        Math.round(r.height),
        getComputedStyle(s).fontFamily.slice(0, 40),
        document.fonts.check("italic 100px 'Bodoni Moda'"),
      ];
    }),
  );
  console.log(
    block ? "fallback" : "webfont",
    JSON.stringify(info),
    await page.evaluate(() => getComputedStyle(document.querySelector(".hero-title")).fontSize),
  );
  await page.screenshot({
    path: `/tmp/claude-0/-home-user-slay-braids-web/ba6fe974-fa0d-57c1-a0fc-f9829c71473b/scratchpad/hero-${block ? "fb" : "wf"}.png`,
    clip: { x: 0, y: 150, width: 900, height: 700 },
  });
  await page.close();
}
await browser.close();
