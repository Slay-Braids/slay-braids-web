/**
 * The whole story, Chapters 1–7, as functions of one scroll position (vh). Chapters 1–3 keep
 * their approved layout and states (cameraTimeline.ts, driver.ts); this module continues them.
 *
 *   Ch 4 FUTURA       — the page that closed over the hair draws back, revealing FUTURA in pearl
 *   Ch 5 Collection   — the range (desktop: pinned showcase; mobile: stacked spreads)
 *   Ch 6 Lookbook     — the page meets the hair again, then becomes the spread
 *   Ch 7 The promise  — the last lift, the camera pulls back, the positioning line returns
 *
 * Pure functions, no DOM, no three.js: shared by the live page, the static spreads and tests.
 */
import type { Orientation } from "../cascade/geometry";
import { CHAPTER_LAYOUT, CH3 } from "./cameraTimeline";
import { products } from "../../content/products";

type R = [number, number];

export interface StoryLayout {
  ch4: R;
  ch5: R;
  ch6: R;
  ch7: R;
  /** Ch 4: page fully covering, the lift (edge forms on the hair), the page drawing back. */
  ch4Cover: R;
  ch4Lift: R;
  ch4Retreat: R;
  /** Ch 5: where each product's step starts (desktop: pinned steps; mobile: spreads). */
  ch5Intro: number;
  ch5Step: number;
  /** Ch 6: page arrives on the hair, rests, closes to full cover; the spread follows. */
  ch6Arrive: R;
  ch6Close: R;
  /** Ch 7: the last lift (straight edge), then the promise. */
  ch7Lift: R;
  ch7Line: number;
}

const N = Math.max(1, products.length);

function build(o: Orientation): StoryLayout {
  const end3 = CHAPTER_LAYOUT[o].ch3[1];
  if (o === "landscape") {
    const ch5Start = end3 + 220;
    const ch5End = ch5Start + 50 + 50 * N;
    const ch6End = ch5End + 220;
    return {
      ch4: [end3, ch5Start],
      ch5: [ch5Start, ch5End],
      ch6: [ch5End, ch6End],
      ch7: [ch6End, ch6End + 200],
      ch4Cover: [end3, end3 + 60],
      ch4Lift: [end3 + 60, end3 + 120],
      ch4Retreat: [end3 + 140, end3 + 190],
      ch5Intro: 25,
      ch5Step: 50,
      ch6Arrive: [ch5End, ch5End + 50],
      ch6Close: [ch5End + 80, ch5End + 120],
      ch7Lift: [ch6End, ch6End + 60],
      ch7Line: ch6End + 80,
    };
  }
  const ch5Start = end3 + 190;
  const ch5End = ch5Start + 40 + 80 * N;
  const ch6End = ch5End + 190;
  return {
    ch4: [end3, ch5Start],
    ch5: [ch5Start, ch5End],
    ch6: [ch5End, ch6End],
    ch7: [ch6End, ch6End + 180],
    ch4Cover: [end3, end3 + 50],
    ch4Lift: [end3 + 50, end3 + 100],
    ch4Retreat: [end3 + 115, end3 + 160],
    ch5Intro: 40,
    ch5Step: 80,
    ch6Arrive: [ch5End, ch5End + 40],
    ch6Close: [ch5End + 65, ch5End + 100],
    ch7Lift: [ch6End, ch6End + 50],
    ch7Line: ch6End + 70,
  };
}

export const STORY: Record<Orientation, StoryLayout> = {
  landscape: build("landscape"),
  portrait: build("portrait"),
};

/** Section heights in vh, for the page markup (the sections are the scroll track). */
export const SECTION_VH = {
  landscape: { ch4: 220, ch5: 50 + 50 * N, ch6: 220, ch7: 200 },
  portrait: { ch4: 190, ch5: 40 + 80 * N, ch6: 190, ch7: 180 },
} as const;

export const clamp01 = (x: number) => Math.min(1, Math.max(0, x));
export const smooth = (x: number) => {
  const t = clamp01(x);
  return t * t * (3 - 2 * t);
};
const ease = (x: number) => {
  const t = clamp01(x);
  return t < 0.5 ? 4 * t * t * t : 1 - (-2 * t + 2) ** 3 / 2;
};
export const range = (x: number, [a, b]: R) => clamp01((x - a) / (b - a));

/** Which ivory-page edge is active, and where the page is. `null` = no page on screen. */
export interface PageState {
  /** The camera pose whose guide strand shapes the edge. */
  guide: "ch3" | "ch4" | "ch6";
  open: number;
  away: number;
  /** Forced edge straightening (0–1); undefined = derived from `away` as in Chapter 3. */
  straighten?: number;
  /** The page covers the whole screen (rendering may pause). */
  full: boolean;
}

/**
 * The page across the whole site. Before Chapter 4 this is exactly Chapter 3's state
 * (open/away from CH3), so Chapters 1–3 are unchanged.
 */
export function pageState(o: Orientation, vh: number): PageState | null {
  const L = CHAPTER_LAYOUT[o];
  const S = STORY[o];
  if (vh < S.ch4[0]) {
    const rel = clamp01((vh - L.ch3[0]) / (L.ch3[1] - L.ch3[0]));
    const open = ease(range(rel, CH3.paperIn));
    const away = ease(range(rel, CH3.away));
    if (open <= 0) return null;
    return { guide: "ch3", open, away, full: away >= 0.9995 };
  }
  // Chapter 4: full cover → the edge forms on the hair (away 1 → 0) → the page draws back.
  if (vh < S.ch4Lift[0]) return { guide: "ch4", open: 1, away: 1, full: true };
  if (vh < S.ch4Retreat[0]) {
    const away = 1 - ease(range(vh, S.ch4Lift));
    return { guide: "ch4", open: 1, away, full: away >= 0.9995 };
  }
  if (vh < S.ch4Retreat[1]) {
    const open = 1 - ease(range(vh, S.ch4Retreat));
    return open > 0.0005 ? { guide: "ch4", open, away: 0, full: false } : null;
  }
  // Chapter 6: the page meets the hair again, then closes to full cover for the spread.
  if (vh < S.ch6Arrive[0]) return null;
  if (vh < S.ch7Lift[0]) {
    const open = ease(range(vh, S.ch6Arrive));
    const away = ease(range(vh, S.ch6Close));
    if (open <= 0.0005) return null;
    return { guide: "ch6", open, away, full: away >= 0.9995 };
  }
  // Chapter 7: the last lift — a straight edge drawing back off the screen.
  if (vh < S.ch7Lift[1]) {
    const t = range(vh, S.ch7Lift);
    if (t < 0.4) return { guide: "ch6", open: 1, away: 1 - ease(t / 0.4), straighten: 1, full: t <= 0 };
    const open = 1 - ease((t - 0.4) / 0.6);
    return open > 0.0005 ? { guide: "ch6", open, away: 0, straighten: 1, full: false } : null;
  }
  return null;
}

/** Index (0–6) of the chapter at this scroll position, for the chapter index and menu. */
export function chapterIndex(o: Orientation, vh: number): number {
  const L = CHAPTER_LAYOUT[o];
  const S = STORY[o];
  const starts = [0, L.ch2[0], L.ch3[0], S.ch4[0], S.ch5[0], S.ch6[0], S.ch7[0]];
  let i = 0;
  for (let k = 0; k < starts.length; k++) if (vh >= starts[k]!) i = k;
  return i;
}

/** Chapter 5: the product whose step contains this position (desktop pin / mobile spread). */
export function productAt(o: Orientation, vh: number): number {
  const S = STORY[o];
  const t = (vh - S.ch5[0] - S.ch5Intro) / S.ch5Step;
  return Math.min(N - 1, Math.max(0, Math.floor(t)));
}

/** The scroll position (vh) that centres product i. */
export function productVh(o: Orientation, i: number): number {
  const S = STORY[o];
  return S.ch5[0] + S.ch5Intro + (i + 0.5) * S.ch5Step;
}

/** Light: 0 = the locked champagne key, 1 = pearl. Chapters 1–3 are always 0. */
export function pearlAt(o: Orientation, vh: number): number {
  const S = STORY[o];
  const up = smooth(range(vh, [S.ch4Lift[0], S.ch4Retreat[1]]));
  const down = smooth(range(vh, S.ch7Lift));
  return up * (1 - down);
}

/** Ch 4 DOM: the printed logo on the covering page, the FUTURA title on ink, its line. */
export function ch4State(o: Orientation, vh: number) {
  const S = STORY[o];
  const printed = vh >= S.ch4[0] ? 1 - smooth(range(vh, [S.ch4Lift[0] - 5, S.ch4Lift[0] + 25])) : 0;
  const title = smooth(range(vh, [S.ch4Lift[1] - 10, S.ch4Lift[1] + 30])) * (1 - smooth(range(vh, [S.ch4[1] - 30, S.ch4[1] + 5])));
  const line = smooth(range(vh, [S.ch4Retreat[0], S.ch4Retreat[0] + 30])) * (1 - smooth(range(vh, [S.ch4[1] - 30, S.ch4[1] + 5])));
  return { printed, title, line, visible: printed > 0.001 || title > 0.001 || line > 0.001 };
}

/** Ch 5 DOM (desktop pinned): entrance/exit of the showcase and the active product. */
export function ch5State(o: Orientation, vh: number) {
  const S = STORY[o];
  const enter = smooth(range(vh, [S.ch5[0] - 20, S.ch5[0] + 20]));
  const leave = smooth(range(vh, [S.ch5[1] - 25, S.ch5[1] + 5]));
  const shown = enter * (1 - leave);
  return { shown, product: productAt(o, vh), visible: shown > 0.001 };
}

/** Ch 6 DOM: the spread on the covering page. */
export function ch6State(o: Orientation, vh: number) {
  const S = STORY[o];
  const intro = smooth(range(vh, [S.ch6Arrive[0] + 15, S.ch6Arrive[1] + 10]));
  const spread = smooth(range(vh, [S.ch6Close[1] - 10, S.ch6Close[1] + 15]));
  const out = smooth(range(vh, [S.ch7Lift[0] - 5, S.ch7Lift[0] + 20]));
  return { intro: intro * (1 - spread), spread: spread * (1 - out), visible: intro > 0.001 && out < 0.999 };
}

/** Ch 7 DOM: the promise returns. */
export function ch7State(o: Orientation, vh: number) {
  const S = STORY[o];
  const line = smooth(range(vh, [S.ch7Line - 20, S.ch7Line + 20]));
  return { line, visible: line > 0.001 };
}
