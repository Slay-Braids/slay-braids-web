/**
 * Chapter 2 and 3 stills for the static / reduced-motion spreads (isolated change I5).
 *
 * Rendered from the LOCKED scene, exactly as the live page draws it, with motion frozen
 * (wind 0, as in anchor_v1), at the reference aspect of each orientation so CSS object-fit:
 * cover reproduces the live composition at any viewport:
 *   ch2 = camera at K1 (Chapter 2 pose), ch3 = camera at K2 (Chapter 3 hold).
 * For ch3 it also stores the page edge the live page computes at that pose (guide strand),
 * normalised to the still, so the static page meets the still's hair the same way.
 *
 * Output: public/chapters/m2-{ch2|ch3}-{landscape|portrait}-{width}.{avif,webp,jpg}
 *         public/chapters/manifest.json (sizes, bytes, sha256, edges)
 * Separate from public/anchors (anchor_v1 and its manifest are never touched).
 *
 * Needs the static export served at http://127.0.0.1:4173 (npm run build; npx serve out -l 4173).
 */
import { chromium } from "@playwright/test";
import sharp from "sharp";
import { createHash } from "node:crypto";
import { mkdir, writeFile, readFile } from "node:fs/promises";
import path from "node:path";

const BASE = process.env.BASE ?? "http://127.0.0.1:4173/";
const DEST = path.resolve("public/chapters");
const SIZE = { landscape: [2560, 1440], portrait: [1440, 2560] };
const WIDTHS = { landscape: [1280, 1920, 2560], portrait: [720, 1080, 1440] };
const POSES = {
  landscape: { ch2: 150, ch3: 400 },
  portrait: { ch2: 130, ch3: 360 },
};

await mkdir(DEST, { recursive: true });
const browser = await chromium.launch({
  args: ["--use-angle=swiftshader", "--enable-unsafe-swiftshader", "--ignore-gpu-blocklist"],
});
const manifest = { version: "m2_ch_v1", renderedAt: new Date().toISOString(), files: [], edges: {} };

for (const orientation of ["landscape", "portrait"]) {
  const [w, h] = SIZE[orientation];
  const page = await browser.newPage({ viewport: { width: w, height: h }, deviceScaleFactor: 1 });
  await page.goto(`${BASE}?tier=A&nodowngrade=1&freeze=1&nodamp=1`);
  await page.waitForFunction(() => window.__slay?.live === true, null, { timeout: 180000 });
  manifest.renderer = "headless chromium (SwiftShader)";
  await page.addStyleTag({
    content: "main, header, footer, .grain, .chapter-index, [data-testid=banner], .paper-layer, .chapter-frame { visibility: hidden !important; }",
  });
  for (const [ch, vh] of Object.entries(POSES[orientation])) {
    const edge = await page.evaluate(async (vh) => {
      const c = window.__chapters;
      const s = c.currentScene;
      s.setScrollVh(vh, true);
      await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)));
      await new Promise((r) => setTimeout(r, 600));
      const fs = s.frameState();
      s.stop(); // hold this exact frame for the capture
      return c.guide.edge(fs).map(([x, y]) => [x / fs.cssWidth, y / fs.cssHeight]);
    }, vh);
    await page.waitForTimeout(300);
    const png = await page.screenshot({ animations: "disabled" });
    await page.evaluate(() => window.__chapters.resume?.());
    if (ch === "ch3") manifest.edges[orientation] = edge.map(([x, y]) => [+x.toFixed(5), +y.toFixed(5)]);
    await writeFile(path.join(DEST, `.m2-${ch}-${orientation}-master.png`), png);
    for (const width of WIDTHS[orientation]) {
      const img = sharp(png).resize({ width, kernel: "lanczos3" });
      for (const [ext, enc] of [
        ["avif", img.clone().avif({ quality: 58, effort: 6, chromaSubsampling: "4:4:4" })],
        ["webp", img.clone().webp({ quality: 82 })],
        ["jpg", img.clone().jpeg({ quality: 84, mozjpeg: true })],
      ]) {
        const name = `m2-${ch}-${orientation}-${width}.${ext}`;
        await enc.toFile(path.join(DEST, name));
        const buf = await readFile(path.join(DEST, name));
        manifest.files.push({ name, width, bytes: buf.length, sha256: createHash("sha256").update(buf).digest("hex") });
      }
    }
    console.log(`${orientation} ${ch} at ${vh} vh`);
  }
  await page.close();
}
await browser.close();
await writeFile(path.join(DEST, "manifest.json"), JSON.stringify(manifest, null, 2) + "\n");
