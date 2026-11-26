/**
 * Review frame sheets for the Chapters 1–3 preview → docs/review/m2/*.jpg
 *   - sequence-{desktop|mobile}: the continuous scroll, Chapters 1–3 and the end card
 *   - lab-{desktop|mobile}: the Chapter 3 transition at lab positions 0/25/50/75/100 %
 *   - static-{desktop|mobile}: reduced-motion / fallback spreads
 * Live frames: deterministic wind time 3 s, undamped scroll (exact positions), SwiftShader.
 */
import { chromium } from "@playwright/test";
import sharp from "sharp";
import { mkdir } from "node:fs/promises";

const BASE = process.env.BASE ?? "http://127.0.0.1:4173/";
const OUT = "docs/review/m2";
await mkdir(OUT, { recursive: true });
const VP = {
  desktop: { viewport: { width: 1440, height: 900 }, deviceScaleFactor: 1 },
  mobile: {
    viewport: { width: 412, height: 915 },
    deviceScaleFactor: 1,
    isMobile: true,
    hasTouch: true,
  },
};
const SEQ = {
  desktop: [0, 60, 100, 150, 185, 220, 250, 290, 325, 350, 375, 400, 430, 470, 485, 500, 530, 560],
  mobile: [0, 60, 100, 130, 160, 190, 230, 260, 290, 320, 345, 370, 400, 420, 435, 450, 480, 510],
};
const CH3 = { desktop: [250, 500], mobile: [230, 450] };

async function sheet(name, tiles, cols, scale) {
  const metas = await Promise.all(tiles.map((t) => sharp(t.png).metadata()));
  const w = Math.round(metas[0].width * scale);
  const h = Math.round(metas[0].height * scale);
  const pad = 8,
    lab = 22;
  const rows = Math.ceil(tiles.length / cols);
  const W = cols * w + (cols + 1) * pad;
  const H = rows * (h + lab) + (rows + 1) * pad;
  const comps = [];
  for (const [i, t] of tiles.entries()) {
    const x = pad + (i % cols) * (w + pad);
    const y = pad + Math.floor(i / cols) * (h + lab + pad);
    comps.push({ input: await sharp(t.png).resize(w, h).toBuffer(), left: x, top: y + lab });
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${lab}"><text x="2" y="16" font-family="monospace" font-size="13" fill="#d8c3a0">${t.label}</text></svg>`;
    comps.push({ input: Buffer.from(svg), left: x, top: y });
  }
  await sharp({ create: { width: W, height: H, channels: 3, background: "#1b1815" } })
    .composite(comps)
    .jpeg({ quality: 86, mozjpeg: true })
    .toFile(`${OUT}/${name}.jpg`);
  console.log(`${OUT}/${name}.jpg`);
}

const browser = await chromium.launch({
  args: ["--use-angle=swiftshader", "--enable-unsafe-swiftshader", "--ignore-gpu-blocklist"],
});
for (const mode of ["desktop", "mobile"]) {
  const page = await browser.newPage(VP[mode]);
  await page.goto(`${BASE}?tier=A&nodowngrade=1&windt=3&nodamp=1`);
  await page.waitForFunction(() => window.__slay?.live === true, null, { timeout: 180000 });
  const go = async (v) => {
    await page.evaluate(async (v) => {
      const vh = parseFloat(getComputedStyle(document.documentElement).getPropertyValue("--vh"));
      scrollTo(0, v * vh);
      const frames = (n) =>
        new Promise((r) => {
          const f = () => (n-- ? requestAnimationFrame(f) : r());
          f();
        });
      await frames(3);
      await new Promise((r) => setTimeout(r, 1000));
      await frames(2);
    }, v);
    return page.screenshot();
  };
  const seq = [];
  for (const v of SEQ[mode]) seq.push({ label: `${v} vh`, png: await go(v) });
  await sheet(
    `sequence-${mode}`,
    seq,
    mode === "desktop" ? 3 : 6,
    mode === "desktop" ? 0.42 : 0.42,
  );
  const labT = [];
  const [a, b] = CH3[mode];
  // Lab positions over the transition itself: page arriving (paperIn) → at rest → closing (away).
  const T = [0.3, 0.375, 0.45, 0.525, 0.6, 0.84, 0.88, 0.92, 0.96, 1.0];
  for (const t of T) {
    const v = a + t * (b - a);
    labT.push({ label: `ch3 ${(t * 100).toFixed(1)} % (${v.toFixed(0)} vh)`, png: await go(v) });
  }
  await sheet(`lab-${mode}`, labT, mode === "desktop" ? 5 : 5, mode === "desktop" ? 0.33 : 0.42);
  await page.close();

  const sp = await browser.newPage(VP[mode]);
  await sp.goto(`${BASE}?reduced=1`);
  await sp.waitForTimeout(1500);
  const st = [];
  const h = VP[mode].viewport.height;
  for (const [i, label] of [
    "Chapter 1",
    "Chapter 2 (still, K1)",
    "Chapter 3 (still, K2, page)",
    "End card",
    "Enquiry",
  ].entries()) {
    await sp.evaluate((y) => scrollTo(0, y), i * h);
    await sp.waitForTimeout(800);
    st.push({ label, png: await sp.screenshot() });
  }
  await sheet(`static-${mode}`, st, 5, mode === "desktop" ? 0.3 : 0.42);
  await sp.close();
}
await browser.close();
