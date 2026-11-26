/**
 * Camera framing shared by the live scene AND the anchor renderer, so both produce the same
 * picture. Pure functions only (unit-tested).
 */
import type { Orientation } from "./cascade/geometry";

export interface CameraKey {
  position: [number, number, number];
  target: [number, number, number];
}

export interface FramingPreset {
  /** Aspect ratio the anchor still is rendered at. */
  refAspect: number;
  /** Vertical field of view (degrees) at the reference aspect. */
  fov: number;
  /** Anchor pixel size (master). */
  anchorSize: [number, number];
  /**
   * Key (champagne rim) light direction. Chosen so the anisotropic highlight band crosses the
   * loose, waving section of the cascade rather than flooding every fibre.
   */
  keyDir: [number, number, number];
  /** Softbox "pool": world centre xyz + radius. Sheen is strongest inside it, so the hair body
   *  stays deep black and the champagne highlight has a place, like a lit campaign set. */
  keyPool: [number, number, number, number];
  /** Scroll keyframes: 0 = hero (anchor pose) … last = finale. */
  keys: CameraKey[];
}

export const FRAMING: Record<Orientation, FramingPreset> = {
  landscape: {
    refAspect: 16 / 9,
    fov: 30,
    anchorSize: [2560, 1440],
    keyDir: [0.78, 0.63, -0.25],
    keyPool: [1.35, -0.7, 0, 1.0],
    keys: [
      { position: [0, 0, 6.2], target: [0, 0, 0] }, // hero / anchor
      { position: [-1.35, 1.05, 3.9], target: [-1.55, 0.95, -0.2] }, // into the woven braids
      { position: [0.75, -0.75, 3.35], target: [0.95, -1.35, -0.2] }, // where they unbraid
      { position: [2.6, -0.35, 4.4], target: [0.35, -0.9, -0.4] }, // showcase, side light
      { position: [0, 0.25, 9.2], target: [0, -0.2, 0] }, // finale, pull back
    ],
  },
  portrait: {
    refAspect: 9 / 16,
    fov: 42,
    anchorSize: [1440, 2560],
    keyDir: [0.95, 0.32, -0.22],
    keyPool: [0.45, 0.05, 0, 0.9],
    keys: [
      { position: [0, 0, 6.4], target: [0, 0, 0] },
      { position: [0.55, 1.6, 3.6], target: [0.65, 1.35, -0.2] },
      { position: [-0.15, -0.85, 3.2], target: [-0.1, -1.4, -0.2] },
      { position: [1.6, -0.6, 4.1], target: [0.1, -1.0, -0.4] },
      { position: [0, 0.2, 9.4], target: [0, -0.2, 0] },
    ],
  },
};

export function orientationFor(width: number, height: number): Orientation {
  return width / height < 1 ? "portrait" : "landscape";
}

/**
 * Vertical FOV that reproduces CSS `object-fit: cover; object-position: center` of an image
 * rendered at `refAspect` with vertical FOV `refFov`, when shown in a viewport of `aspect`.
 *  - Viewport wider than the image: cover crops top/bottom → keep horizontal FOV.
 *  - Viewport taller than the image: cover crops left/right → keep vertical FOV.
 */
export function coverFov(aspect: number, refAspect: number, refFovDeg: number): number {
  if (aspect <= refAspect) return refFovDeg;
  const half = (refFovDeg * Math.PI) / 360;
  const tanV = (Math.tan(half) * refAspect) / aspect;
  return (Math.atan(tanV) * 360) / Math.PI;
}

/** Catmull-Rom interpolation through scroll keyframes, progress 0..1. */
export function cameraAt(keys: CameraKey[], progress: number): CameraKey {
  const p = Math.min(1, Math.max(0, progress)) * (keys.length - 1);
  const i = Math.min(keys.length - 2, Math.floor(p));
  const u = p - i;
  const k = (j: number) => keys[Math.min(keys.length - 1, Math.max(0, j))]!;
  const cr = (a: number, b: number, c: number, d: number) =>
    0.5 *
    (2 * b +
      (-a + c) * u +
      (2 * a - 5 * b + 4 * c - d) * u * u +
      (-a + 3 * b - 3 * c + d) * u * u * u);
  const lerp3 = (sel: (key: CameraKey) => [number, number, number]): [number, number, number] => [
    cr(sel(k(i - 1))[0], sel(k(i))[0], sel(k(i + 1))[0], sel(k(i + 2))[0]),
    cr(sel(k(i - 1))[1], sel(k(i))[1], sel(k(i + 1))[1], sel(k(i + 2))[1]),
    cr(sel(k(i - 1))[2], sel(k(i))[2], sel(k(i + 1))[2], sel(k(i + 2))[2]),
  ];
  return { position: lerp3((c) => c.position), target: lerp3((c) => c.target) };
}
