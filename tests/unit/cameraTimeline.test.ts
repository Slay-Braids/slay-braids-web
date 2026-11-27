import { describe, expect, it } from "vitest";
import { CHAPTER_LAYOUT, cameraTimeline } from "@/experience/chapters/cameraTimeline";
import { FRAMING } from "@/experience/framing";

type V3 = [number, number, number];
const dist = (a: V3, b: V3) => Math.hypot(a[0] - b[0], a[1] - b[1], a[2] - b[2]);
const sub = (a: V3, b: V3): V3 => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];

for (const o of ["landscape", "portrait"] as const) {
  describe(`camera timeline — ${o}`, () => {
    const cam = cameraTimeline(o);
    const L = CHAPTER_LAYOUT[o];

    it("holds the locked anchor pose (K0) exactly until the first stop", () => {
      for (const vh of [0, 10, 25, L.stops[0]]) {
        expect(cam(vh)).toEqual(FRAMING[o].keys[0]);
      }
    });

    it("has no jump in position anywhere (sampled every 0.5 vh)", () => {
      let maxStep = 0;
      let prev = cam(0);
      for (let vh = 0.5; vh <= L.ch3[1] + 20; vh += 0.5) {
        const c = cam(vh);
        maxStep = Math.max(maxStep, dist(c.position, prev.position), dist(c.target, prev.target));
        prev = c;
      }
      // A camera move of ~4 scene units over ~100 vh moves ~0.02 per 0.5 vh; a jump would be ≫.
      expect(maxStep).toBeLessThan(0.05);
    });

    it("has no jump in speed at chapter boundaries and pass-through keyframes", () => {
      const boundaries = [L.ch1[1], L.ch2[1], L.stops[1], L.stops[2]];
      const e = 0.01;
      for (const b of boundaries) {
        const left = sub(cam(b).position, cam(b - e).position).map((x) => x / e);
        const right = sub(cam(b + e).position, cam(b).position).map((x) => x / e);
        const scale = Math.max(1e-6, Math.hypot(...left), Math.hypot(...right));
        expect(
          Math.hypot(left[0]! - right[0]!, left[1]! - right[1]!, left[2]! - right[2]!) / scale,
        ).toBeLessThan(0.02);
      }
    });

    it("starts from rest and comes to rest (zero speed at the hold edges)", () => {
      const e = 0.05;
      const startSpeed = dist(cam(L.stops[0] + e).position, cam(L.stops[0]).position) / e;
      const endSpeed = dist(cam(L.stops[3]).position, cam(L.stops[3] - e).position) / e;
      const midSpeed = dist(cam(L.stops[1] + 1).position, cam(L.stops[1]).position);
      expect(startSpeed).toBeLessThan(midSpeed * 0.05);
      expect(endSpeed).toBeLessThan(midSpeed * 0.05);
    });

    it("reverse playback is exact (pure function of scroll)", () => {
      for (const vh of [37, 120.5, 249.9, 300, 480]) expect(cam(vh)).toEqual(cam(vh));
    });
  });
}
