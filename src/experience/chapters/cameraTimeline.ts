/**
 * One continuous camera for Chapters 1–3 (M2 breakdown, "Camera timeline").
 *
 * The camera is a single function of scroll position in viewport heights (vh). Chapters own
 * their type, page and photo, never the camera, so nothing can reset or repeat at a chapter
 * boundary.
 *
 *   hold K0 → (start from rest) K0→K1 → pass through K1 → drift K1→K1b → pass through K1b →
 *   K1b→K2 (come to rest) → hold K2
 *
 * Interpolation is a piecewise cubic Hermite with non-uniform Catmull-Rom tangents: position
 * and speed are continuous everywhere; speed is zero only where the camera starts from or comes
 * to rest. K0 is read from the locked anchor framing and is never redefined here.
 */
import { FRAMING, type CameraKey } from "../framing";
import type { Orientation } from "../cascade/geometry";

type V3 = [number, number, number];

export interface ChapterLayout {
  /** Chapter extents in vh. */
  ch1: [number, number];
  ch2: [number, number];
  ch3: [number, number];
  /** Camera stops in vh: K0 (end of hold), K1, K1b, K2 (start of hold). */
  stops: [number, number, number, number];
}

export const CHAPTER_LAYOUT: Record<Orientation, ChapterLayout> = {
  landscape: { ch1: [0, 100], ch2: [100, 250], ch3: [250, 500], stops: [50, 150, 250, 325] },
  portrait: { ch1: [0, 100], ch2: [100, 230], ch3: [230, 450], stops: [50, 130, 230, 290] },
};

/**
 * New camera poses for Chapters 2–3 (isolated change I1). K0 is the locked anchor pose.
 * K1: close on the woven braids, braids in the right 60% (top 60% on mobile) so the text
 *     column stays dark. K1b: end of a slow lateral drift. K2: the loose ends, with the hair's
 *     outer edge near the middle so the ivory page can open beside it.
 */
export const CHAPTER_KEYS: Record<Orientation, { K1: CameraKey; K1b: CameraKey; K2: CameraKey }> = {
  landscape: {
    K1: { position: [-2.0, 1.1, 4.3], target: [-1.4, 0.95, -0.2] },
    K1b: { position: [-1.55, 0.78, 4.3], target: [-0.95, 0.62, -0.2] },
    // The cascade's lit upper boundary, rolled 25° so it falls near-vertically: the page meets
    // lit strands along the full height of the screen (no unlit tips on screen).
    K2: { position: [2.1, -0.1, 4.2], target: [2.9, -0.35, -0.2], up: [-0.42, 0.91, 0] },
  },
  portrait: {
    K1: { position: [0.6, 1.05, 4.0], target: [0.62, 1.05, -0.2] },
    K1b: { position: [0.42, 0.8, 3.9], target: [0.5, 0.75, -0.2] },
    K2: { position: [0.45, -0.7, 4.8], target: [0.5, -1.6, -0.2] },
  },
};

/**
 * Chapters 4–7 continue the same timeline (M3). Poses chosen from rendered candidates:
 * K3 FUTURA (hair beside dark space for the name), K4 the Collection backdrop (drifting slightly
 * per product), K5 the Lookbook edge (the page meets the hair again), K6 the final pull-back.
 */
export const STORY_KEYS: Record<Orientation, { K3: CameraKey; K4: CameraKey; K5: CameraKey; K6: CameraKey; drift: V3 }> = {
  landscape: {
    K3: { position: [1.2, -0.9, 5.4], target: [0.2, -0.9, -0.2] },
    K4: { position: [-0.6, -1.0, 4.6], target: [0.6, -1.1, -0.2], up: [-0.3, 0.95, 0] },
    K5: { position: [0.4, 0.6, 4.4], target: [1.4, 0.2, -0.2], up: [-0.42, 0.91, 0] },
    K6: { position: [-0.6, 0.2, 8.0], target: [0.4, -0.2, 0] },
    drift: [0.2, -0.05, 0],
  },
  portrait: {
    K3: { position: [1.6, -0.6, 4.1], target: [0.1, -1.0, -0.4] },
    K4: { position: [0.2, 0.4, 5.0], target: [0.3, -0.3, -0.2] },
    K5: { position: [-0.4, -0.9, 4.4], target: [0.0, -1.5, -0.2] },
    K6: { position: [0.3, 0.0, 7.6], target: [0.2, -0.5, 0] },
    drift: [0.06, -0.12, 0],
  },
};

export interface Stop {
  at: number;
  key: CameraKey;
  /** The camera comes to rest here (zero speed), as at the ends of the timeline. */
  rest?: boolean;
}

/** Chapters 1–3 stops, exactly as approved (K0 hold → K1 → K1b → K2 at rest). */
export function chapterStops(o: Orientation): Stop[] {
  const k = CHAPTER_KEYS[o];
  const s = CHAPTER_LAYOUT[o].stops;
  return [
    { at: s[0], key: FRAMING[o].keys[0]!, rest: true },
    { at: s[1], key: k.K1 },
    { at: s[2], key: k.K1b },
    { at: s[3], key: k.K2, rest: true },
  ];
}

/** Chapters 4–7 stops, appended after Chapter 3. Positions come from the story layout. */
export function storyStops(
  o: Orientation,
  S: { ch4Cover: [number, number]; ch4Retreat: [number, number]; ch5: [number, number]; ch6Arrive: [number, number]; ch6Close: [number, number]; ch7Lift: [number, number]; ch7Line: number },
  productCentres: number[],
): Stop[] {
  const k = CHAPTER_KEYS[o];
  const K = STORY_KEYS[o];
  const off = (key: CameraKey, f: number): CameraKey => ({
    position: [key.position[0] + K.drift[0] * f, key.position[1] + K.drift[1] * f, key.position[2] + K.drift[2] * f],
    target: [key.target[0] + K.drift[0] * f, key.target[1] + K.drift[1] * f, key.target[2] + K.drift[2] * f],
    ...(key.up ? { up: key.up } : {}),
  });
  const n = productCentres.length;
  const mid = (n - 1) / 2;
  return [
    // K2 holds through the end of Chapter 3; the move to K3 happens under the covering page.
    { at: CHAPTER_LAYOUT[o].ch3[1], key: k.K2, rest: true },
    { at: S.ch4Cover[1] - 15, key: K.K3, rest: true },
    { at: S.ch4Retreat[1], key: K.K3, rest: true },
    ...productCentres.map((at, i) => ({ at, key: off(K.K4, i - mid), rest: i === 0 || i === n - 1 })),
    { at: S.ch6Arrive[0], key: K.K5, rest: true },
    { at: S.ch7Lift[0], key: K.K5, rest: true },
    { at: S.ch7Line, key: K.K6, rest: true },
  ];
}

/**
 * Returns the camera pose for a scroll position in vh. With `extra` stops (Chapters 4–7) the
 * timeline continues after K2; because K2 is a rest stop, every Chapters 1–3 segment is the
 * same curve as before (its end tangents do not change).
 */
export function cameraTimeline(o: Orientation, extra: Stop[] = []): (vh: number) => CameraKey {
  const stops = [...chapterStops(o), ...extra];
  const n = stops.length;
  // Tangents (units per vh) for position and target, zero at the rest points.
  const tangent = (sel: (k: CameraKey) => V3, i: number): V3 => {
    if (i === 0 || i === n - 1 || stops[i]!.rest) return [0, 0, 0];
    const a = stops[i - 1]!;
    const b = stops[i + 1]!;
    const pa = sel(a.key);
    const pb = sel(b.key);
    const dt = b.at - a.at;
    return [(pb[0] - pa[0]) / dt, (pb[1] - pa[1]) / dt, (pb[2] - pa[2]) / dt];
  };
  const WORLD_UP: V3 = [0, 1, 0];
  const upOf = (k: CameraKey): V3 => k.up ?? WORLD_UP;
  const rolls = stops.some((s) => s.key.up);
  const posT = stops.map((_, i) => tangent((k) => k.position, i));
  const tgtT = stops.map((_, i) => tangent((k) => k.target, i));
  const upT = stops.map((_, i) => tangent(upOf, i));

  const hermite = (p0: V3, m0: V3, p1: V3, m1: V3, h: number, u: number): V3 => {
    const u2 = u * u;
    const u3 = u2 * u;
    const h00 = 2 * u3 - 3 * u2 + 1;
    const h10 = u3 - 2 * u2 + u;
    const h01 = -2 * u3 + 3 * u2;
    const h11 = u3 - u2;
    return [0, 1, 2].map(
      (j) => h00 * p0[j]! + h10 * h * m0[j]! + h01 * p1[j]! + h11 * h * m1[j]!,
    ) as V3;
  };

  return (vh: number) => {
    if (vh <= stops[0]!.at) return stops[0]!.key;
    if (vh >= stops[n - 1]!.at) return stops[n - 1]!.key;
    let i = 0;
    while (i < n - 2 && vh > stops[i + 1]!.at) i++;
    const a = stops[i]!;
    const b = stops[i + 1]!;
    const h = b.at - a.at;
    const u = (vh - a.at) / h;
    const key: CameraKey = {
      position: hermite(a.key.position, posT[i]!, b.key.position, posT[i + 1]!, h, u),
      target: hermite(a.key.target, tgtT[i]!, b.key.target, tgtT[i + 1]!, h, u),
    };
    if (rolls) {
      const up = hermite(upOf(a.key), upT[i]!, upOf(b.key), upT[i + 1]!, h, u);
      const n = Math.hypot(...up) || 1;
      key.up = [up[0] / n, up[1] / n, up[2] / n];
    }
    return key;
  };
}

/** Chapter-relative progress helpers shared by the live and static drivers. */
export function chapterProgress(o: Orientation, vh: number) {
  const L = CHAPTER_LAYOUT[o];
  const rel = (r: [number, number]) => Math.min(1, Math.max(0, (vh - r[0]) / (r[1] - r[0])));
  return { ch1: rel(L.ch1), ch2: rel(L.ch2), ch3: rel(L.ch3) };
}

/** Chapter 3 sub-timeline, as fractions of the chapter (same on desktop and mobile). */
export const CH3 = {
  paperIn: [0.3, 0.6] as [number, number],
  portrait: [0.44, 0.68] as [number, number],
  line: 0.6,
  holdEnd: 0.84,
  away: [0.84, 1] as [number, number],
};

/** Chapter 2 line reveal points, as fractions of the chapter. */
export const CH2_LINES = [1 / 3, 0.567, 0.8] as const;
