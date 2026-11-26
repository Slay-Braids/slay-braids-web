/**
 * Chapter 3 guide strand (isolated change I2). Read-only use of the locked scene.
 *
 * The ivory page edge must follow the rendered hair. So instead of approximating the hair,
 * this module:
 *  1. splits the scene's own geometry buffers into fibres (no geometry change),
 *  2. selects the fibres that form the hair's outer boundary at the Chapter 3 pose,
 *  3. moves their points with an exact copy of the locked vertex shader's displacement
 *     (wind sway + flutter + pointer push), using the uniform values the scene sent to the GPU
 *     for the frame just rendered (FrameState),
 *  4. projects them through the same camera matrices into CSS pixels,
 *  5. returns the outer envelope of those points: the page edge.
 *
 * The transition lab verifies step 3–4 against the GPU itself (probe.ts).
 */
import type { CascadeGeometryData, Orientation } from "../cascade/geometry";
import type { FrameState } from "../cascade/CascadeScene";

const f = Math.fround;

/** How far past the screen edge the page extends where no hair reaches (px). */
export const EDGE_PAD = 160;

/** The page edge follows the K-th furthest fibre per row (outer clump, not single strays). */
export const CLUMP_RANK = 6;
/** Fibre stretches further than this inside the furthest reach of their row are not evaluated. */
export const TRIM_PX = 140;
/** Reach pulled in at a fully faded fibre tip, px. */
export const TIP_PX = 48;

/**
 * The px constants above (and the edge smoothing) are tuned at the reference viewports,
 * 1440×900 and 412×915. They scale with the hair's size on screen, so the page edge has the same
 * shape at every viewport size, including the 2560 px renders of the static stills.
 */
export function pxScale(o: Orientation, cssWidth: number, cssHeight: number) {
  return o === "landscape" ? cssHeight / 900 : cssWidth / 412;
}

export interface Fibre {
  start: number; // first sample index (vertex = 2 * sample)
  count: number;
}

/** Split the ribbon buffer into fibres: along-fibre t restarts at each new fibre. */
export function splitFibres(g: CascadeGeometryData): Fibre[] {
  const fibres: Fibre[] = [];
  const samples = g.vertexCount / 2;
  let start = 0;
  let prevT = -1;
  for (let s = 0; s < samples; s++) {
    const t = g.params[s * 2 * 4]!;
    if (s > 0 && t < prevT) {
      fibres.push({ start, count: s - start });
      start = s;
    }
    prevT = t;
  }
  fibres.push({ start, count: samples - start });
  return fibres;
}

/** Exact copy of the locked vertex shader's displacement, in 32-bit float steps. */
export function displace(
  px: number,
  py: number,
  pz: number,
  tByte: number,
  looseByte: number,
  seedByte: number,
  fs: FrameState,
  out: Float64Array,
) {
  const t = f(tByte / 255);
  const loose = f(looseByte / 255);
  const seed = f(seedByte / 255);
  const time = f(fs.time);
  const wind = f(fs.wind);
  const tip = f(t * t);
  const swayX = f(Math.sin(f(f(py * 0.9) + f(pz * 0.7) + f(time * 0.55))));
  const swayY = f(0.35 * Math.sin(f(f(px * 0.8) + f(time * 0.43))));
  const swayZ = f(0.6 * Math.sin(f(f(px * 0.6) + f(py * 0.5) + f(time * 0.37))));
  const flX = f(Math.sin(f(t * 23.0 + time * 1.7 + seed * 40.0)));
  const flY = f(Math.cos(f(t * 19.0 + time * 1.3 + seed * 31.0)));
  const flZ = f(0.5 * Math.sin(f(t * 17.0 + time * 1.1 + seed * 17.0)));
  const swayK = f(0.025 + 0.085 * tip);
  const flK = f(0.02 * loose * (0.3 + tip));
  let x = f(px + wind * (swayX * swayK + flX * flK));
  let y = f(py + wind * (swayY * swayK + flY * flK));
  let z = f(pz + wind * (swayZ * swayK + flZ * flK));

  // Pointer push (screen-space), identical to the shader.
  if (fs.pointerForce > 0) {
    const P = fs.projection;
    const V = fs.view;
    const vx = V[0]! * x + V[4]! * y + V[8]! * z + V[12]!;
    const vy = V[1]! * x + V[5]! * y + V[9]! * z + V[13]!;
    const vz = V[2]! * x + V[6]! * y + V[10]! * z + V[14]!;
    const cx = P[0]! * vx + P[4]! * vy + P[8]! * vz + P[12]!;
    const cy = P[1]! * vx + P[5]! * vy + P[9]! * vz + P[13]!;
    const cw = P[3]! * vx + P[7]! * vy + P[11]! * vz + P[15]!;
    const dx = (cx / cw - fs.pointer[0]) * fs.aspect;
    const dy = cy / cw - fs.pointer[1];
    const r2 = dx * dx + dy * dy;
    const force = fs.pointerForce * Math.exp(-r2 / 0.05);
    const inv = 1 / Math.sqrt(Math.max(r2, 1e-6));
    const dist = -vz;
    const k = force * dist * 0.055 * (0.12 + 0.88 * loose) * (0.35 + 0.65 * t);
    x = f(x + (fs.camRight[0] * dx * inv + fs.camUp[0] * dy * inv) * k);
    y = f(y + (fs.camRight[1] * dx * inv + fs.camUp[1] * dy * inv) * k);
    z = f(z + (fs.camRight[2] * dx * inv + fs.camUp[2] * dy * inv) * k);
  }
  out[0] = x;
  out[1] = y;
  out[2] = z;
}

/** World point → CSS pixels for the frame (same matrices and divide as the GPU). */
export function project(x: number, y: number, z: number, fs: FrameState, out: Float64Array) {
  const P = fs.projection;
  const V = fs.view;
  const vx = V[0]! * x + V[4]! * y + V[8]! * z + V[12]!;
  const vy = V[1]! * x + V[5]! * y + V[9]! * z + V[13]!;
  const vz = V[2]! * x + V[6]! * y + V[10]! * z + V[14]!;
  const cx = P[0]! * vx + P[4]! * vy + P[8]! * vz + P[12]!;
  const cy = P[1]! * vx + P[5]! * vy + P[9]! * vz + P[13]!;
  const cw = P[3]! * vx + P[7]! * vy + P[11]! * vz + P[15]!;
  out[0] = ((cx / cw) * 0.5 + 0.5) * fs.cssWidth;
  out[1] = (1 - ((cy / cw) * 0.5 + 0.5)) * fs.cssHeight;
}

export interface GuidePoint {
  sample: number;
}

export class GuideStrand {
  readonly fibres: Fibre[];
  /** Selected boundary fibres (indices into `fibres`). */
  candidates: number[] = [];
  /** Sample indices of the loose part of the candidate fibres, in order per fibre. */
  private runs: { from: number; to: number }[] = [];
  private tmp = new Float64Array(3);
  /** Per guide point (evaluation order): how far its reach is pulled in at a faded tip, px. */
  private tipPenalty = new Float64Array(0);
  private scr = new Float64Array(2);

  constructor(
    private readonly g: CascadeGeometryData,
    private readonly orientation: Orientation,
  ) {
    this.fibres = splitFibres(g);
  }

  /** Total guide points per frame (for the probe and the performance report). */
  get pointCount() {
    return this.runs.reduce((n, r) => n + (r.to - r.from), 0);
  }

  /** Sample indices in evaluation order (for the GPU probe). */
  sampleIndices(): number[] {
    const out: number[] = [];
    for (const r of this.runs) for (let s = r.from; s < r.to; s++) out.push(s);
    return out;
  }

  /**
   * Choose the boundary fibres at the given (Chapter 3) frame: for each of `rows` bands, the
   * `perRow` fibres reaching furthest towards the page side. Uses the undisplaced pose; twice
   * CLUMP_RANK per band gives headroom for the wind and the pointer.
   */
  select(fs: FrameState, rows = 48, perRow = 12) {
    const landscape = this.orientation === "landscape";
    const extent = landscape ? fs.cssHeight : fs.cssWidth;
    const best: { v: number; fi: number }[][] = Array.from({ length: rows }, () => []);
    const pos = this.g.positions;
    const par = this.g.params;
    this.fibres.forEach((fib, fi) => {
      const rowMax = new Map<number, number>();
      for (let s = fib.start; s < fib.start + fib.count; s += 2) {
        const v = s * 2;
        if (par[v * 4 + 1]! < 128) continue; // loose part only
        project(pos[v * 3]!, pos[v * 3 + 1]!, pos[v * 3 + 2]!, fs, this.scr);
        const along = landscape ? this.scr[1]! : this.scr[0]!;
        const across = landscape ? this.scr[0]! : this.scr[1]!;
        const r = Math.floor((along / extent) * rows);
        if (r < 0 || r >= rows) continue;
        rowMax.set(r, Math.max(rowMax.get(r) ?? -Infinity, across));
      }
      rowMax.forEach((v, r) => best[r]!.push({ v, fi }));
    });
    const chosen = new Set<number>();
    for (const b of best)
      b.sort((a, c) => c.v - a.v)
        .slice(0, perRow)
        .forEach((e) => chosen.add(e.fi));
    this.candidates = [...chosen];
    const loose = this.candidates.map((fi) => {
      const fib = this.fibres[fi]!;
      let from = fib.start;
      while (from < fib.start + fib.count && par[from * 2 * 4 + 1]! < 64) from++;
      return { from: Math.max(fib.start, from - 1), to: fib.start + fib.count };
    });
    // Keep only the stretch of each fibre that comes within TRIM_PX of the furthest reach in its
    // row: points further inside can never become the page edge (wind and pointer move a fibre
    // by far less), so evaluating them every frame would only cost time.
    const fine = 192;
    const scale = pxScale(this.orientation, fs.cssWidth, fs.cssHeight);
    const furthest = new Float64Array(fine).fill(-Infinity);
    const across = loose.map((r) => {
      const a = new Float64Array(r.to - r.from);
      const rw = new Int32Array(r.to - r.from);
      for (let s = r.from; s < r.to; s++) {
        const v = s * 2;
        project(pos[v * 3]!, pos[v * 3 + 1]!, pos[v * 3 + 2]!, fs, this.scr);
        const al = landscape ? this.scr[1]! : this.scr[0]!;
        const c = landscape ? this.scr[0]! : this.scr[1]!;
        const row = Math.floor((al / extent) * fine);
        a[s - r.from] = c;
        rw[s - r.from] = row;
        if (row >= 0 && row < fine && c > furthest[row]!) furthest[row] = c;
      }
      return { a, rw };
    });
    this.runs = [];
    loose.forEach((r, i) => {
      const { a, rw } = across[i]!;
      let lo = -1;
      let hi = -1;
      for (let k = 0; k < a.length; k++) {
        const row = rw[k]!;
        if (row < 0 || row >= fine) continue;
        if (a[k]! >= furthest[row]! - TRIM_PX * scale) {
          if (lo < 0) lo = k;
          hi = k;
        }
      }
      if (lo < 0) return;
      this.runs.push({
        from: r.from + Math.max(0, lo - 2),
        to: r.from + Math.min(a.length, hi + 3),
      });
    });
    // Tip weighting, from the shader's own tip fade (smoothstep 0.86–1 in t): faded tips are
    // invisible, so they must not hold the page edge out, and a tip crossing a row line can then
    // never make the edge jump.
    const pen: number[] = [];
    for (const r of this.runs) {
      for (let s = r.from; s < r.to; s++) {
        const t = par[s * 2 * 4]! / 255;
        const k = Math.min(1, Math.max(0, (t - 0.86) / 0.14));
        pen.push(k * k * (3 - 2 * k) * TIP_PX * scale);
      }
    }
    this.tipPenalty = Float64Array.from(pen);
  }

  /**
   * Displaced, projected guide points for this frame, in CSS px (x, y interleaved), plus the
   * run boundaries so callers can treat each fibre as a polyline.
   */
  points(fs: FrameState): { xy: Float64Array; runs: { from: number; to: number }[] } {
    const pos = this.g.positions;
    const par = this.g.params;
    const xy = new Float64Array(this.pointCount * 2);
    const runs: { from: number; to: number }[] = [];
    let k = 0;
    for (const r of this.runs) {
      const from = k;
      for (let s = r.from; s < r.to; s++) {
        const v = s * 2;
        displace(
          pos[v * 3]!,
          pos[v * 3 + 1]!,
          pos[v * 3 + 2]!,
          par[v * 4]!,
          par[v * 4 + 1]!,
          par[v * 4 + 2]!,
          fs,
          this.tmp,
        );
        project(this.tmp[0]!, this.tmp[1]!, this.tmp[2]!, fs, this.scr);
        xy[k * 2] = this.scr[0]!;
        xy[k * 2 + 1] = this.scr[1]!;
        k++;
      }
      runs.push({ from, to: k });
    }
    return { xy, runs };
  }

  /**
   * Outer envelope of the guide fibres: `rows` points along the screen (top→bottom in
   * landscape, left→right in portrait), each the furthest hair reaches towards the page.
   * Segments are interpolated, so the envelope follows the rendered polylines exactly. The raw
   * envelope is then "closed" (see closeEnvelope): stray single-fibre spikes become soft bumps,
   * and the result is never inside the raw envelope, so the page edge never cuts into the hair.
   */
  edge(fs: FrameState, rows = 96, closePx = 36): [number, number][] {
    const { xy, runs } = this.points(fs);
    return this.edgeFromPoints(xy, runs, fs.cssWidth, fs.cssHeight, rows, closePx);
  }

  /** The envelope of given guide points (CPU or GPU-probed: the lab compares both). */
  edgeFromPoints(
    xy: Float64Array,
    runs: { from: number; to: number }[],
    cssWidth: number,
    cssHeight: number,
    rows = 96,
    closePx = 36,
    clumpRank = CLUMP_RANK,
  ): [number, number][] {
    const landscape = this.orientation === "landscape";
    const along = landscape ? cssHeight : cssWidth;
    const scale = pxScale(this.orientation, cssWidth, cssHeight);
    const close = Math.max(3, Math.round((closePx * scale) / (along / rows)));
    // Per row, each fibre's furthest reach; the page edge is the `clumpRank`-th furthest fibre,
    // i.e. the outer boundary of the clump. The few strays beyond it pass under the page.
    const reach = new Float64Array((rows + 1) * runs.length).fill(-Infinity);
    const A = (i: number) => (landscape ? xy[i * 2 + 1]! : xy[i * 2]!);
    const C = (i: number) => (landscape ? xy[i * 2]! : xy[i * 2 + 1]!);
    runs.forEach((r, fi) => {
      const base = fi * (rows + 1);
      for (let i = r.from; i < r.to - 1; i++) {
        const a0 = A(i),
          a1 = A(i + 1);
        const c0 = C(i) - (this.tipPenalty[i] ?? 0);
        const c1 = C(i + 1) - (this.tipPenalty[i + 1] ?? 0);
        const lo = Math.max(0, Math.ceil((Math.min(a0, a1) / along) * rows));
        const hi = Math.min(rows, Math.floor((Math.max(a0, a1) / along) * rows));
        for (let row = lo; row <= hi; row++) {
          const a = (row / rows) * along;
          const u = a1 === a0 ? 0 : (a - a0) / (a1 - a0);
          const c = c0 + (c1 - c0) * Math.min(1, Math.max(0, u));
          if (c > reach[base + row]!) reach[base + row] = c;
        }
      }
    });
    const env = new Float64Array(rows + 1).fill(-Infinity);
    const col: number[] = [];
    for (let row = 0; row <= rows; row++) {
      col.length = 0;
      for (let fi = 0; fi < runs.length; fi++) {
        const v = reach[fi * (rows + 1) + row]!;
        if (v > -Infinity) col.push(v);
      }
      if (!col.length) continue;
      col.sort((x, y) => y - x);
      env[row] = col[Math.min(clumpRank - 1, col.length - 1)]!;
    }
    // Rows the hair does not reach: there is no hair to meet, so the page runs past the screen
    // edge there (it sweeps under the tips instead of being cut around empty space).
    if (!env.some((v) => Number.isFinite(v))) return [];
    const beyond = -EDGE_PAD * scale;
    for (let i = 0; i <= rows; i++) if (!Number.isFinite(env[i]!)) env[i] = beyond;
    const sm = closeEnvelope(env, close);
    const out: [number, number][] = [];
    for (let i = 0; i <= rows; i++) {
      const a = (i / rows) * along;
      out.push(landscape ? [sm[i]!, a] : [a, sm[i]!]);
    }
    return out;
  }
}

/**
 * Morphological closing in 1-D, outward-biased: a running max over ±r rows followed by a running
 * mean over ±r rows. Every mean window contains the row itself in each of its max windows, so
 * out[i] ≥ env[i] for all i (proof: each averaged term is a max over a window containing i).
 */
export function closeEnvelope(env: ArrayLike<number>, r: number): Float64Array {
  const n = env.length;
  const mx = new Float64Array(n);
  for (let i = 0; i < n; i++) {
    let m = -Infinity;
    for (let j = Math.max(0, i - r); j <= Math.min(n - 1, i + r); j++) m = Math.max(m, env[j]!);
    mx[i] = m;
  }
  const out = new Float64Array(n);
  for (let i = 0; i < n; i++) {
    let sum = 0;
    let c = 0;
    for (let j = i - r; j <= i + r; j++) {
      const k = Math.min(n - 1, Math.max(0, j)); // clamp: edge rows repeat
      sum += mx[k]!;
      c++;
    }
    out[i] = sum / c;
  }
  return out;
}
