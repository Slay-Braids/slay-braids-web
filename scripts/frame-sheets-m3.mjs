/**
 * M3 review frame sheets for the complete site (Chapters 1–7) → docs/review/m3/*.jpg
 * (the M2 script and its sheets in docs/review/m2 are kept as the approved baseline)
 *   - sequence-{desktop|mobile}: the continuous scroll, Chapters 1–3 and the end card
 *   - lab-{desktop|mobile}: the Chapter 3 transition at lab positions 0/25/50/75/100 %
 *   - static-{desktop|mobile}: reduced-motion / fallback spreads
 * Live frames: deterministic wind time 3 s, undamped scroll (exact positions), SwiftShader.
 */
import { chromium } from "@playwright/test";
import sharp from "sharp";
import { mkdir } from "node:fs/promises";

const BASE = process.env.BASE ?? "http://127.0.0.1:4173/";
const OUT = process.env.OUT ?? "docs/review/m3";
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
  desktop: [0, 150, 325, 470, 500, 530, 575, 600, 640, 685, 730, 770, 820, 870, 930, 960, 990, 1020, 1065, 1150, 1170, 1195, 1245, 1345],
  mobile: [0, 130, 300, 430, 450, 480, 515, 545, 580, 605, 650, 720, 800, 880, 935, 960, 990, 1010, 1045, 1120, 1140, 1165, 1205, 1300],
};
if (process.env.SEQ_D) SEQ.desktop = process.env.SEQ_D.split(",").map(Number);
if (process.env.SEQ_M) SEQ.mobile = process.env.SEQ_M.split(",").map(Number);

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
for (const mode of (process.env.MODES ?? "desktop,mobile").split(",")) {
  if (process.env.LIVE !== "0") {
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
    await sheet(`sequence-${mode}`, seq, mode === "desktop" ? 4 : 8, mode === "desktop" ? 0.36 : 0.36);
    await page.close();
  }
  if (process.env.STATIC === "0") continue;
  const sp = await browser.newPage(VP[mode]);
  await sp.goto(`${BASE}?reduced=1`);
  await sp.waitForTimeout(1500);
  const st = [];
  const ids = ["top", "ch2", "ch3", "ch4", "ch5", "ch6", "ch7", "enquire"];
  for (const id of ids) {
    const n = await sp.evaluate((id) => {
      const el = document.getElementById(id);
      return Math.max(1, Math.ceil(el.getBoundingClientRect().height / innerHeight));
    }, id);
    for (let k = 0; k < Math.min(n, 3); k++) {
      await sp.evaluate(
        ([id, k]) => scrollTo(0, document.getElementById(id).offsetTop + k * innerHeight),
        [id, k],
      );
      await sp.waitForTimeout(700);
      st.push({ label: `${id}${n > 1 ? ` ${k + 1}/${n}` : ""}`, png: await sp.screenshot() });
    }
  }
  await sp.evaluate(() => scrollTo(0, document.body.scrollHeight));
  await sp.waitForTimeout(500);
  st.push({ label: "footer", png: await sp.screenshot() });
  await sheet(`static-${mode}`, st, mode === "desktop" ? 4 : 8, mode === "desktop" ? 0.3 : 0.36);
  await sp.close();
}
await browser.close();
