import { describe, expect, it } from "vitest";
import { FRAMING, cameraAt, coverFov, orientationFor } from "@/experience/framing";

const deg = (r: number) => (r * 180) / Math.PI;
const rad = (d: number) => (d * Math.PI) / 180;

describe("cover framing (anchor still ↔ live canvas alignment)", () => {
  it("keeps the vertical FOV when the viewport is narrower than the anchor (sides cropped)", () => {
    expect(coverFov(1.6, 16 / 9, 30)).toBe(30);
    expect(coverFov(9 / 19.5, 9 / 16, 42)).toBe(42);
  });

  it("keeps the horizontal FOV when the viewport is wider (top/bottom cropped)", () => {
    const ref = 16 / 9;
    const wide = 21 / 9;
    const v = coverFov(wide, ref, 30);
    const hRef = 2 * Math.atan(Math.tan(rad(15)) * ref);
    const hWide = 2 * Math.atan(Math.tan(rad(v / 2)) * wide);
    expect(deg(hWide)).toBeCloseTo(deg(hRef), 6);
    expect(v).toBeLessThan(30);
  });

  it("picks the portrait anchor for any viewport taller than wide", () => {
    expect(orientationFor(390, 844)).toBe("portrait");
    expect(orientationFor(1440, 900)).toBe("landscape");
    expect(orientationFor(1000, 1000)).toBe("landscape");
  });

  it("starts the scroll camera exactly at the anchor pose", () => {
    for (const o of ["landscape", "portrait"] as const) {
      const k = FRAMING[o].keys[0]!;
      const c = cameraAt(FRAMING[o].keys, 0);
      c.position.forEach((v, i) => expect(v).toBeCloseTo(k.position[i]!, 9));
      c.target.forEach((v, i) => expect(v).toBeCloseTo(k.target[i]!, 9));
    }
  });

  it("passes through every keyframe and clamps out-of-range progress", () => {
    const keys = FRAMING.landscape.keys;
    keys.forEach((k, i) => {
      const c = cameraAt(keys, i / (keys.length - 1));
      c.position.forEach((v, j) => expect(v).toBeCloseTo(k.position[j]!, 6));
    });
    expect(cameraAt(keys, 2)).toEqual(cameraAt(keys, 1));
    expect(cameraAt(keys, -1)).toEqual(cameraAt(keys, 0));
  });
});
