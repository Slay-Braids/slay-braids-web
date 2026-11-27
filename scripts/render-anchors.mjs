/**
 * Renders the anchor stills from the live scene code (frozen pose) and encodes them.
 *
 *   pnpm build && pnpm anchors:render            # all orientations, all formats
 *   node scripts/render-anchors.mjs --draft      # quick 50 % renders for look-dev (scratch only)
 *
 * Output: public/anchors/anchor_v1-{landscape|portrait}-{width}.{avif,webp,jpg}
 *         assets/anchors/anchor_v1-{orientation}-master.png (lossless master, versioned, never deployed)
 *         public/anchors/manifest.json (sizes, bytes, sha256)
 */
import { chromium } from "@playwright/test";
import { createServer } from "node:http";
import { readFile, writeFile, mkdir } from "node:fs/promises";
import { createHash } from "node:crypto";
import path from "node:path";
import sharp from "sharp";

const OUT = path.resolve("out");
const DEST = path.resolve("public/anchors");
const draft = process.argv.includes("--draft");
const VERSION = process.env.ANCHOR_VERSION ?? "anchor_v3";
// v4: THEME=dark renders the same anchor on the dark theme's black world (files: <version>-dark-…).
const THEME = process.env.THEME === "dark" ? "dark" : "light";
const NAME = THEME === "dark" ? `${VERSION}-dark` : VERSION;
const WIDTHS = { landscape: [1280, 1920, 2560], portrait: [720, 1080, 1440] };

const types = {
  ".html": "text/html",
  ".js": "text/javascript",
  ".css": "text/css",
  ".woff2": "font/woff2",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".avif": "image/avif",
  ".webp": "image/webp",
  ".json": "application/json",
  ".txt": "text/plain",
};
const server = createServer(async (req, res) => {
  const url = new URL(req.url, "http://x");
  let p = path.join(OUT, decodeURIComponent(url.pathname));
  if (p.endsWith("/")) p += "index.html";
  try {
    const body = await readFile(p);
    res.writeHead(200, { "content-type": types[path.extname(p)] ?? "application/octet-stream" });
    res.end(body);
  } catch {
    res.writeHead(404);
    res.end();
  }
});
await new Promise((r) => server.listen(0, "127.0.0.1", r));
const port = server.address().port;

const browser = await chromium.launch({
  args: ["--use-angle=swiftshader", "--enable-unsafe-swiftshader", "--ignore-gpu-blocklist"],
});
await mkdir(DEST, { recursive: true });
const manifest = {
  version: VERSION,
  theme: THEME,
  renderedAt: new Date().toISOString(),
  renderer: "",
  files: [],
};

for (const orientation of ["landscape", "portrait"]) {
  const page = await browser.newPage({
    viewport:
      orientation === "landscape" ? { width: 1280, height: 720 } : { width: 720, height: 1280 },
  });
  page.on("console", (m) => m.type() === "error" && console.error("[page]", m.text()));
  const t0 = Date.now();
  await page.goto(`http://127.0.0.1:${port}/?anchor=${orientation}&theme=${THEME}`);
  await page.waitForFunction(() => window.__anchorPNG, null, { timeout: 180_000 });
  const dataUrl = await page.evaluate(() => window.__anchorPNG);
  manifest.renderer = await page.evaluate(
    () => window.__slay?.stats?.gpu ?? "headless chromium (SwiftShader)",
  );
  const png = Buffer.from(dataUrl.split(",")[1], "base64");
  console.log(`${orientation}: rendered in ${Date.now() - t0} ms`);
  await page.close();

  if (draft) {
    const file = path.join(process.env.DRAFT_DIR ?? DEST, `draft-${orientation}.jpg`);
    await sharp(png).resize({ width: WIDTHS[orientation][0] }).jpeg({ quality: 88 }).toFile(file);
    await writeFile(path.join(process.env.DRAFT_DIR ?? DEST, `draft-${orientation}-full.png`), png);
    console.log("draft →", file);
    continue;
  }
  await mkdir(path.resolve("assets/anchors"), { recursive: true });
  const master = path.resolve("assets/anchors", `${NAME}-${orientation}-master.png`);
  await writeFile(master, png);
  for (const w of WIDTHS[orientation]) {
    const img = sharp(png).resize({ width: w, kernel: "lanczos3" });
    const outs = [
      [`avif`, img.clone().avif({ quality: 58, effort: 6, chromaSubsampling: "4:4:4" })],
      [`webp`, img.clone().webp({ quality: 82 })],
      [`jpg`, img.clone().jpeg({ quality: 84, mozjpeg: true })],
    ];
    for (const [ext, pipeline] of outs) {
      const buf = await pipeline.toBuffer();
      const name = `${NAME}-${orientation}-${w}.${ext}`;
      await writeFile(path.join(DEST, name), buf);
      manifest.files.push({
        name,
        width: w,
        bytes: buf.length,
        sha256: createHash("sha256").update(buf).digest("hex"),
      });
    }
  }
}
if (!draft) {
  // anchor_v1 keeps public/anchors/manifest.json; later versions get their own manifest.
  const manifestName = VERSION === "anchor_v1" && THEME === "light" ? "manifest.json" : `manifest-${NAME}.json`;
  await writeFile(path.join(DEST, manifestName), JSON.stringify(manifest, null, 2) + "\n");
}
await browser.close();
server.close();
