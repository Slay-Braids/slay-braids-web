/**
 * Experience controller — the only experience code in the initial bundle (a few KB).
 *
 * Sequence:
 *  1. The anchor still (HTML <picture>) is already on screen: it is the LCP element.
 *  2. Decide the tier. Tier C (reduced motion, Data Saver, no WebGL2, low memory) stops here:
 *     three.js is never downloaded.
 *  3. Once the still is decoded and the browser is idle: lazily load the scene chunk and build
 *     the geometry in a worker, in parallel.
 *  4. Render the frozen anchor pose into the hidden canvas, then cross-fade canvas over still.
 *     Because the pose and framing are identical, the fade is invisible.
 *  5. Only after the fade: start motion, pointer response and scroll-driven camera.
 *  6. Watch frame times; drop A → B → still if the device cannot hold the frame rate.
 */
import {
  ANCHOR,
  TIER_SETTINGS,
  anchorConfig,
  decideTier,
  parseFlags,
  probeDevice,
  type Tier,
} from "./tiers";
import { FRAMING, orientationFor } from "./framing";
import type { Orientation } from "./cascade/geometry";
import { parseChapterFlags } from "./chapters/flags";
import { syncVh, vhPx } from "./chapters/viewport";

export interface PerfMarks {
  [key: string]: number | string | boolean | undefined;
}

export interface ExperienceState {
  tier: Tier;
  tierReason: string;
  orientation: Orientation;
  live: boolean;
  marks: PerfMarks;
  frameTimes: number[];
  downgrades: string[];
  anchor: string;
  stats?: Record<string, unknown>;
}

declare global {
  interface Window {
    __slay?: ExperienceState;
  }
}

const now = () => Math.round(performance.now());

/**
 * M3 error state: whatever fails while starting the live experience (a chunk that does not
 * load, a WebGL error), the visitor gets the static spreads, never a blank or broken page.
 */
export async function initExperience(root: HTMLElement): Promise<void> {
  try {
    await startExperience(root);
  } catch (err) {
    console.error("[slay] live experience failed, showing the static spreads", err);
    const stage = root.querySelector<HTMLElement>("[data-stage]");
    if (stage) {
      stage.dataset.live = "false";
      stage.dataset.mode = "static";
    }
    if (window.__slay) window.__slay.downgrades.push(`error → still: ${String(err)}`);
    document.documentElement.dataset.static = "true";
    const { initStaticSpreads } = await import("./chapters/staticSpreads");
    initStaticSpreads(root, orientationFor(innerWidth, innerHeight));
  }
}

async function startExperience(root: HTMLElement): Promise<void> {
  const stage = root.querySelector<HTMLElement>("[data-stage]");
  const canvas = stage?.querySelector("canvas");
  const img = stage?.querySelector("img");
  if (!stage || !canvas || !img) return;

  const flags = parseFlags(location.search, location.hash);
  const chapterFlags = parseChapterFlags(location.search, location.hash);
  syncVh(true);
  addEventListener("resize", () => syncVh());
  const signals = probeDevice();
  const reduced = flags.reduced || signals.reducedMotion;
  document.documentElement.dataset.reducedMotion = String(reduced);

  let { tier, reason } = decideTier({ ...signals, reducedMotion: reduced });
  if (flags.tier) {
    tier = flags.tier;
    reason = `forced by URL (${reason} otherwise)`;
  }

  const state: ExperienceState = {
    tier,
    tierReason: reason,
    orientation: orientationFor(innerWidth, innerHeight),
    live: false,
    marks: { tierDecided: now() },
    frameTimes: [],
    downgrades: [],
    anchor: ANCHOR.version,
  };
  window.__slay = state;
  stage.dataset.tier = tier;

  if (flags.perf) void import("./perfHud").then((m) => m.mountPerfHud(state));
  if (flags.anchorRender) {
    await renderAnchorMode(canvas, flags.anchorRender, state);
    return;
  }
  if (tier === "C") {
    stage.dataset.mode = "static";
    state.marks.static = true;
    document.documentElement.dataset.static = "true";
    void import("./chapters/staticSpreads").then((m) =>
      m.initStaticSpreads(root, state.orientation),
    );
    return;
  }

  if (chapterFlags.stillMatched) swapToMatchedStill(img, tier, state); // tier is A or B here
  await img.decode().catch(() => undefined);
  state.marks.stillDecoded = now();
  await idle();

  const settings = TIER_SETTINGS[tier];
  let orientation = state.orientation;
  const [{ CascadeScene }, { buildCascadeAsync }, { LiveChapters }] = await Promise.all([
    import("./cascade/CascadeScene"),
    import("./cascade/build"),
    import("./chapters/live"),
  ]);
  state.marks.chunkLoaded = now();

  const geometry = await buildCascadeAsync({ orientation, seed: ANCHOR.seed, ...settings.cascade });
  state.marks.geometryReady = now();

  let scene = new CascadeScene({
    canvas,
    orientation,
    geometry,
    maxDpr: settings.maxDpr,
    antialias: settings.antialias,
  });
  scene.setSize(innerWidth, innerHeight);
  // M3: a lost WebGL context (GPU reset, memory pressure) falls back to the static spreads.
  canvas.addEventListener(
    "webglcontextlost",
    (e) => {
      e.preventDefault();
      state.downgrades.push(`context lost at ${now()} ms`);
      state.tier = "B";
      void downgrade();
    },
    { once: true },
  );
  if (chapterFlags.vh != null) scrollTo(0, chapterFlags.vh * vhPx());
  const chapters = new LiveChapters(root, scene, orientation, chapterFlags);
  (window as unknown as { __chapters?: unknown }).__chapters = chapters;
  await scene.prepare();
  state.marks.shadersReady = now();
  scene.renderStill(); // frozen anchor pose, wind = 0
  if (flags.perf) {
    // On-device handoff Δ: the first live frame (read back in the same task as its render)
    // against the still as the browser displays it.
    const { measureHandoff } = await import("./chapters/handoffDelta");
    state.marks.handoff = JSON.stringify(measureHandoff(img, scene.readPixels()));
  }
  await nextFrame();
  state.marks.firstLiveFrame = now();
  stage.dataset.live = "true"; // CSS cross-fade, 600 ms
  await wait(650);
  state.live = true;
  state.marks.handoffDone = now();
  state.stats = scene.stats() as unknown as Record<string, unknown>;

  // Motion, pointer, scroll — only after the invisible handoff.
  if (!flags.freeze) scene.startMotion();
  const monitorFrame = monitor(state, () => downgrade(), flags.noDowngrade);
  const onFrame = (dt: number) => {
    monitorFrame(dt);
    chapters.frame(dt);
  };
  chapters.resume = () => scene.start(onFrame);
  if (chapterFlags.lab) void import("./chapters/lab").then((m) => m.mountLab(chapters));
  chapters.frame();
  scene.start(onFrame);

  const onPointer = (e: PointerEvent) => {
    if (e.pointerType === "touch" && e.buttons === 0) return;
    scene.setPointer((e.clientX / innerWidth) * 2 - 1, -((e.clientY / innerHeight) * 2 - 1));
  };
  addEventListener("pointermove", onPointer, { passive: true });

  const scroll = await import("./scroll");
  const unbindScroll = await scroll.bindSmoothScroll({
    smooth: tier === "A" && !signals.coarsePointer && !chapterFlags.noDamp,
  });

  const onVisibility = () => (document.hidden ? scene.stop() : scene.start(onFrame));
  document.addEventListener("visibilitychange", onVisibility);

  // M3: rotation keeps the reader's place (chapter + progress), not the raw scroll offset.
  const { mapVh } = await import("./chapters/story");
  let place = { o: orientation, vh: scrollY / vhPx() };
  addEventListener(
    "scroll",
    () => {
      if (orientationFor(innerWidth, innerHeight) === place.o) place = { o: place.o, vh: scrollY / vhPx() };
    },
    { passive: true },
  );
  addEventListener("resize", () => {
    const o = orientationFor(innerWidth, innerHeight);
    if (o === place.o) return;
    syncVh(true);
    const vh = mapVh(place.o, o, place.vh);
    place = { o, vh };
    scrollTo(0, vh * vhPx());
  });

  let resizeTimer = 0;
  addEventListener("resize", () => {
    clearTimeout(resizeTimer);
    resizeTimer = window.setTimeout(async () => {
      const next = orientationFor(innerWidth, innerHeight);
      if (next === orientation) {
        scene.setSize(innerWidth, innerHeight);
        chapters.reselect();
        return;
      }
      // Orientation changed: the matching anchor still is already shown by <picture>.
      // Fade back to it, rebuild for the new composition, fade in again.
      orientation = next;
      state.orientation = next;
      stage.dataset.live = "false";
      await wait(600);
      scene.dispose();
      const g = await buildCascadeAsync({
        orientation,
        seed: ANCHOR.seed,
        ...TIER_SETTINGS[state.tier === "C" ? "B" : state.tier].cascade,
      });
      scene = new CascadeScene({
        canvas,
        orientation,
        geometry: g,
        maxDpr: settings.maxDpr,
        antialias: settings.antialias,
      });
      scene.setSize(innerWidth, innerHeight);
      chapters.attach(scene, orientation);
      scene.renderStill();
      await nextFrame();
      stage.dataset.live = "true";
      if (!flags.freeze) scene.startMotion();
      scene.start(onFrame);
    }, 200);
  });

  async function downgrade() {
    if (state.tier === "A") {
      state.downgrades.push(`A→B at ${now()} ms`);
      state.tier = "B";
      stage!.dataset.tier = "B";
      stage!.dataset.live = "false";
      await wait(600);
      scene.dispose();
      const g = await buildCascadeAsync({
        orientation,
        seed: ANCHOR.seed,
        ...TIER_SETTINGS.B.cascade,
      });
      scene = new CascadeScene({
        canvas: canvas!,
        orientation,
        geometry: g,
        maxDpr: TIER_SETTINGS.B.maxDpr,
        antialias: true,
      });
      scene.setSize(innerWidth, innerHeight);
      chapters.attach(scene, orientation);
      scene.renderStill();
      await nextFrame();
      stage!.dataset.live = "true";
      if (!flags.freeze) scene.startMotion();
      const m = monitor(state, () => downgrade(), flags.noDowngrade);
      scene.start((dt) => {
        m(dt);
        chapters.frame(dt);
      });
      state.stats = scene.stats() as unknown as Record<string, unknown>;
    } else {
      state.downgrades.push(`B→still at ${now()} ms`);
      state.tier = "C";
      stage!.dataset.tier = "C";
      stage!.dataset.live = "false";
      await wait(600);
      scene.dispose();
      unbindScroll();
      chapters.dispose();
      removeEventListener("pointermove", onPointer);
      document.removeEventListener("visibilitychange", onVisibility);
      stage!.dataset.mode = "static";
      document.documentElement.dataset.static = "true";
      void import("./chapters/staticSpreads").then((m) => m.initStaticSpreads(root, orientation));
      announceSimpleView();
    }
  }
}

/** I6 experiment (#still-matched): swap in the still whose width equals the capped live render. */
function swapToMatchedStill(img: HTMLImageElement, tier: "A" | "B", state: ExperienceState) {
  const portrait = innerWidth / innerHeight < 1;
  const widths = portrait ? [720, 750, 780, 824, 860] : [2160, 2304];
  const target = innerWidth * Math.min(devicePixelRatio || 1, TIER_SETTINGS[tier].maxDpr);
  const w = widths.find((x) => x >= target - 1) ?? widths.at(-1)!;
  const base = document.getElementById("experience")?.dataset.assetBase ?? "/";
  img
    .closest("picture")
    ?.querySelectorAll("source")
    .forEach((s) => s.remove());
  img.removeAttribute("srcset");
  img.src = `${base}anchors-matched/${ANCHOR.version}-${portrait ? "portrait" : "landscape"}-${w}.avif`;
  state.marks.stillMatched = `${w}w for target ${Math.round(target)}w`;
}

/**
 * Frame-time monitor. Settles for 1 s, then judges after 120 frames OR 2 s, whichever comes
 * first, so a struggling device falls back within ~3 s instead of after hundreds of slow frames.
 */
function monitor(state: ExperienceState, onTooSlow: () => void, disabled = false) {
  const startedAt = performance.now();
  let judged = false;
  let fired = false;
  const window_: number[] = [];
  // After the first judgement, keep watching for the rest of the visit (a phone that heats up
  // and throttles): a sustained slowdown, well past the budget, steps down too.
  const rolling: number[] = [];
  const budget = () => (state.tier === "A" ? 22 : 34); // ≈45 fps on A, ≈30 fps on B
  const median = (a: number[]) => [...a].sort((x, y) => x - y)[Math.floor(a.length / 2)] ?? 1000;
  return (dt: number) => {
    state.frameTimes.push(dt);
    if (state.frameTimes.length > 600) state.frameTimes.shift();
    if (fired || disabled) return;
    const elapsed = performance.now() - startedAt;
    if (!judged) {
      if (elapsed < 1000) return;
      window_.push(dt);
      if (window_.length >= 120 || elapsed > 3000) {
        judged = true;
        const m = median(window_);
        state.marks[`medianFrameMs_${state.tier}`] = +m.toFixed(1);
        if (m > budget()) {
          fired = true;
          onTooSlow();
        }
      }
      return;
    }
    rolling.push(dt);
    if (rolling.length < 180) return;
    const m = median(rolling);
    rolling.length = 0;
    if (m > budget() * 1.4) {
      fired = true;
      state.marks[`sustainedSlowMs_${state.tier}`] = +m.toFixed(1);
      onTooSlow();
    }
  };
}

/** Headless anchor rendering: frozen pose at master resolution, exposed for the build script. */
async function renderAnchorMode(
  canvas: HTMLCanvasElement,
  orientation: Orientation,
  state: ExperienceState,
) {
  const [{ CascadeScene }, { buildCascade }] = await Promise.all([
    import("./cascade/CascadeScene"),
    import("./cascade/geometry"),
  ]);
  const [w, h] = FRAMING[orientation].anchorSize;
  const geometry = buildCascade(anchorConfig(orientation));
  const scene = new CascadeScene({
    canvas,
    orientation,
    geometry,
    maxDpr: 1,
    antialias: true,
    preserveDrawingBuffer: true,
  });
  canvas.style.width = `${w}px`;
  canvas.style.height = `${h}px`;
  canvas.style.opacity = "1";
  scene.setSize(w, h, 1);
  scene.renderStill();
  state.marks.anchorRendered = now();
  (window as unknown as { __anchorPNG?: string }).__anchorPNG = canvas.toDataURL("image/png");
}

const nextFrame = () =>
  new Promise<void>((r) => requestAnimationFrame(() => requestAnimationFrame(() => r())));
const wait = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));
const idle = () =>
  new Promise<void>((r) => {
    const ric = (
      window as unknown as {
        requestIdleCallback?: (cb: () => void, o?: { timeout: number }) => number;
      }
    ).requestIdleCallback;
    if (ric) ric(() => r(), { timeout: 1200 });
    else setTimeout(r, 200);
  });

/** After an automatic step down to the simple view, say so briefly (and how to switch back). */
function announceSimpleView() {
  const el = document.querySelector<HTMLElement>("[data-view-notice]");
  if (!el) return;
  el.textContent = "Switched to the simple view for smoother scrolling. You can change this in the menu.";
  el.dataset.show = "true";
  setTimeout(() => (el.dataset.show = "false"), 6000);
}
