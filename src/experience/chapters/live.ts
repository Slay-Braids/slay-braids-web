/**
 * Live Chapters 1–7 (M3 extends M2): binds the scene's chapter camera, the DOM driver and the Chapter 3 page to
 * one clock. Loaded lazily with the scene chunk (never on tier C).
 *
 * Per animation frame, in this order (all in the same task, so they reach the screen together):
 *   scene.step → render (camera at damped scroll s) → onFrame → driver.update(s) →
 *   guide.edge(frameState) → paper.render → grounds → I4 pause check
 */
import type { CascadeScene, FrameState } from "../cascade/CascadeScene";
import type { Orientation } from "../cascade/geometry";
import { FRAMING } from "../framing";
import { CHAPTER_LAYOUT, cameraTimeline, storyStops } from "./cameraTimeline";
import { ChapterDriver, smooth, type Ch3State } from "./driver";
import { STORY, chapterIndex, groundOf, pageColor, pageState, productVh, worldAt, type PageState, type World } from "./story";
import { currentTheme, onThemeChange } from "../theme";
import { lookClips as products } from "../../content/media";
import { GuideStrand, project } from "./guideStrand";
import { DEFAULT_TOGGLES, Paper, type PaperToggles } from "./paper";
import type { ChapterFlags } from "./flags";
import { vhPx } from "./viewport";

export const PAPER_GAP = 7;
const PAGE_FILL = { white: "#FFFFFF", red: "#C60D13", black: "#0A0A0A" } as const;

export interface ChapterFrameInfo {
  fs: FrameState;
  s3: Ch3State;
  page: PageState | null;
  edge?: [number, number][];
  edgeMs: number;
  inTransition: boolean;
}

type GuideId = PageState["guide"];

export class LiveChapters {
  readonly driver: ChapterDriver;
  readonly paper: Paper;
  guide: GuideStrand;
  /** Guide strands for the later page moments (Chapter 4 lift, Chapter 6 lookbook). */
  guides: Partial<Record<GuideId, GuideStrand>> = {};
  toggles: PaperToggles = { ...DEFAULT_TOGGLES };
  /** Extra hook for the HUD and the lab. */
  onChapterFrame?: (info: ChapterFrameInfo) => void;
  private logo: HTMLElement | null;
  private actions: HTMLElement | null;
  private index: HTMLElement | null;
  private opaque: HTMLElement | null;
  private groundSections: HTMLElement[];
  private ch3Content: HTMLElement | null;
  private ch4Printed: HTMLElement | null;
  private ch6Intro: HTMLElement | null;
  private ch6Spread: HTMLElement | null;
  private onJump = (e: Event) => this.setScrollPx((e as CustomEvent<number>).detail, true);
  private paused = false;
  private onScroll = () => this.maybeResume();
  private tmp = new Float64Array(2);

  constructor(
    private readonly root: HTMLElement,
    private scene: CascadeScene,
    private orientation: Orientation,
    private readonly flags: ChapterFlags,
  ) {
    const svg = root.querySelector<SVGSVGElement>("[data-paper]")!;
    this.paper = new Paper(svg);
    this.driver = new ChapterDriver(root, orientation);
    this.logo = root.querySelector(".logo-slot");
    this.actions = root.querySelector(".header-actions");
    this.index = root.querySelector("[data-chapter-index]");
    this.opaque = root.querySelector("[data-opaque]");
    this.groundSections = [...root.querySelectorAll<HTMLElement>("[data-ground-section]")];
    this.ch3Content = root.querySelector("[data-ch3-content]");
    this.ch4Printed = root.querySelector("[data-ch4-printed]");
    this.ch6Intro = root.querySelector("[data-ch6-intro]");
    this.ch6Spread = root.querySelector("[data-ch6-spread]");
    this.guide = new GuideStrand(scene.geometry, orientation);
    this.attach(scene, orientation);
    addEventListener("scroll", this.onScroll, { passive: true });
    addEventListener("slay:jump", this.onJump);
    // v4: a theme switch recolours the world and pages at once, even while rendering is paused.
    this.offTheme = onThemeChange(() => {
      if (this.paused) {
        this.paused = false;
        this.root.dataset.renderPaused = "false";
        this.resume?.();
      }
      this.updateGrounds(scrollY / vhPx());
    });
  }
  private offTheme: () => void;

  get currentScene() {
    return this.scene;
  }

  get currentOrientation() {
    return this.orientation;
  }

  /** (Re)bind to a scene, after a downgrade or orientation change. */
  attach(scene: CascadeScene, orientation: Orientation) {
    this.scene = scene;
    this.orientation = orientation;
    this.driver.orientation = orientation;
    const S = STORY[orientation];
    const centres = products.map((_, i) => productVh(orientation, i));
    // Production identity: no pearl light shift; the world colour follows the story (v3 bright).
    scene.setCameraTimeline(cameraTimeline(orientation, storyStops(orientation, S, centres)), undefined, (vh) =>
      worldAt(orientation, vh, currentTheme()).rgb,
    );
    if (this.flags.windT != null) scene.freezeWindAt(this.flags.windT);
    this.guide = new GuideStrand(scene.geometry, orientation);
    this.reselect();
    this.setScrollPx(scrollY, true);
  }

  /** Boundary fibres are chosen at the Chapter 3 pose (K2) for the current viewport. */
  reselect() {
    const k2 = CHAPTER_LAYOUT[this.orientation].stops[3];
    this.guide.select(this.scene.frameStateAt(k2));
    const S = STORY[this.orientation];
    // M3: one guide per pose at which the page meets the hair (K3 in Chapter 4, K5 in Chapter 6).
    const at: Record<"ch4" | "ch6", number> = { ch4: S.ch4Lift[1], ch6: S.ch6Arrive[1] };
    for (const id of ["ch4", "ch6"] as const) {
      const g = new GuideStrand(this.scene.geometry, this.orientation);
      g.select(this.scene.frameStateAt(at[id]));
      this.guides[id] = g;
    }
    this.guides.ch3 = this.guide;
  }

  setScrollPx(y: number, immediate = false) {
    this.scene.setScrollVh(y / vhPx(), immediate || this.flags.noDamp);
  }

  /** Frame times by chapter and for the Chapter 3 transition alone (performance HUD). */
  readonly stats = {
    ch1: [] as number[],
    ch2: [] as number[],
    ch3: [] as number[],
    ch4: [] as number[],
    ch5: [] as number[],
    ch6: [] as number[],
    ch7: [] as number[],
    transition: [] as number[],
    /** Every frame in which a page edge is on screen (Chapters 3, 4, 6, 7). */
    page: [] as number[],
    edgeMs: [] as number[],
  };

  private record(key: keyof LiveChapters["stats"], v: number) {
    const a = this.stats[key];
    a.push(v);
    if (a.length > 2000) a.shift();
  }

  /** Called by the scene loop after each render (`dt` = this frame's time, ms). */
  frame(dt?: number) {
    const fs = this.scene.frameState();
    const s3 = this.driver.update(fs.scroll);
    const page = pageState(this.orientation, fs.scroll);
    let edge: [number, number][] | undefined;
    let edgeMs = 0;
    const inTransition = !!page && page.guide === "ch3" && page.away < 1;
    const landscape = this.orientation === "landscape";
    const along = (dx: number) =>
      `translate3d(${(landscape ? dx : 0).toFixed(2)}px, ${(landscape ? 0 : dx).toFixed(2)}px, 0)`;
    if (page) {
      const t0 = performance.now();
      edge =
        page.straighten === 1
          ? straightEdge(this.orientation, fs.cssWidth, fs.cssHeight, page.guide === "ch4" ? (landscape ? 0.6 : 1) : 0.5)
          : (this.guides[page.guide] ?? this.guide).edge(fs);
      const kp = FRAMING[this.orientation].keyPool;
      project(kp[0], kp[1], kp[2], fs, this.tmp);
      const spill = { x: this.tmp[0]!, y: this.tmp[1]! };
      const placed = this.paper.render({
        edge,
        side: landscape ? "right" : "bottom",
        open: page.open,
        away: page.away,
        straighten: page.straighten,
        fill: PAGE_FILL[pageColor(page.guide, currentTheme())],
        edge_: pageColor(page.guide, currentTheme()) === "red" ? "rgba(255,255,255,0.85)" : "rgba(198,13,19,0.95)",
        width: fs.cssWidth,
        height: fs.cssHeight,
        gap: PAPER_GAP,
        spill,
        toggles: this.toggles,
      });
      edgeMs = performance.now() - t0;
      // Content printed on the page travels with it, and fades as the page closes over the hair.
      if (placed) {
        const fade = (1 - smooth((page.away - 0.05) / 0.45)).toFixed(3);
        if (page.guide === "ch3" && this.ch3Content) {
          this.ch3Content.style.transform = along(placed.off);
          this.ch3Content.style.opacity = fade;
        }
        if (page.guide === "ch6" && this.ch6Intro && !page.straighten) {
          this.ch6Intro.style.transform = along(placed.off);
          this.ch6Intro.style.setProperty("--ride", fade);
        }
        // Chapter 4: the printed FUTURA rides the page as it draws back from full cover.
        if (page.guide === "ch4" && this.ch4Printed) this.ch4Printed.style.transform = along(placed.fromCover);
        // Chapter 7: the lookbook spread rides the last lift off the screen.
        if (page.guide === "ch6" && page.straighten && this.ch6Spread)
          this.ch6Spread.style.transform = along(placed.fromCover);
      }
    } else {
      this.paper.hide();
    }
    this.pageColor = page ? pageColor(page.guide, currentTheme()) : null;
    this.updateGrounds(fs.scroll);
    if (dt != null) {
      const keys = ["ch1", "ch2", "ch3", "ch4", "ch5", "ch6", "ch7"] as const;
      this.record(keys[chapterIndex(this.orientation, fs.scroll)]!, dt);
      if (inTransition) {
        this.record("transition", dt);
        this.record("edgeMs", edgeMs);
      }
      if (page && !page.full) this.record("page", dt);
    }
    this.onChapterFrame?.({ fs, s3, page, edge, edgeMs, inTransition });
    this.maybePause();
  }

  /** v3: the world, page or section under each header part decides its colour (white/red/black). */
  private world: World = "white";
  private pageColor: World | null = null;
  private updateGrounds(vh?: number) {
    if (vh != null) this.world = worldAt(this.orientation, vh, currentTheme()).name;
    document.documentElement.dataset.world = this.world;
    const ground = (el: HTMLElement | null): World => {
      if (!el) return this.world;
      const r = el.getBoundingClientRect();
      if (!r.width) return this.world;
      const x = r.left + r.width / 2;
      const y = r.top + r.height / 2;
      for (const sec of this.groundSections) {
        const b = sec.getBoundingClientRect();
        if (y >= b.top && y <= b.bottom) return groundOf(sec.dataset.groundSection);
      }
      if (this.pageColor && this.paper.covers(x, y)) return this.pageColor;
      return this.world;
    };
    if (this.logo) this.logo.dataset.ground = ground(this.logo);
    if (this.actions) this.actions.dataset.ground = ground(this.actions);
    if (this.index) this.index.dataset.ground = ground(this.index);
  }

  /**
   * I4: stop rendering only while nothing of the hair can be seen: a page covers the whole
   * screen (end of Chapter 3, start of Chapter 4, the Chapter 6 spread), or an opaque section
   * does. Judged from the raw scroll position.
   */
  private covered() {
    if (pageState(this.orientation, scrollY / vhPx())?.full) return true;
    return !!this.opaque && this.opaque.getBoundingClientRect().top <= 0;
  }

  private maybePause() {
    if (
      !this.paused &&
      this.covered() &&
      Math.abs(this.scene.scrollValue - scrollY / vhPx()) < 0.5
    ) {
      this.paused = true;
      this.scene.stop();
      this.root.dataset.renderPaused = "true";
    }
  }

  private maybeResume() {
    this.setScrollPx(scrollY);
    if (this.paused) {
      // Rendering is paused but the page still scrolls: keep header and index in step.
      this.driver.update(scrollY / vhPx());
      const p = pageState(this.orientation, scrollY / vhPx());
      this.pageColor = p ? pageColor(p.guide, currentTheme()) : null;
      this.updateGrounds(scrollY / vhPx());
    }
    if (this.paused && !this.covered()) {
      this.paused = false;
      this.root.dataset.renderPaused = "false";
      this.resume?.();
    }
  }

  /** Set by the controller: restarts the scene loop with its frame callback. */
  resume?: () => void;

  dispose() {
    removeEventListener("scroll", this.onScroll);
    removeEventListener("slay:jump", this.onJump);
    this.offTheme();
    this.paper.hide();
  }
}

/**
 * A straight page edge, the page lifted clear of the hair: Chapter 4 (rests beside the FUTURA
 * title on desktop; on mobile it lifts straight off, as the title sits where it would rest) and
 * the last lift in Chapter 7.
 */
function straightEdge(o: Orientation, w: number, h: number, at: number): [number, number][] {
  const n = 12;
  const out: [number, number][] = [];
  for (let i = 0; i <= n; i++) {
    out.push(o === "landscape" ? [w * at, (h * i) / n] : [(w * i) / n, h * at]);
  }
  return out;
}
