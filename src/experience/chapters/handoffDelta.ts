/**
 * On-device handoff Δ (performance HUD only): compares the first live frame with the anchor still
 * exactly as the browser shows it (object-fit: cover, at the canvas's drawing-buffer size).
 * Same metrics as the M1 handoff test: raw mean |Δ| per channel, and a perceptual |Δ| after a
 * 1.5 px blur (sub-pixel resampling differences are invisible), both in 0–255 units.
 */
export function measureHandoff(
  img: HTMLImageElement,
  frame: { data: Uint8Array; width: number; height: number },
) {
  const { width: W, height: H, data } = frame;
  const c = document.createElement("canvas");
  c.width = W;
  c.height = H;
  const g = c.getContext("2d", { willReadFrequently: true })!;
  const k = Math.max(W / img.naturalWidth, H / img.naturalHeight);
  const dw = img.naturalWidth * k;
  const dh = img.naturalHeight * k;
  g.drawImage(img, (W - dw) / 2, (H - dh) / 2, dw, dh);
  const still = g.getImageData(0, 0, W, H).data;
  // Live frame rows are bottom-up.
  const live = new Uint8ClampedArray(W * H * 4);
  for (let y = 0; y < H; y++)
    live.set(data.subarray((H - 1 - y) * W * 4, (H - y) * W * 4), y * W * 4);
  let raw = 0;
  for (let i = 0; i < live.length; i += 4) {
    raw +=
      Math.abs(live[i]! - still[i]!) +
      Math.abs(live[i + 1]! - still[i + 1]!) +
      Math.abs(live[i + 2]! - still[i + 2]!);
  }
  const blur = (src: Uint8ClampedArray | Uint8Array) => {
    const b = document.createElement("canvas");
    b.width = W;
    b.height = H;
    const bg = b.getContext("2d", { willReadFrequently: true })!;
    bg.putImageData(new ImageData(new Uint8ClampedArray(src), W, H), 0, 0);
    const o = document.createElement("canvas");
    o.width = W;
    o.height = H;
    const og = o.getContext("2d", { willReadFrequently: true })!;
    og.filter = "blur(1.5px)";
    og.drawImage(b, 0, 0);
    return og.getImageData(0, 0, W, H).data;
  };
  const bl = blur(live);
  const bs = blur(still);
  let per = 0;
  for (let i = 0; i < bl.length; i += 4) {
    per +=
      Math.abs(bl[i]! - bs[i]!) +
      Math.abs(bl[i + 1]! - bs[i + 1]!) +
      Math.abs(bl[i + 2]! - bs[i + 2]!);
  }
  const n = W * H * 3;
  return {
    raw: +(raw / n).toFixed(2),
    perceptual: +(per / n).toFixed(2),
    size: `${W}×${H}`,
    still: img.currentSrc.split("/").pop(),
  };
}
