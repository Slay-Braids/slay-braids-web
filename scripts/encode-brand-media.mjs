/**
 * Production media from the official SLAY BRAIDS Google Drive ("Slay shoot footages", owner
 * brendaobiamalu1; logos in the same folder). Originals are never modified: they are read from
 * MEDIA_SRC (default /home/user/media-src/orig, downloaded byte-exact from Drive) and the logo
 * originals from assets/brand/originals/.
 *
 *  - Video: no grading, no audio, colours kept (BT.709 SDR as shot on iPhone 15 Pro Max).
 *    H.264 High, 720×1280 (mobile, CRF 23) and 1080×1920 (desktop, CRF 24, max 6 Mbps), faststart.
 *  - Posters and stills: AVIF + WebP + JPEG.
 *  - Logos: transparent margins trimmed only (no recolouring, redrawing or distortion).
 * Writes public/media/* and public/media/manifest.json (source file, Drive id, segment, sha256).
 */
import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { mkdir, readFile, writeFile, readdir } from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";

const SRC = process.env.MEDIA_SRC ?? "/home/user/media-src/orig";
const OUT = path.resolve("public/media");
await mkdir(OUT, { recursive: true });

// Drive ids from the "Slay shoot footages" folder (first copy of each duplicate pair).
const CLIPS = {
  craft: { file: "IMG_2209.MOV", id: "1oJ8N843Abw3nFjn8r2yc13xUxaIKj2_8", start: 9, dur: 8 },
  "look-copper": { file: "IMG_2465.MOV", id: "1UAyOjNKTGmoLhIKfOwjLpmlA7T6eBWBI", start: 12, dur: 6 },
  "look-platinum": { file: "IMG_2471.MOV", id: "1gyPazlT8s3c30_bbALN4pOt_F_34lLYK", start: 10, dur: 6 },
  "look-honey": { file: "IMG_2466.MOV", id: "1l-myvXVEP8EdzuqHkSmHKa8afXFhBhcq", start: 13, dur: 6 },
  "look-black": { file: "IMG_2470.MOV", id: "1DvYYtQIipcM8QQ6FSkay9cbzZ3ndpLOh", start: 8, dur: 6 },
  "lookbook-copper": { file: "IMG_2464.MOV", id: "1wJXNRGGSuwWUKUW4VPoqRO-D3tSIi3gd", start: 2, dur: 6 },
};
const STILLS = {
  "portrait-copper": { file: "IMG_2465.MOV", id: "1UAyOjNKTGmoLhIKfOwjLpmlA7T6eBWBI", at: 22 },
  "lookbook-honey": { file: "IMG_2468.MOV", id: "1YlyMoIdDHCLqRBa-R2qG7FZLaGXgX5j6", at: 3 },
  "lookbook-platinum": { file: "IMG_2463.MOV", id: "1sFScc8YuZLVUzq9-PhZcSnjjT_uP0A91", at: 6 },
};
const ff = (args) => execFileSync("ffmpeg", ["-v", "error", "-y", ...args], { stdio: "inherit" });
const sha = async (p) => createHash("sha256").update(await readFile(p)).digest("hex");
const manifest = { version: "brand_media_v1", generated: new Date().toISOString(), source: "Google Drive · Slay shoot footages", files: [] };
const add = async (name, meta) => manifest.files.push({ name, bytes: (await readFile(path.join(OUT, name))).length, sha256: await sha(path.join(OUT, name)), ...meta });

const colour = ["-colorspace", "bt709", "-color_primaries", "bt709", "-color_trc", "bt709", "-color_range", "tv"];
for (const [name, c] of Object.entries(CLIPS)) {
  const src = path.join(SRC, c.file);
  for (const [h, crf] of [[1280, 23], [1920, 24]]) {
    const out = `${name}-${h === 1280 ? 720 : 1080}.mp4`;
    ff(["-ss", String(c.start), "-t", String(c.dur), "-i", src, "-an",
      "-vf", `scale=-2:${h}:flags=lanczos,format=yuv420p`,
      "-c:v", "libx264", "-preset", "slow", "-crf", String(crf), "-profile:v", "high", "-pix_fmt", "yuv420p",
      ...(h === 1920 ? ["-maxrate", "6M", "-bufsize", "12M"] : []),
      ...colour, "-movflags", "+faststart", path.join(OUT, out)]);
    await add(out, { source: c.file, driveId: c.id, segment: [c.start, c.start + c.dur] });
  }
  // Poster = first frame of the segment.
  const png = path.join(OUT, `${name}-poster.png`);
  ff(["-ss", String(c.start), "-i", src, "-frames:v", "1", "-vf", "scale=-2:1920:flags=lanczos", png]);
  await stillSet(png, `${name}-poster`, { source: c.file, driveId: c.id, at: c.start });
}
for (const [name, s] of Object.entries(STILLS)) {
  const png = path.join(OUT, `${name}.png`);
  ff(["-ss", String(s.at), "-i", path.join(SRC, s.file), "-frames:v", "1", png]);
  await stillSet(png, name, { source: s.file, driveId: s.id, at: s.at });
}

async function stillSet(png, base, meta) {
  for (const w of [540, 1080]) {
    const img = sharp(png).resize({ width: w, kernel: "lanczos3" });
    for (const [ext, enc] of [
      ["avif", img.clone().avif({ quality: 60, effort: 6, chromaSubsampling: "4:4:4" })],
      ["webp", img.clone().webp({ quality: 82 })],
      ["jpg", img.clone().jpeg({ quality: 84, mozjpeg: true })],
    ]) {
      const n = `${base}-${w}.${ext}`;
      await enc.toFile(path.join(OUT, n));
      await add(n, meta);
    }
  }
  const { unlink } = await import("node:fs/promises");
  await unlink(png);
}

// Logos: trim transparent margins only.
const LOGOS = {
  "logo-red": { file: "20261029_161903-Photoroom.png", id: "1FuJC9OURO0hI2O0y4FfLU8Rr0wwe_p7G", widths: [320, 640, 1280] },
  "logo-white": { file: "IMG-20261123-WA0135-removebg-preview.png", id: "1YXzbaz6yXTFei0yJLb5t0jlKPJJjCj8k", widths: [320] },
};
for (const [name, l] of Object.entries(LOGOS)) {
  const trimmed = await sharp(path.resolve("assets/brand/originals", l.file)).trim({ threshold: 1 }).png().toBuffer();
  const m = await sharp(trimmed).metadata();
  for (const w of l.widths) {
    if (w > m.width) continue;
    for (const [ext, enc] of [["png", (s) => s.png({ compressionLevel: 9 })], ["webp", (s) => s.webp({ quality: 90, alphaQuality: 100 })]]) {
      const n = `${name}-${w}.${ext}`;
      await enc(sharp(trimmed).resize({ width: w, kernel: "lanczos3" })).toFile(path.join(OUT, n));
      await add(n, { source: l.file, driveId: l.id, trimmedFrom: `${m.width}×${m.height} (after trim)` });
    }
  }
  // Native trimmed size, for the largest uses.
  const n = `${name}.png`;
  await sharp(trimmed).png({ compressionLevel: 9 }).toFile(path.join(OUT, n));
  await add(n, { source: l.file, driveId: l.id, size: `${m.width}×${m.height}` });
}
await writeFile(path.join(OUT, "manifest.json"), JSON.stringify(manifest, null, 2) + "\n");
console.log((await readdir(OUT)).length, "files");
