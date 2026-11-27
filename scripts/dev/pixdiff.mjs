// Pixel comparison of two frame folders; masks: chapter index (right strip) and preview banner (bottom).
import sharp from "sharp";
import { readdir, writeFile } from "node:fs/promises";
const [, , a, b, out] = process.argv;
const res = [];
for (const f of (await readdir(a)).filter((x) => x.endsWith(".png")).sort()) {
  const A = await sharp(`${a}/${f}`).raw().toBuffer({ resolveWithObject: true });
  const B = await sharp(`${b}/${f}`).raw().toBuffer();
  const { width: w, height: h, channels: c } = A.info;
  const mobile = f.startsWith("mobile");
  let diff = 0, max = 0, masked = 0;
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    const inIndex = !mobile && x > w - 80 && y > h * 0.25 && y < h * 0.75;
    const inBanner = y > h - (mobile ? 44 : 28);
    if (inIndex || inBanner) { masked++; continue; }
    const i = (y * w + x) * c;
    const d = Math.max(Math.abs(A.data[i] - B[i]), Math.abs(A.data[i + 1] - B[i + 1]), Math.abs(A.data[i + 2] - B[i + 2]));
    if (d > 0) diff++;
    if (d > max) max = d;
  }
  res.push({ frame: f, differingPixels: diff, maxChannelDelta: max, maskedPixels: masked });
}
console.log(res.map((r) => `${r.frame} diff=${r.differingPixels} max=${r.maxChannelDelta}`).join("\n"));
if (out) await writeFile(out, JSON.stringify(res, null, 2) + "\n");
