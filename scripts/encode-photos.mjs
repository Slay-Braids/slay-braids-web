/**
 * Studio photographs from the SLAY BRAIDS Drive ("Slay shoot footages", uploaded 27 Nov 2026),
 * downloaded byte-exact to PHOTO_SRC. No grading; resized only (never upscaled).
 * Output: public/media/photo-<key>-{480,960}.{avif,webp,jpg}, public/media/photos-manifest.json,
 * and the share image public/media/og.jpg from the original logo card.
 */
import { createHash } from "node:crypto";
import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";

const SRC = process.env.PHOTO_SRC ?? "/home/user/media-src/photos";
const OUT = path.resolve("public/media");
export const PHOTOS = {
  "studio-black-long": "1cC83Z_Jkhp4Lc9DnoFxTlcN7HukSrsKH",
  "studio-espresso-curls": "17gtEwulR5m2TbdaMKvBBnCGwHsHHVlL0",
  "studio-boho-blonde": "15Dw69vv1FQAlGulsDHBOq1gwsklD3BOi",
  "studio-auburn-seated": "10A-V7R5WRpcR8BFr0tKbG8R_d0EGPhta",
  "studio-auburn-side": "1EzgYf_HQFrxxbZ8J9LYTgNvg5v5qvRvd",
  "studio-platinum": "1Sfl71fVBeoHmgCbuJQy2-wdS2Ymgr5z1",
  "studio-golden-curls": "1KtfJZJHtmLJ-EA17UxeQ6CmTf2NOoGbI",
  "studio-copper-ends": "1vr_9UzCNOxprngqpbtVpT8iq915tGwvj",
  "studio-chestnut-curls": "1xE_FX-syYQ_SgHFDuJQESQOMZDli6Cnh",
  "studio-blonde-back": "1wOrXlZLVMVbdTRHrCNQ0SPV9j1HZER4c",
  "studio-honey-long": "1nxl9opgLW0nGELwyrgeYmQFIJ_zfzvhd",
  "studio-group": "1E-0s5X5lxtr1gggZGQfzzgXXdiPQeE4F",
};
const LOGO_CARD = "1N9zxG4xd7bbyGxwPtZaJ3Sn9ainFbpmP";
const sha = async (p) => createHash("sha256").update(await readFile(p)).digest("hex");
const manifest = { version: "photos_v1", generated: new Date().toISOString(), source: "Google Drive · Slay shoot footages", files: [] };
for (const [key, id] of Object.entries(PHOTOS)) {
  const src = path.join(SRC, `${id}.jpg`);
  const m = await sharp(src).metadata();
  for (const w of [480, 960]) {
    const width = Math.min(w, m.width);
    const img = sharp(src).resize({ width, kernel: "lanczos3", withoutEnlargement: true });
    for (const [ext, enc] of [
      ["avif", img.clone().avif({ quality: 62, effort: 6, chromaSubsampling: "4:4:4" })],
      ["webp", img.clone().webp({ quality: 84 })],
      ["jpg", img.clone().jpeg({ quality: 86, mozjpeg: true })],
    ]) {
      const name = `photo-${key}-${w}.${ext}`;
      await enc.toFile(path.join(OUT, name));
      manifest.files.push({ name, source: `${id}.jpg`, driveId: id, size: `${m.width}×${m.height}`, sha256: await sha(path.join(OUT, name)) });
    }
  }
  console.log(key, `${m.width}×${m.height}`);
}
// Share image: the original logo card, cover-fitted to 1200×630 (no recolouring).
await sharp(path.join(SRC, `${LOGO_CARD}.jpg`)).resize(1200, 630, { fit: "cover" }).jpeg({ quality: 88 }).toFile(path.join(OUT, "og.jpg"));
manifest.files.push({ name: "og.jpg", source: `${LOGO_CARD}.jpg`, driveId: LOGO_CARD, note: "logo card, cover-fitted" });
await writeFile(path.join(OUT, "photos-manifest.json"), JSON.stringify(manifest, null, 2) + "\n");
