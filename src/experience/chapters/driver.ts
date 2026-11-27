/**
 * DOM state for Chapters 1–3, driven by ONE scroll value (vh). In live mode that value is the
 * scene's damped scroll, read each frame after rendering, so type, page and camera share one
 * clock and can never drift apart. Small and three.js-free.
 */
import type { Orientation } from "../cascade/geometry";
import { CH2_LINES, CH3, CHAPTER_LAYOUT, chapterProgress } from "./cameraTimeline";
import { chapterIndex } from "./story";
import { StoryDriver } from "./storyDriver";

export const clamp01 = (x: number) => Math.min(1, Math.max(0, x));
export const smooth = (x: number) => {
  const t = clamp01(x);
  return t * t * (3 - 2 * t);
};
export const easeInOutCubic = (x: number) => {
  const t = clamp01(x);
  return t < 0.5 ? 4 * t * t * t : 1 - (-2 * t + 2) ** 3 / 2;
};
const range = (x: number, [a, b]: [number, number]) => clamp01((x - a) / (b - a));

export interface Ch3State {
  rel: number;
  open: number;
  away: number;
  portrait: number;
  line: boolean;
}

export function ch3State(o: Orientation, vh: number): Ch3State {
  const rel = chapterProgress(o, vh).ch3;
  return {
    rel,
    open: easeInOutCubic(range(rel, CH3.paperIn)),
    away: easeInOutCubic(range(rel, CH3.away)),
    portrait: smooth(range(rel, CH3.portrait)),
    line: rel >= CH3.line,
  };
}

export class ChapterDriver {
  private hero: HTMLElement | null;
  private heroScrim: HTMLElement | null;
  private cue: HTMLElement | null;
  private lines: HTMLElement[];
  private ch2Frame: HTMLElement | null;
  private ch3Frame: HTMLElement | null;
  private portrait: HTMLElement | null;
  private ch3Line: HTMLElement | null;
  private ticks: HTMLElement[];
  private header: HTMLElement | null;
  private lastScrollY = 0;
  private lastLine = -2;
  private lastTick = -1;
  /** M3: Chapters 4–7. */
  readonly story: StoryDriver;

  constructor(
    private readonly root: HTMLElement,
    public orientation: Orientation,
  ) {
    this.hero = root.querySelector("[data-hero]");
    this.heroScrim = root.querySelector("[data-hero-scrim]");
    this.cue = root.querySelector("[data-scroll-cue]");
    this.lines = [...root.querySelectorAll<HTMLElement>("[data-ch2-line]")];
    this.ch2Frame = root.querySelector("[data-ch2-frame]");
    this.ch3Frame = root.querySelector("[data-ch3-frame]");
    this.portrait = root.querySelector("[data-ch3-portrait]");
    this.ch3Line = root.querySelector("[data-ch3-line]");
    this.ticks = [...root.querySelectorAll<HTMLElement>("[data-chapter-tick]")];
    this.header = root.querySelector("[data-site-header]");
    this.story = new StoryDriver(root);
  }

  /** Apply the state for scroll position `vh`. Returns the Chapter 3 state for the page. */
  update(vh: number): Ch3State {
    const o = this.orientation;
    // Chapter 1: the headline drifts up 12 % and fades over 60–100 vh.
    if (this.hero) {
      const k = smooth((vh - 60) / 40);
      this.hero.style.opacity = String(1 - k);
      this.hero.style.transform = `translate3d(0, ${(-12 * k).toFixed(2)}%, 0)`;
    }
    // Its mobile scrim fades out while Chapter 2's bottom field fades in (70–130 vh).
    if (this.heroScrim) this.heroScrim.style.opacity = String(1 - smooth((vh - 60) / 60));
    // Header hides on scroll down, returns on scroll up (raw scroll direction).
    const y = window.scrollY;
    if (this.cue) this.cue.dataset.hidden = String(y > 24);
    if (this.header && Math.abs(y - this.lastScrollY) > 4) {
      this.header.dataset.hidden = String(y > this.lastScrollY && y > 120);
      this.lastScrollY = y;
    }
    // Chapter 2 frame: the dark text field settles in as the camera reaches K1 and lifts as it
    // leaves for K2; the copy fades in just after the chapter starts and out as it ends.
    const L = CHAPTER_LAYOUT[o];
    const [c2a, c2b] = L.ch2;
    const field = smooth((vh - (c2a - 30)) / 60) * (1 - smooth((vh - c2b) / 50));
    const copy = smooth((vh - (c2a + 5)) / 35) * (1 - smooth((vh - (c2b - 5)) / 30));
    if (this.ch2Frame) {
      this.ch2Frame.style.setProperty("--ch2-field", field.toFixed(3));
      this.ch2Frame.style.setProperty("--ch2-copy", copy.toFixed(3));
      this.ch2Frame.dataset.visible = String(field > 0.001 || copy > 0.001);
    }
    // Chapter 2: line reveals at fixed points; earlier lines dim.
    const p2 = chapterProgress(o, vh).ch2;
    let active = -1;
    CH2_LINES.forEach((at, i) => {
      if (p2 >= at) active = i;
    });
    if (active !== this.lastLine) {
      this.lines.forEach((l, i) => {
        l.dataset.state = i === active ? "active" : i < active ? "past" : "hidden";
      });
      this.lastLine = active;
    }
    // Chapter 3: portrait and line on the page; everything rides the page when it slides away.
    const s3 = ch3State(o, vh);
    if (this.portrait) {
      this.portrait.style.opacity = String(s3.portrait);
      this.portrait.style.transform = `translate3d(0, ${((1 - s3.portrait) * 60).toFixed(1)}px, 0)`;
    }
    if (this.ch3Line) this.ch3Line.dataset.state = s3.line ? "active" : "hidden";
    if (this.ch3Frame) this.ch3Frame.dataset.visible = String(s3.open > 0.02 && s3.away < 0.999);
    // M3: Chapters 4–7.
    this.story.update(o, vh);
    // Chapter index (7 chapters; Chapters 1–3 switch at the same points as before).
    const tick = chapterIndex(o, vh);
    if (tick !== this.lastTick) {
      this.ticks.forEach((t, i) =>
        i === tick ? t.setAttribute("aria-current", "true") : t.removeAttribute("aria-current"),
      );
      this.lastTick = tick;
    }
    return s3;
  }
}
