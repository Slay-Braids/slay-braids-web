/**
 * Chapter 3 ivory page (isolated change I3): an SVG layer above the hair canvas and below the
 * type. The hair is never cut out or re-lit; the page lies on top and only its edge meets the
 * ink. Edge treatments (each switchable in the lab):
 *  - highlight: 1 px line in the brand red (production identity; was champagne in M2)
 *  - paper shadow: soft inner shadow on the paper side (its thickness)
 *  - contact shadow: soft darkening on the hair side, so the page reads as resting on the hair
 *  - light spill: warm glow on the paper near the projected softbox pool, same light colour
 */
export type Side = "right" | "bottom";

export interface PaperToggles {
  highlight: boolean;
  paperShadow: boolean;
  contactShadow: boolean;
  spill: boolean;
}

export interface PaperFrame {
  edge: [number, number][];
  side: Side;
  /** 0 = off screen, 1 = fully open. */
  open: number;
  /** 0 = resting against the hair, 1 = covering the whole screen. */
  away: number;
  /** M3: forced edge straightening 0–1 (default: derived from `away`, as in Chapter 3). */
  straighten?: number;
  /** v3 bright identity: the page's colour and its edge line (default white page, red line). */
  fill?: string;
  edge_?: string;
  width: number;
  height: number;
  /** Gap between the hair envelope and the page edge, px. */
  gap: number;
  spill?: { x: number; y: number };
  toggles: PaperToggles;
}

const NS = "http://www.w3.org/2000/svg";
// Production identity (red, black, white): a white page with a fine red edge.
const IVORY = "#FFFFFF";
const ESPRESSO = "0,0,0";
const CHAMPAGNE = "198,13,19";

export const DEFAULT_TOGGLES: PaperToggles = {
  highlight: true,
  paperShadow: true,
  contactShadow: true,
  spill: false, // the warm light spill belonged to the champagne look
};

function el<K extends keyof SVGElementTagNameMap>(name: K, attrs: Record<string, string> = {}) {
  const e = document.createElementNS(NS, name);
  for (const [k, v] of Object.entries(attrs)) e.setAttribute(k, v);
  return e;
}

export class Paper {
  private svg: SVGSVGElement;
  private group: SVGGElement;
  private paperClip: SVGPathElement;
  private hairClip: SVGPathElement;
  private fill: SVGRectElement;
  private spill: SVGRectElement;
  private spillGrad: SVGRadialGradientElement;
  private innerShadows: SVGPathElement[] = [];
  private contactShadows: SVGPathElement[] = [];
  private highlight: SVGPathElement;
  private uid = Math.random().toString(36).slice(2, 8);
  private lastFill = "";
  /** Last drawn edge (screen px), for hit tests. */
  private last?: { edge: [number, number][]; side: Side; visible: boolean; full: boolean };

  constructor(private readonly host: SVGSVGElement) {
    this.svg = host;
    this.svg.setAttribute("aria-hidden", "true");
    const defs = el("defs");
    const pc = el("clipPath", { id: `paper-${this.uid}` });
    this.paperClip = el("path");
    pc.append(this.paperClip);
    const hc = el("clipPath", { id: `hair-${this.uid}` });
    this.hairClip = el("path");
    hc.append(this.hairClip);
    this.spillGrad = el("radialGradient", {
      id: `spill-${this.uid}`,
      gradientUnits: "userSpaceOnUse",
    });
    this.spillGrad.append(
      el("stop", { offset: "0", "stop-color": `rgb(${CHAMPAGNE})`, "stop-opacity": "0.22" }),
      el("stop", { offset: "0.55", "stop-color": `rgb(${CHAMPAGNE})`, "stop-opacity": "0.06" }),
      el("stop", { offset: "1", "stop-color": `rgb(${CHAMPAGNE})`, "stop-opacity": "0" }),
    );
    // Soft shadows: one stroke each, blurred (stepped strokes read as bands at close range).
    const blur = (id: string, sd: number) => {
      const f = el("filter", {
        id,
        x: "-400",
        y: "-400",
        width: "6000",
        height: "6000",
        filterUnits: "userSpaceOnUse",
      });
      f.append(el("feGaussianBlur", { stdDeviation: String(sd) }));
      return f;
    };
    defs.append(
      pc,
      hc,
      this.spillGrad,
      blur(`soft-${this.uid}`, 7),
      blur(`contact-${this.uid}`, 14),
    );

    this.group = el("g");
    const paperLayer = el("g", { "clip-path": `url(#paper-${this.uid})` });
    this.fill = el("rect", { x: "-200", y: "-200", fill: IVORY });
    this.spill = el("rect", { x: "-200", y: "-200", fill: `url(#spill-${this.uid})` });
    // No texture of its own: the site-wide film grain lies over the page as over everything else.
    paperLayer.append(this.fill, this.spill);
    // Paper thickness: soft espresso falloff just inside the edge.
    for (const [w, a, sd] of [
      [3, 0.1, 0],
      [26, 0.13, 1],
    ] as const) {
      const p = el("path", {
        fill: "none",
        stroke: `rgba(${ESPRESSO},${a})`,
        "stroke-width": String(w),
        "stroke-linejoin": "round",
      });
      if (sd) p.setAttribute("filter", `url(#soft-${this.uid})`);
      this.innerShadows.push(p);
      paperLayer.append(p);
    }
    const hairLayer = el("g", { "clip-path": `url(#hair-${this.uid})` });
    for (const [w, a] of [[48, 0.5]] as const) {
      const p = el("path", {
        fill: "none",
        stroke: `rgba(0,0,0,${a})`,
        "stroke-width": String(w),
        "stroke-linejoin": "round",
        filter: `url(#contact-${this.uid})`,
      });
      this.contactShadows.push(p);
      hairLayer.append(p);
    }
    this.highlight = el("path", {
      fill: "none",
      stroke: `rgba(${CHAMPAGNE},0.9)`,
      "stroke-width": "1",
      "stroke-linejoin": "round",
    });
    this.group.append(hairLayer, paperLayer, this.highlight);
    this.svg.append(defs, this.group);
  }

  hide() {
    this.svg.style.visibility = "hidden";
    if (this.last) this.last.visible = false;
  }

  /** Is the screen point (CSS px) on the ivory page as last drawn? */
  covers(x: number, y: number): boolean {
    const L = this.last;
    if (!L || !L.visible) return false;
    if (L.full) return true;
    const e = L.edge;
    if (L.side === "right") return x > interp(e, y, 1, 0);
    return y > interp(e, x, 0, 1);
  }

  /**
   * Draws the page and returns its offset from the resting place (px, along x for "right", y for
   * "bottom"), so content printed on the page can travel with it.
   *  - open 0→1: the page arrives from off screen and comes to rest `gap` px from the hair.
   *  - away 0→1: the page continues over the hair until it covers the screen; its edge relaxes
   *    from the hair's shape to a straight line on the way (a hair-shaped cut-out never travels
   *    away from the hair it was cut to).
   */
  render(fr: PaperFrame): { off: number; fromCover: number } | undefined {
    if (fr.open <= 0.0005 || fr.edge.length < 2) {
      this.hide();
      return undefined;
    }
    this.svg.style.visibility = "visible";
    if (fr.fill && fr.fill !== this.lastFill) {
      this.lastFill = fr.fill;
      this.fill.setAttribute("fill", fr.fill);
      this.highlight.setAttribute("stroke", fr.edge_ ?? `rgba(${CHAMPAGNE},0.9)`);
    }
    const W = fr.width;
    const H = fr.height;
    this.svg.setAttribute("viewBox", `0 0 ${W} ${H}`);
    for (const r of [this.fill, this.spill]) {
      r.setAttribute("width", String(W + 400));
      r.setAttribute("height", String(H + 400));
    }
    const right = fr.side === "right";
    const o = right ? 0 : 1; // coordinate the page moves along
    const a = right ? 1 : 0; // coordinate along the edge
    const extent = right ? W : H;

    if (fr.away >= 0.9995) {
      // Full cover: the page is the whole screen (I4 lets the render loop pause here).
      const full = `M-300 -300H${W + 300}V${H + 300}H-300Z`;
      this.paperClip.setAttribute("d", full);
      this.hairClip.setAttribute("d", "M0 0Z");
      for (const p of [...this.innerShadows, ...this.contactShadows, this.highlight])
        p.style.display = "none";
      this.spill.style.display = "none";
      this.last = { edge: [], side: fr.side, visible: true, full: true };
      return { off: -extent, fromCover: 0 };
    }

    const vals = fr.edge.map((p) => p[o]);
    const min = Math.min(...vals);
    const max = Math.max(...vals);
    const mean = vals.reduce((s, v) => s + v, 0) / vals.length;
    const straighten = fr.straighten ?? smoothstep(fr.away / 0.6);
    const off = (1 - fr.open) * (extent - min + 80) - fr.away * (max + fr.gap + 80);
    const placed: [number, number][] = fr.edge.map((p) => {
      const v = p[o] + (mean - p[o]) * straighten + off + fr.gap;
      return right ? [v, p[a]] : [p[a], v];
    });
    const line = placed
      .map((p, i) => `${i ? "L" : "M"}${p[0].toFixed(2)} ${p[1].toFixed(2)}`)
      .join("");
    const first = placed[0]!;
    const last = placed.at(-1)!;
    // Close the edge polyline into the page region and the hair region (both run far past the
    // frame so no stroke or clip ever ends on screen).
    if (right) {
      this.paperClip.setAttribute(
        "d",
        `M${first[0]} -300${line.replace("M", "L")}L${last[0]} ${H + 300}L${W + 300} ${H + 300}L${W + 300} -300Z`,
      );
      this.hairClip.setAttribute(
        "d",
        `M${first[0]} -300${line.replace("M", "L")}L${last[0]} ${H + 300}L-300 ${H + 300}L-300 -300Z`,
      );
    } else {
      this.paperClip.setAttribute(
        "d",
        `M-300 ${first[1]}${line.replace("M", "L")}L${W + 300} ${last[1]}L${W + 300} ${H + 300}L-300 ${H + 300}Z`,
      );
      this.hairClip.setAttribute(
        "d",
        `M-300 ${first[1]}${line.replace("M", "L")}L${W + 300} ${last[1]}L${W + 300} -300L-300 -300Z`,
      );
    }
    for (const p of this.innerShadows) {
      p.setAttribute("d", line);
      p.style.display = fr.toggles.paperShadow ? "" : "none";
    }
    for (const p of this.contactShadows) {
      p.setAttribute("d", line);
      p.style.display = fr.toggles.contactShadow ? "" : "none";
    }
    this.highlight.setAttribute("d", line);
    this.highlight.style.display = fr.toggles.highlight ? "" : "none";
    if (fr.spill && fr.toggles.spill) {
      this.spill.style.display = "";
      this.spill.setAttribute("opacity", (1 - fr.away).toFixed(3));
      this.spillGrad.setAttribute("cx", fr.spill.x.toFixed(1));
      this.spillGrad.setAttribute("cy", fr.spill.y.toFixed(1));
      this.spillGrad.setAttribute("r", (Math.max(W, H) * 0.55).toFixed(1));
    } else {
      this.spill.style.display = "none";
    }
    this.last = { edge: placed, side: fr.side, visible: true, full: false };
    // fromCover: how far the page has travelled from the place it covers the screen from, so
    // type printed on the covering page can ride it as it draws back (Chapter 4).
    return { off, fromCover: off + (max + fr.gap + 80) };
  }
}

const smoothstep = (x: number) => {
  const t = Math.min(1, Math.max(0, x));
  return t * t * (3 - 2 * t);
};

/** Value of the edge's `out` coordinate at `at` along its `along` coordinate (edge is sorted). */
function interp(e: [number, number][], at: number, outIdx: 0 | 1, alongIdx: 0 | 1): number {
  if (at <= e[0]![alongIdx]) return e[0]![outIdx];
  for (let i = 1; i < e.length; i++) {
    const a = e[i - 1]!;
    const b = e[i]!;
    if (at <= b[alongIdx]) {
      const u = (at - a[alongIdx]) / (b[alongIdx] - a[alongIdx] || 1);
      return a[outIdx] + (b[outIdx] - a[outIdx]) * u;
    }
  }
  return e.at(-1)![outIdx];
}
