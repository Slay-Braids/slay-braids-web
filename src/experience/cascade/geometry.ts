/**
 * Unbraiding Cascade — procedural geometry (pure, deterministic, no three.js dependency).
 *
 * Every braid is three strands woven around a centre curve. Every strand is a bundle of
 * individual hair fibres. Down the length of each braid the weave relaxes ("unbraids") and the
 * fibres separate into loose, softly waving strands with uneven, tapered ends.
 *
 * Output is a single ribbon mesh (2 vertices per fibre sample; the shader expands each pair
 * into a camera-facing ribbon), ordered back-to-front so unsorted alpha blending stays clean.
 *
 * Realism budget rule: lower tiers drop whole braids, never fibre density or sample density
 * per braid, so a braid always looks the same on every device.
 */

export type Orientation = "landscape" | "portrait";

export interface CascadeConfig {
  orientation: Orientation;
  seed: number;
  braids: number;
  fibresPerStrand: number;
  /** Samples per weave cycle in the braided section. */
  samplesPerCycle: number;
  /** Samples for the loose section of each fibre. */
  looseSamples: number;
}

export interface CascadeGeometryData {
  /** Fibre centre positions, 2 identical entries per sample (ribbon pair). xyz float32. */
  positions: Float32Array;
  /** Tangent, int8 normalised xyz + padding. */
  tangents: Int8Array;
  /** Packed per-vertex params, uint8 normalised: t along fibre, looseness, fibre seed, occlusion. */
  params: Uint8Array;
  /** Triangle indices. */
  indices: Uint32Array;
  fibreCount: number;
  vertexCount: number;
  triangleCount: number;
  /** Axis-aligned bounds of the anchor pose. */
  bounds: { min: [number, number, number]; max: [number, number, number] };
}

/* ---------- deterministic RNG ---------- */

export function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/* ---------- small vector helpers ---------- */

type V3 = [number, number, number];
const add = (a: V3, b: V3): V3 => [a[0] + b[0], a[1] + b[1], a[2] + b[2]];
const sub = (a: V3, b: V3): V3 => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
const mul = (a: V3, s: number): V3 => [a[0] * s, a[1] * s, a[2] * s];
const dot = (a: V3, b: V3) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
const cross = (a: V3, b: V3): V3 => [
  a[1] * b[2] - a[2] * b[1],
  a[2] * b[0] - a[0] * b[2],
  a[0] * b[1] - a[1] * b[0],
];
const norm = (a: V3): V3 => {
  const l = Math.hypot(a[0], a[1], a[2]) || 1;
  return [a[0] / l, a[1] / l, a[2] / l];
};
const smoothstep = (e0: number, e1: number, x: number) => {
  const t = Math.min(1, Math.max(0, (x - e0) / (e1 - e0)));
  return t * t * (3 - 2 * t);
};

function bezier(p0: V3, p1: V3, p2: V3, p3: V3, s: number): V3 {
  const u = 1 - s;
  const a = u * u * u,
    b = 3 * u * u * s,
    c = 3 * u * s * s,
    d = s * s * s;
  return [
    a * p0[0] + b * p1[0] + c * p2[0] + d * p3[0],
    a * p0[1] + b * p1[1] + c * p2[1] + d * p3[1],
    a * p0[2] + b * p1[2] + c * p2[2] + d * p3[2],
  ];
}

/* ---------- composition presets (one per anchor orientation) ---------- */

interface Composition {
  /** Master flow curve of the cascade (scene units). */
  curve: [V3, V3, V3, V3];
  /** Direction braids fan out across (roughly perpendicular to the flow, in screen plane). */
  fan: V3;
  /** Fan width at the top and at the bottom of the cascade. */
  spreadTop: number;
  spreadBottom: number;
  depthRange: [number, number];
}

export const COMPOSITIONS: Record<Orientation, Composition> = {
  // 16:9 — enters along the top edge, flows down to the right, loose ends settle lower right.
  // The lower-left quadrant stays dark for the headline.
  landscape: {
    curve: [
      [-1.7, 2.75, 0],
      [-0.2, 1.6, 0],
      [0.9, 0.05, 0],
      [2.75, -2.25, 0],
    ],
    fan: norm([0.78, 0.62, 0]),
    spreadTop: 0.5,
    spreadBottom: 1.05,
    depthRange: [-2.4, 0.9],
  },
  // 9:16 — falls from the top, right of centre; loose ends sway through the middle.
  // Top band (header) and bottom third (headline) stay dark.
  portrait: {
    curve: [
      [0.45, 3.45, 0],
      [0.75, 1.75, 0],
      [0.05, 0.35, 0],
      [0.55, -1.35, 0],
    ],
    fan: norm([1, 0.1, 0]),
    spreadTop: 0.42,
    spreadBottom: 0.95,
    depthRange: [-2.2, 0.7],
  },
};

/* ---------- builder ---------- */

/** Length (as a fraction of the braid) over which the weave relaxes into loose hair. */
const UNBRAID_SPAN = 0.16;

interface BraidSpec {
  z: number;
  lane: number;
  width: number;
  pitch: number;
  unbraidStart: number;
  length: number;
  sway: number;
  seed: number;
  /** Order key for back-to-front drawing. */
  depth: number;
}

export function buildCascade(cfg: CascadeConfig): CascadeGeometryData {
  const rnd = mulberry32(cfg.seed);
  const comp = COMPOSITIONS[cfg.orientation];

  // Braid lanes are evenly distributed then jittered, so composition stays balanced at any count.
  const braids: BraidSpec[] = [];
  for (let k = 0; k < cfg.braids; k++) {
    const laneBase = cfg.braids === 1 ? 0 : (k / (cfg.braids - 1)) * 2 - 1;
    const z = comp.depthRange[0] + rnd() * (comp.depthRange[1] - comp.depthRange[0]);
    const width = 0.085 + rnd() * 0.035;
    braids.push({
      z,
      lane: laneBase + (rnd() - 0.5) * 0.35,
      width,
      pitch: width * (3.1 + rnd() * 0.5),
      unbraidStart: 0.42 + rnd() * 0.2,
      length: 0.9 + rnd() * 0.12,
      sway: (rnd() - 0.5) * 0.5,
      seed: rnd(),
      depth: z,
    });
  }
  braids.sort((a, b) => a.depth - b.depth); // far → near

  // Approximate master curve length for pitch → cycles conversion.
  let curveLen = 0;
  {
    let prev = bezier(...comp.curve, 0);
    for (let i = 1; i <= 64; i++) {
      const p = bezier(...comp.curve, i / 64);
      curveLen += Math.hypot(...sub(p, prev));
      prev = p;
    }
  }

  // First pass: count samples so typed arrays can be allocated exactly.
  const fibresPerBraid = cfg.fibresPerStrand * 3;
  const samplesFor = (b: BraidSpec) => {
    const braidedLen = curveLen * b.length * Math.min(1, b.unbraidStart + UNBRAID_SPAN);
    const cycles = braidedLen / b.pitch;
    return Math.max(8, Math.ceil(cycles * cfg.samplesPerCycle)) + cfg.looseSamples;
  };
  let totalSamples = 0;
  for (const b of braids) totalSamples += samplesFor(b) * fibresPerBraid;

  const vertexCount = totalSamples * 2;
  const positions = new Float32Array(vertexCount * 3);
  const tangents = new Int8Array(vertexCount * 4);
  const params = new Uint8Array(vertexCount * 4);
  const segCount = totalSamples - braids.length * fibresPerBraid;
  const indices = new Uint32Array(segCount * 6);

  const min: V3 = [Infinity, Infinity, Infinity];
  const max: V3 = [-Infinity, -Infinity, -Infinity];
  let v = 0; // vertex cursor
  let ii = 0; // index cursor
  let fibreCount = 0;

  const TWO_PI = Math.PI * 2;

  for (const b of braids) {
    const n = samplesFor(b);
    const braidedN = n - cfg.looseSamples;
    // Dense sampling continues through the whole unbraiding transition (weave still active),
    // so the weave is never under-sampled; only fully loose hair uses the coarser spacing.
    const sEndBraid = b.length * Math.min(1, b.unbraidStart + UNBRAID_SPAN);

    // Sample the braid's own centre curve: master curve + fan offset + depth + gentle sway.
    // s parameter spacing: dense in braided part, coarser in loose part.
    const sAt = (i: number) =>
      i < braidedN
        ? (i / braidedN) * sEndBraid
        : sEndBraid + ((i - braidedN + 1) / cfg.looseSamples) * (b.length - sEndBraid);

    const centre: V3[] = new Array(n);
    for (let i = 0; i < n; i++) {
      const s = sAt(i);
      const base = bezier(...comp.curve, s);
      const spread = comp.spreadTop + (comp.spreadBottom - comp.spreadTop) * s;
      const swayOff = Math.sin(s * 5.0 + b.seed * TWO_PI) * 0.12 * b.sway;
      centre[i] = add(add(base, mul(comp.fan, b.lane * spread + swayOff)), [0, 0, b.z]);
    }

    // Parallel-transport frame along the centre curve.
    const T: V3[] = new Array(n);
    const N: V3[] = new Array(n);
    const B: V3[] = new Array(n);
    for (let i = 0; i < n; i++) {
      const a = centre[Math.max(0, i - 1)]!;
      const c = centre[Math.min(n - 1, i + 1)]!;
      T[i] = norm(sub(c, a));
    }
    {
      const t0 = T[0]!;
      const ref: V3 = Math.abs(t0[2]) < 0.9 ? [0, 0, 1] : [1, 0, 0];
      N[0] = norm(cross(cross(t0, ref), t0));
      B[0] = cross(t0, N[0]!);
      for (let i = 1; i < n; i++) {
        const t = T[i]!;
        const prevN = N[i - 1]!;
        const nn = norm(sub(prevN, mul(t, dot(prevN, t))));
        N[i] = nn;
        B[i] = cross(t, nn);
      }
    }

    const halfW = b.width * 0.5;
    const strandR = halfW * 0.46;

    for (let strand = 0; strand < 3; strand++) {
      for (let f = 0; f < cfg.fibresPerStrand; f++) {
        // Fibre position inside the strand cross-section (uniform disk, slight centre bias).
        const rr = Math.sqrt(rnd()) * strandR * (0.92 + rnd() * 0.08);
        const ang0 = rnd() * TWO_PI;
        const fibreSeed = rnd();
        const twist = 0.55 + rnd() * 0.25; // plait strands are smooth, nearly parallel bundles
        const stray = rnd() < 0.06; // a few flyaways per strand
        const waveA = stray ? 0.03 + rnd() * 0.05 : 0.004 + rnd() * 0.012;
        const waveK = 9 + rnd() * 8;
        const wavePh = rnd() * TWO_PI;
        const dirLoose = rnd() * TWO_PI;
        const spreadLoose = stray ? 0.06 + rnd() * 0.12 : rnd() * 0.035;
        const clump = f % 3;
        const clumpRnd = mulberry32(Math.floor(b.seed * 1e6) + strand * 31 + clump * 7);
        const clumpA = 0.05 + clumpRnd() * 0.05; // shared S-wave of the clump
        const clumpK = 3.2 + clumpRnd() * 2.2; // radians per scene unit (~1.5–2.5 waves)
        const clumpPh = clumpRnd() * TWO_PI;
        const endCut = 0.82 + rnd() * 0.18; // uneven natural ends
        // Fibres near the bundle centre are more occluded.
        const radialAO = 0.45 + 0.55 * (rr / strandR);
        const fibreShade = Math.pow(rnd(), 1.6); // most fibres sit deeper in the clump

        const first = v;
        let samplesUsed = 0;
        for (let i = 0; i < n; i++) {
          const s = sAt(i);
          const tFib = s / b.length; // 0..1 along the braid
          if (tFib > endCut && i > braidedN) break;
          const loose = smoothstep(b.unbraidStart - 0.04, b.unbraidStart + UNBRAID_SPAN, tFib);
          const weave = 1 - loose;

          // Classic 3-strand plait offset in the (N, B) plane.
          const phase = ((s * curveLen) / b.pitch) * TWO_PI + (strand * TWO_PI) / 3;
          const ox = Math.sin(phase) * halfW * 0.78 * weave;
          const oy = Math.sin(2 * phase) * halfW * 0.34 * weave;

          // Fibre offset inside its strand (rotates with the strand twist while braided).
          const ang = ang0 + phase * 0.35 * twist * weave;
          let fx = Math.cos(ang) * rr;
          let fy = Math.sin(ang) * rr;

          // Loosening. Real hair clumps: each strand splits into a few clumps that wave
          // together; individual fibres only deviate slightly from their clump.
          const lt = loose * loose;
          const strandAng = (strand * TWO_PI) / 3 + b.seed * TWO_PI;
          const clumpAng = strandAng + (clump - 1) * 0.95;
          const sw = s * curveLen; // world distance along the braid
          const cw = Math.sin(sw * clumpK + clumpPh) * clumpA * lt;
          const cw2 = Math.cos(sw * clumpK * 0.63 + clumpPh * 1.7) * clumpA * 0.55 * lt;
          fx +=
            Math.cos(strandAng) * halfW * 1.25 * lt + Math.cos(clumpAng) * halfW * 0.7 * lt + cw;
          fy +=
            Math.sin(strandAng) * halfW * 1.25 * lt + Math.sin(clumpAng) * halfW * 0.7 * lt + cw2;
          // Small individual deviation and a few strays.
          fx += (Math.cos(dirLoose) * spreadLoose + Math.sin(sw * waveK + wavePh) * waveA) * lt;
          fy +=
            (Math.sin(dirLoose) * spreadLoose + Math.cos(sw * waveK * 0.7 + wavePh) * waveA) *
            0.7 *
            lt;
          const nI = N[i]!;
          const bI = B[i]!;
          const p = add(add(add(centre[i]!, mul(nI, ox + fx)), mul(bI, oy + fy)), [
            0,
            -0.1 * lt * lt,
            0,
          ]);

          // Weave occlusion: a strand passing "under" its neighbours (negative B offset) is darker.
          const under = 0.5 + 0.5 * Math.sin(2 * phase + Math.PI * 0.5);
          const weaveAO = 1 - 0.35 * weave * under;
          // Loose hair: strong per-fibre variation (under-layers sit in shadow), which is what
          // separates hair from a uniform "straw" look.
          const looseAO = 0.25 + 0.75 * fibreShade;
          const ao = Math.min(1, radialAO * weaveAO * (1 - loose) + looseAO * loose);

          for (let side = 0; side < 2; side++) {
            const o3 = v * 3;
            positions[o3] = p[0];
            positions[o3 + 1] = p[1];
            positions[o3 + 2] = p[2];
            const o4 = v * 4;
            // tangent filled after the loop (needs neighbours)
            params[o4] = Math.round((s / (b.length * endCut)) * 255);
            params[o4 + 1] = Math.round(loose * 255);
            params[o4 + 2] = Math.round(fibreSeed * 255);
            params[o4 + 3] = Math.round(ao * 255);
            v++;
          }
          for (let k = 0; k < 3; k++) {
            if (p[k]! < min[k]!) min[k] = p[k]!;
            if (p[k]! > max[k]!) max[k] = p[k]!;
          }
          samplesUsed++;
        }

        // Tangents from neighbouring samples of this fibre.
        for (let i = 0; i < samplesUsed; i++) {
          const ia = first + Math.max(0, i - 1) * 2;
          const ic = first + Math.min(samplesUsed - 1, i + 1) * 2;
          const t = norm([
            positions[ic * 3]! - positions[ia * 3]!,
            positions[ic * 3 + 1]! - positions[ia * 3 + 1]!,
            positions[ic * 3 + 2]! - positions[ia * 3 + 2]!,
          ]);
          for (let side = 0; side < 2; side++) {
            const o4 = (first + i * 2 + side) * 4;
            tangents[o4] = Math.round(t[0] * 127);
            tangents[o4 + 1] = Math.round(t[1] * 127);
            tangents[o4 + 2] = Math.round(t[2] * 127);
            tangents[o4 + 3] = side === 0 ? -127 : 127; // ribbon side
          }
        }
        // Ribbon triangles.
        for (let i = 0; i < samplesUsed - 1; i++) {
          const a = first + i * 2;
          indices[ii++] = a;
          indices[ii++] = a + 1;
          indices[ii++] = a + 2;
          indices[ii++] = a + 1;
          indices[ii++] = a + 3;
          indices[ii++] = a + 2;
        }
        fibreCount++;
      }
    }
  }

  return {
    positions: positions.subarray(0, v * 3),
    tangents: tangents.subarray(0, v * 4),
    params: params.subarray(0, v * 4),
    indices: indices.subarray(0, ii),
    fibreCount,
    vertexCount: v,
    triangleCount: ii / 3,
    bounds: { min, max },
  };
}
