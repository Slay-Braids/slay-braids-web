/**
 * I6 (revised, experimental): density-matched encodes of the anchor_v1 masters.
 *
 * On phones whose devicePixelRatio exceeds the tier's cap (A: 2), the live canvas renders at the
 * capped density while the still is chosen at full density, so the still is slightly sharper
 * than the first live frame. These extra encodes have the width of the CAPPED live render
 * (CSS width × cap), so still and live frame have the same density. They are only used with the
 * review flag #still-matched until real-device measurements show they help.
 *
 * Reads the untouched masters in assets/anchors; writes public/anchors-matched/ with its own
 * manifest. anchor_v1 files and manifest are never modified.
 */
import sharp from "sharp";
import { createHash } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

const DEST = path.resolve("public/anchors-matched");
// CSS widths of common phones × DPR cap 2, and common laptops × tier-B cap 1.5.
const WIDTHS = { portrait: [720, 750, 780, 824, 860], landscape: [2160, 2304] };
await mkdir(DEST, { recursive: true });
const manifest = {
  source: "anchor_v1 masters (unchanged)",
  purpose: "I6 density-matched still (experimental, #still-matched)",
  files: [],
};
for (const [o, widths] of Object.entries(WIDTHS)) {
  const master = await readFile(path.resolve(`assets/anchors/anchor_v1-${o}-master.png`));
  manifest[`${o}MasterSha256`] = createHash("sha256").update(master).digest("hex");
  for (const w of widths) {
    const img = sharp(master).resize({ width: w, kernel: "lanczos3" });
    for (const [ext, enc] of [
      ["avif", img.clone().avif({ quality: 58, effort: 6, chromaSubsampling: "4:4:4" })],
      ["webp", img.clone().webp({ quality: 82 })],
    ]) {
      const name = `anchor_v1-${o}-${w}.${ext}`;
      await enc.toFile(path.join(DEST, name));
      const buf = await readFile(path.join(DEST, name));
      manifest.files.push({
        name,
        width: w,
        bytes: buf.length,
        sha256: createHash("sha256").update(buf).digest("hex"),
      });
    }
  }
}
await writeFile(path.join(DEST, "manifest.json"), JSON.stringify(manifest, null, 2) + "\n");
console.log(manifest.files.length, "files");
