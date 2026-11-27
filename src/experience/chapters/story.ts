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
// Chapter 5 has one step per look (original brand footage, src/content/media.ts).
import { lookClips as products } from "../../content/media";

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
  // Chapter 4 holds FUTURA's story (title, intro, six features), so it is the longest chapter.
  if (o === "landscape") {
    const ch5Start = end3 + 300;
    const ch5End = ch5Start + 50 + 50 * N;
    const ch6End = ch5End + 220;
    return {
      ch4: [end3, ch5Start],
      ch5: [ch5Start, ch5End],
      ch6: [ch5End, ch6End],
      ch7: [ch6End, ch6End + 200],
      ch4Cover: [end3, end3 + 60],
      ch4Lift: [end3 + 60, end3 + 110],
      ch4Retreat: [end3 + 125, end3 + 165],
      ch5Intro: 25,
      ch5Step: 50,
      ch6Arrive: [ch5End, ch5End + 50],
      ch6Close: [ch5End + 80, ch5End + 120],
      ch7Lift: [ch6End, ch6End + 60],
      ch7Line: ch6End + 80,
    };
  }
  const ch5Start = end3 + 270;
  const ch5End = ch5Start + 40 + 80 * N;
  const ch6End = ch5End + 190;
  return {
    ch4: [end3, ch5Start],
    ch5: [ch5Start, ch5End],
    ch6: [ch5End, ch6End],
    ch7: [ch6End, ch6End + 180],
    ch4Cover: [end3, end3 + 50],
    ch4Lift: [end3 + 50, end3 + 95],
    ch4Retreat: [end3 + 110, end3 + 145],
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
const len = (r: R) => r[1] - r[0];
export const SECTION_VH = {
  landscape: {
    ch4: len(STORY.landscape.ch4),
    ch5: len(STORY.landscape.ch5),
    ch6: len(STORY.landscape.ch6),
    ch7: len(STORY.landscape.ch7),
  },
  portrait: {
    ch4: len(STORY.portrait.ch4),
    ch5: len(STORY.portrait.ch5),
    ch6: len(STORY.portrait.ch6),
    ch7: len(STORY.portrait.ch7),
  },
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
  // Chapter 4: full cover → the page lifts with a straight edge and rests beside the FUTURA
  // title (at K3 the hair reaches the screen's far side, so there is no hair edge to meet) →
  // it draws back off the screen.
  if (vh < S.ch4Lift[0]) return { guide: "ch4", open: 1, away: 1, straighten: 1, full: true };
  if (vh < S.ch4Retreat[0]) {
    const away = 1 - ease(range(vh, S.ch4Lift));
    return { guide: "ch4", open: 1, away, straighten: 1, full: away >= 0.9995 };
  }
  if (vh < S.ch4Retreat[1]) {
    const open = 1 - ease(range(vh, S.ch4Retreat));
    return open > 0.0005 ? { guide: "ch4", open, away: 0, straighten: 1, full: false } : null;
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
  // Strictly after a chapter's first position, as the M2 index did (Chapter 2 at 100 vh is still 1).
  for (let k = 1; k < starts.length; k++) if (vh > starts[k]!) i = k;
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
  const out = 1 - smooth(range(vh, [S.ch4[1] - 25, S.ch4[1] + 5]));
  const title = smooth(range(vh, [S.ch4Lift[1] - 10, S.ch4Lift[1] + 30])) * out;
  const line = smooth(range(vh, [S.ch4Retreat[0] + 15, S.ch4Retreat[0] + 45])) * out;
  // The six FUTURA features arrive after the intro (CSS staggers them from this one value).
  const features = range(vh, [S.ch4Retreat[0] + 55, S.ch4Retreat[0] + 95]) * out;
  return { printed, title, line, features, visible: printed > 0.001 || title > 0.001 || line > 0.001 };
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
  // The spread is printed on the page: in Chapter 7 it rides the page off the screen.
  return { intro: intro * (1 - spread), spread, visible: intro > 0.001 && vh < S.ch7Lift[1] };
}

/** Ch 7 DOM: the promise returns. */
export function ch7State(o: Orientation, vh: number) {
  const S = STORY[o];
  const line = smooth(range(vh, [S.ch7Line - 20, S.ch7Line + 20]));
  return { line, visible: line > 0.001 };
}

/**
 * Where the chapter links land in the live experience (vh): each chapter at its settled state,
 * not at its first frame (Chapter 4 would otherwise open on the covering page).
 */
export function landingVh(o: Orientation, id: string): number | undefined {
  const S = STORY[o];
  switch (id) {
    case "ch4":
      return S.ch4[1] - 35;
    case "ch5":
      return productVh(o, 0);
    case "ch6":
      return S.ch6Close[1] + 25;
    case "ch7":
      return S.ch7Line + 25;
    default:
      return undefined;
  }
}

/** Whole story length in vh (Chapters 1–7), i.e. where the enquiry section begins. */
export const STORY_END: Record<Orientation, number> = {
  landscape: STORY.landscape.ch7[1],
  portrait: STORY.portrait.ch7[1],
};

/** Chapter (and Chapter 5 product) boundaries in vh, in reading order, to the end of Chapter 7. */
export function boundaries(o: Orientation): number[] {
  const L = CHAPTER_LAYOUT[o];
  const S = STORY[o];
  // Chapter 5 is split at each product step, so a rotation keeps the same product on screen.
  const steps = Array.from({ length: N }, (_, i) => S.ch5[0] + S.ch5Intro + i * S.ch5Step);
  return [0, L.ch2[0], L.ch3[0], S.ch4[0], S.ch5[0], ...steps, S.ch6[0], S.ch7[0], S.ch7[1]].filter(
    (v, i, a) => i === 0 || v > a[i - 1]!,
  );
}

/**
 * The same place in the story after a rotation: the position keeps its chapter and its
 * progress through that chapter (the two orientations have different chapter lengths).
 * Past Chapter 7 (enquiry, footer) the distance from the end is kept.
 */
export function mapVh(from: Orientation, to: Orientation, vh: number): number {
  const a = boundaries(from);
  const b = boundaries(to);
  if (vh >= a.at(-1)!) return b.at(-1)! + (vh - a.at(-1)!);
  for (let i = 0; i < a.length - 1; i++) {
    if (vh < a[i + 1]!) return b[i]! + ((vh - a[i]!) / (a[i + 1]! - a[i]!)) * (b[i + 1]! - b[i]!);
  }
  return vh;
}

/**
 * Production identity v3 ("bright"): the world behind the braids changes colour, always while a
 * page covers the screen (or as type fades), so the change is never seen happening on the hair.
 *   Ch1–3 white · Ch4 SLAY red · Ch5–6 white · Ch7 black. Pages: Ch3/Ch4 black, Ch6/Ch7 red.
 */
export type World = "white" | "red" | "black";
export const WORLD_RGB: Record<World, [number, number, number]> = {
  white: [1, 1, 1],
  red: [198 / 255, 13 / 255, 19 / 255],
  black: [10 / 255, 10 / 255, 10 / 255],
};
export const PAGE_COLOR: Record<PageState["guide"], World> = { ch3: "black", ch4: "black", ch6: "red" };

/** Which world (and blend towards the next) at this position. */
export function worldAt(o: Orientation, vh: number): { rgb: [number, number, number]; name: World } {
  const S = STORY[o];
  const L = CHAPTER_LAYOUT[o];
  const mix = (a: World, b: World, t: number) => {
    const A = WORLD_RGB[a];
    const B = WORLD_RGB[b];
    const k = smooth(t);
    return { rgb: [0, 1, 2].map((i) => A[i]! + (B[i]! - A[i]!) * k) as [number, number, number], name: k < 0.5 ? a : b };
  };
  // Under the full black cover that ends Chapter 3: white → red.
  if (vh < L.ch3[1] + 10) return { rgb: WORLD_RGB.white, name: "white" };
  // Chapter 4 ends with its type fading: red → white, before the looks.
  if (vh < S.ch4[1] - 25) return { rgb: WORLD_RGB.red, name: "red" };
  if (vh < S.ch4[1] + 5) return mix("red", "white", range(vh, [S.ch4[1] - 25, S.ch4[1] + 5]));
  // Under the full red cover of the lookbook spread: white → black for the finale.
  const swap = (S.ch6Close[1] + S.ch7Lift[0]) / 2;
  if (vh < swap) return { rgb: WORLD_RGB.white, name: "white" };
  return { rgb: WORLD_RGB.black, name: "black" };
}
