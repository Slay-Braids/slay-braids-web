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

export async function initExperience(root: HTMLElement): Promise<void> {
  const stage = root.querySelector<HTMLElement>("[data-stage]");
  const canvas = stage?.querySelector("canvas");
  const img = stage?.querySelector("img");
  if (!stage || !canvas || !img) return;

  const flags = parseFlags(location.search, location.hash);
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
    return;
  }

  await img.decode().catch(() => undefined);
  state.marks.stillDecoded = now();
  await idle();

  const settings = TIER_SETTINGS[tier];
  let orientation = state.orientation;
  const [{ CascadeScene }, { buildCascadeAsync }] = await Promise.all([
    import("./cascade/CascadeScene"),
    import("./cascade/build"),
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
  await scene.prepare();
  state.marks.shadersReady = now();
  scene.renderStill(); // frozen anchor pose, wind = 0
  await nextFrame();
  state.marks.firstLiveFrame = now();
  stage.dataset.live = "true"; // CSS cross-fade, 600 ms
  await wait(650);
  state.live = true;
  state.marks.handoffDone = now();
  state.stats = scene.stats() as unknown as Record<string, unknown>;

  // Motion, pointer, scroll — only after the invisible handoff.
  if (!flags.freeze) scene.startMotion();
  const onFrame = monitor(state, () => downgrade(), flags.noDowngrade);
  scene.start(onFrame);

  const onPointer = (e: PointerEvent) => {
    if (e.pointerType === "touch" && e.buttons === 0) return;
    scene.setPointer((e.clientX / innerWidth) * 2 - 1, -((e.clientY / innerHeight) * 2 - 1));
  };
  addEventListener("pointermove", onPointer, { passive: true });

  const scroll = await import("./scroll");
  const unbindScroll = await scroll.bindScrollCamera(root, (p) => scene.setScrollProgress(p), {
    smooth: tier === "A" && !signals.coarsePointer,
  });

  const onVisibility = () => (document.hidden ? scene.stop() : scene.start(onFrame));
  document.addEventListener("visibilitychange", onVisibility);

  let resizeTimer = 0;
  addEventListener("resize", () => {
    clearTimeout(resizeTimer);
    resizeTimer = window.setTimeout(async () => {
      const next = orientationFor(innerWidth, innerHeight);
      if (next === orientation) {
        scene.setSize(innerWidth, innerHeight);
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
      scene.renderStill();
      await nextFrame();
      stage.dataset.live = "true";
      scene.startMotion();
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
      scene.renderStill();
      await nextFrame();
      stage!.dataset.live = "true";
      scene.startMotion();
      scene.start(monitor(state, () => downgrade(), flags.noDowngrade));
      state.stats = scene.stats() as unknown as Record<string, unknown>;
    } else {
      state.downgrades.push(`B→still at ${now()} ms`);
      state.tier = "C";
      stage!.dataset.tier = "C";
      stage!.dataset.live = "false";
      await wait(600);
      scene.dispose();
      unbindScroll();
      removeEventListener("pointermove", onPointer);
      document.removeEventListener("visibilitychange", onVisibility);
      stage!.dataset.mode = "static";
    }
  }
}

/**
 * Frame-time monitor. Settles for 1 s, then judges after 120 frames OR 2 s, whichever comes
 * first, so a struggling device falls back within ~3 s instead of after hundreds of slow frames.
 */
function monitor(state: ExperienceState, onTooSlow: () => void, disabled = false) {
  const startedAt = performance.now();
  let judged = false;
  const window_: number[] = [];
  return (dt: number) => {
    state.frameTimes.push(dt);
    if (state.frameTimes.length > 600) state.frameTimes.shift();
    const elapsed = performance.now() - startedAt;
    if (judged || elapsed < 1000) return;
    window_.push(dt);
    if (window_.length >= 120 || elapsed > 3000) {
      judged = true;
      const sorted = [...window_].sort((a, b) => a - b);
      const median = sorted[Math.floor(sorted.length / 2)] ?? 1000;
      const budget = state.tier === "A" ? 22 : 34; // ≈45 fps on A, ≈30 fps on B
      state.marks[`medianFrameMs_${state.tier}`] = +median.toFixed(1);
      if (median > budget && !disabled) onTooSlow();
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
