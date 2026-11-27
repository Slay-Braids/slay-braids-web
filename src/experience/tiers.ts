/**
 * Device tiers. Pure decision logic (unit-tested) + a thin browser probe.
 *
 *  A — full cascade (desktop / capable GPUs)
 *  B — lighter cascade: fewer braids, SAME per-braid fibre density (realism is not traded away)
 *  C — static anchor still only; three.js is never downloaded
 */
import type { CascadeConfig, Orientation } from "./cascade/geometry";

export type Tier = "A" | "B" | "C";

export interface DeviceSignals {
  webgl2: boolean;
  reducedMotion: boolean;
  saveData: boolean;
  /** navigator.deviceMemory in GB, if exposed. */
  deviceMemory?: number;
  hardwareConcurrency?: number;
  coarsePointer: boolean;
  /** Unmasked GPU renderer string, if available. */
  gpu?: string;
  viewportWidth: number;
  /** navigator.connection.effectiveType, if exposed ("slow-2g" | "2g" | "3g" | "4g"). */
  effectiveType?: string;
  /** The visitor's own choice from the "Simple view / Immersive view" switch, if any. */
  view?: "simple" | "immersive";
}

const WEAK_GPU =
  /(mali-[gt]?[1-6]\d\b|mali-4|adreno \(tm\) [1-5]\d\d|powervr|sgx|intel\(r\) hd graphics [2-5]\d{2,3}\b|swiftshader|llvmpipe)/i;

export function decideTier(s: DeviceSignals): { tier: Tier; reason: string } {
  if (!s.webgl2) return { tier: "C", reason: "WebGL2 unavailable" };
  if (s.reducedMotion) return { tier: "C", reason: "prefers-reduced-motion" };
  if (s.view === "simple") return { tier: "C", reason: "simple view chosen" };
  // A visitor who asked for the immersive view skips the soft limits below (not the hard ones).
  const soft = s.view !== "immersive";
  if (soft && s.saveData) return { tier: "C", reason: "Data Saver" };
  if (soft && s.deviceMemory !== undefined && s.deviceMemory < 3)
    return { tier: "C", reason: "low device memory" };
  if (soft && s.hardwareConcurrency !== undefined && s.hardwareConcurrency <= 2 && (s.deviceMemory ?? 8) <= 4)
    return { tier: "C", reason: "≤2 CPU cores and ≤4 GB memory" };
  if (soft && (s.effectiveType === "slow-2g" || s.effectiveType === "2g"))
    return { tier: "C", reason: "slow connection" };
  if (s.gpu && WEAK_GPU.test(s.gpu)) {
    // Software rasterisers and old mobile GPUs get the light tier; the runtime monitor
    // drops further to the still if frame rate is not held.
    return { tier: "B", reason: `GPU class (${s.gpu})` };
  }
  if (s.coarsePointer || s.viewportWidth < 900)
    return { tier: "B", reason: "mobile / touch device" };
  if (s.hardwareConcurrency !== undefined && s.hardwareConcurrency <= 4)
    return { tier: "B", reason: "≤4 CPU cores" };
  return { tier: "A", reason: "capable desktop" };
}

export interface TierSettings {
  cascade: Omit<CascadeConfig, "orientation" | "seed">;
  maxDpr: number;
  antialias: boolean;
}

export const TIER_SETTINGS: Record<Exclude<Tier, "C">, TierSettings> = {
  A: {
    cascade: { braids: 26, fibresPerStrand: 24, samplesPerCycle: 18, looseSamples: 84 },
    maxDpr: 2,
    antialias: true,
  },
  // Fewer braids only: fibres per strand and sampling are identical to tier A.
  B: {
    cascade: { braids: 14, fibresPerStrand: 24, samplesPerCycle: 18, looseSamples: 84 },
    maxDpr: 1.5,
    antialias: true,
  },
};

/**
 * The anchor pose: frozen seed. anchor_v2 (27 Nov 2026, owner-approved colour correction for the
 * red/black/white identity): same geometry, shader, pose and framing as anchor_v1, with a neutral
 * white key light instead of the champagne key. anchor_v3 (same day, owner request for a bright
 * site): the anchor world is white instead of black; light, geometry, shader, pose and framing
 * as anchor_v2. Earlier versions' files are kept in public/anchors.
 */
export const ANCHOR = { version: "anchor_v3", seed: 20261126 } as const;

/** Anchor stills are always rendered from the tier-A cascade. */
export function anchorConfig(orientation: Orientation): CascadeConfig {
  return { orientation, seed: ANCHOR.seed, ...TIER_SETTINGS.A.cascade };
}

/**
 * Flags from the URL. The artifact preview only passes `#name` hashes, so flags work from
 * either `?perf=1&tier=b&reduced=1` or a hash such as `#perf-tier-b` / `#reduced`.
 */
export interface Flags {
  perf: boolean;
  tier?: Tier;
  reduced: boolean;
  /** Test/review aid: hold the anchor pose (no wind) so stills and live frames can be compared. */
  freeze: boolean;
  /** Test/review aid: keep the requested tier even if the frame rate is low. */
  noDowngrade: boolean;
  anchorRender?: Orientation;
}

export function parseFlags(search: string, hash: string): Flags {
  const q = new URLSearchParams(search);
  const h = hash.replace(/^#/, "").toLowerCase();
  const tierQ = q.get("tier")?.toUpperCase();
  const tierH = /tier-([abc])/.exec(h)?.[1]?.toUpperCase();
  const tier = (tierQ ?? tierH) as Tier | undefined;
  const anchor = q.get("anchor") ?? /anchor-(landscape|portrait)/.exec(h)?.[1];
  return {
    perf: q.get("perf") === "1" || /(^|-)perf($|-)/.test(h),
    tier: tier === "A" || tier === "B" || tier === "C" ? tier : undefined,
    reduced: q.get("reduced") === "1" || /(^|-)reduced($|-)/.test(h),
    freeze: q.get("freeze") === "1" || /(^|-)freeze($|-)/.test(h),
    noDowngrade: q.get("nodowngrade") === "1" || /(^|-)nodowngrade($|-)/.test(h),
    anchorRender: anchor === "landscape" || anchor === "portrait" ? anchor : undefined,
  };
}

/** Browser probe (not unit-tested; thin by design). */
export function probeDevice(): DeviceSignals {
  const nav = navigator as Navigator & {
    deviceMemory?: number;
    connection?: { saveData?: boolean; effectiveType?: string };
  };
  let webgl2 = false;
  let gpu: string | undefined;
  try {
    const c = document.createElement("canvas");
    const gl = c.getContext("webgl2");
    webgl2 = !!gl;
    if (gl) {
      const ext = gl.getExtension("WEBGL_debug_renderer_info");
      gpu = ext
        ? String(gl.getParameter(ext.UNMASKED_RENDERER_WEBGL))
        : String(gl.getParameter(gl.RENDERER));
      gl.getExtension("WEBGL_lose_context")?.loseContext();
    }
  } catch {
    webgl2 = false;
  }
  return {
    webgl2,
    reducedMotion: matchMedia("(prefers-reduced-motion: reduce)").matches,
    saveData: !!nav.connection?.saveData,
    deviceMemory: nav.deviceMemory,
    hardwareConcurrency: nav.hardwareConcurrency,
    coarsePointer: matchMedia("(pointer: coarse)").matches,
    gpu,
    viewportWidth: innerWidth,
    effectiveType: nav.connection?.effectiveType,
    view: readViewChoice(),
  };
}

/** The "Simple view / Immersive view" choice: `?view=` in the URL (remembered), or remembered. */
export const VIEW_KEY = "slay-view";
export function readViewChoice(): "simple" | "immersive" | undefined {
  try {
    const q = new URLSearchParams(location.search).get("view");
    if (q === "simple" || q === "immersive") {
      localStorage.setItem(VIEW_KEY, q);
      return q;
    }
    const v = localStorage.getItem(VIEW_KEY);
    return v === "simple" || v === "immersive" ? v : undefined;
  } catch {
    return undefined;
  }
}
