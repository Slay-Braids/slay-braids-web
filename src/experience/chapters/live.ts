/**
 * Live Chapters 1–3: binds the scene's chapter camera, the DOM driver and the Chapter 3 page to
 * one clock. Loaded lazily with the scene chunk (never on tier C).
 *
 * Per animation frame, in this order (all in the same task, so they reach the screen together):
 *   scene.step → render (camera at damped scroll s) → onFrame → driver.update(s) →
 *   guide.edge(frameState) → paper.render → grounds → I4 pause check
 */
import type { CascadeScene, FrameState } from "../cascade/CascadeScene";
import type { Orientation } from "../cascade/geometry";
import { FRAMING } from "../framing";
import { CHAPTER_LAYOUT, cameraTimeline } from "./cameraTimeline";
import { ChapterDriver, ch3State, smooth, type Ch3State } from "./driver";
import { GuideStrand, project } from "./guideStrand";
import { DEFAULT_TOGGLES, Paper, type PaperToggles } from "./paper";
import type { ChapterFlags } from "./flags";
import { vhPx } from "./viewport";

export const PAPER_GAP = 7;

export interface ChapterFrameInfo {
  fs: FrameState;
  s3: Ch3State;
  edge?: [number, number][];
  edgeMs: number;
  inTransition: boolean;
}

export class LiveChapters {
  readonly driver: ChapterDriver;
  readonly paper: Paper;
  guide: GuideStrand;
  toggles: PaperToggles = { ...DEFAULT_TOGGLES };
  /** Extra hook for the HUD and the lab. */
  onChapterFrame?: (info: ChapterFrameInfo) => void;
  private logo: HTMLElement | null;
  private actions: HTMLElement | null;
  private index: HTMLElement | null;
  private opaque: HTMLElement | null;
  private groundSections: HTMLElement[];
  private ch3Content: HTMLElement | null;
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
    this.guide = new GuideStrand(scene.geometry, orientation);
    this.attach(scene, orientation);
    addEventListener("scroll", this.onScroll, { passive: true });
  }

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
    scene.setCameraTimeline(cameraTimeline(orientation));
    if (this.flags.windT != null) scene.freezeWindAt(this.flags.windT);
    this.guide = new GuideStrand(scene.geometry, orientation);
    this.reselect();
    this.setScrollPx(scrollY, true);
  }

  /** Boundary fibres are chosen at the Chapter 3 pose (K2) for the current viewport. */
  reselect() {
    const k2 = CHAPTER_LAYOUT[this.orientation].stops[3];
    this.guide.select(this.scene.frameStateAt(k2));
  }

  setScrollPx(y: number, immediate = false) {
    this.scene.setScrollVh(y / vhPx(), immediate || this.flags.noDamp);
  }

  /** Called by the scene loop after each render. */
  frame() {
    const fs = this.scene.frameState();
    const s3 = this.driver.update(fs.scroll);
    let edge: [number, number][] | undefined;
    let edgeMs = 0;
    const inTransition = s3.open > 0 && s3.away < 1;
    if (s3.open > 0) {
      const t0 = performance.now();
      edge = this.guide.edge(fs);
      let spill: { x: number; y: number } | undefined;
      const kp = FRAMING[this.orientation].keyPool;
      project(kp[0], kp[1], kp[2], fs, this.tmp);
      spill = { x: this.tmp[0]!, y: this.tmp[1]! };
      const placed = this.paper.render({
        edge,
        side: this.orientation === "landscape" ? "right" : "bottom",
        open: s3.open,
        away: s3.away,
        width: fs.cssWidth,
        height: fs.cssHeight,
        gap: PAPER_GAP,
        spill,
        toggles: this.toggles,
      });
      edgeMs = performance.now() - t0;
      // Content printed on the page travels with it, and fades as the page closes over the hair.
      if (this.ch3Content && placed) {
        const landscape = this.orientation === "landscape";
        const dx = landscape ? placed.off : 0;
        const dy = landscape ? 0 : placed.off;
        this.ch3Content.style.transform = `translate3d(${dx.toFixed(2)}px, ${dy.toFixed(2)}px, 0)`;
        this.ch3Content.style.opacity = (1 - smooth((s3.away - 0.05) / 0.45)).toFixed(3);
      }
    } else {
      this.paper.hide();
    }
    this.updateGrounds();
    this.onChapterFrame?.({ fs, s3, edge, edgeMs, inTransition });
    this.maybePause();
  }

  /** Header and index text turn espresso wherever ivory lies under them. */
  private updateGrounds() {
    const on = (el: HTMLElement | null) => {
      if (!el) return false;
      const r = el.getBoundingClientRect();
      if (!r.width) return false;
      const x = r.left + r.width / 2;
      const y = r.top + r.height / 2;
      for (const sec of this.groundSections) {
        const b = sec.getBoundingClientRect();
        if (y >= b.top && y <= b.bottom) return sec.dataset.groundSection === "ivory";
      }
      return this.paper.covers(x, y);
    };
    const logo = on(this.logo);
    const actions = on(this.actions);
    if (this.logo) this.logo.dataset.ground = logo ? "ivory" : "ink";
    if (this.actions) this.actions.dataset.ground = actions ? "ivory" : "ink";
    if (this.index) this.index.dataset.ground = on(this.index) ? "ivory" : "ink";
  }

  /**
   * I4: stop rendering only while nothing of the hair can be seen: the Chapter 3 page covers the
   * whole screen, or an opaque section does. Judged from the raw scroll position.
   */
  private covered() {
    if (ch3State(this.orientation, scrollY / vhPx()).away >= 0.9995) return true;
    return !!this.opaque && this.opaque.getBoundingClientRect().top <= 0;
  }

  private maybePause() {
    if (!this.paused && this.covered() && Math.abs(this.scene.scrollValue - scrollY / vhPx()) < 0.5) {
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
      this.updateGrounds();
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
    this.paper.hide();
  }
}
