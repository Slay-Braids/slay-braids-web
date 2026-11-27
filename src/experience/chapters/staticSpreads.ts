/**
 * Static / reduced-motion Chapters 1–7 (M3 adds Chapters 4–7) (tier C, reduced motion, B→still downgrade). No three.js.
 *
 * The chapters become printed spreads: every line visible, no pins. Chapters 2 and 3 show stills
 * rendered from the locked scene at K1 and K2 (scripts/render-chapter-stills.mjs, I5), placed in
 * their own frames so still, page and type always scroll together. The Chapter 3 page is drawn
 * once from the edge the live page computes at that pose, mapped through the same object-fit:
 * cover transform as the still, so it meets the still's hair exactly.
 */
import type { Orientation } from "../cascade/geometry";
import { DEFAULT_TOGGLES, Paper } from "./paper";
import { CHAPTERS } from "../../content/chapters";

interface StillManifest {
  version: string;
  edges: Record<Orientation, [number, number][]>;
}

const STILL_SIZE: Record<Orientation, [number, number]> = {
  landscape: [2560, 1440],
  portrait: [1440, 2560],
};
const WIDTHS: Record<Orientation, number[]> = {
  landscape: [1280, 1920, 2560],
  portrait: [720, 1080, 1440],
};

function picture(base: string, ch: "ch2" | "ch3" | "ch4" | "ch5" | "ch7") {
  // M3 stills (Chapters 4, 5, 7) are a separate set with their own manifest (m3-manifest.json).
  const set_ = ch === "ch2" || ch === "ch3" ? "m2" : "m3";
  const set = (o: Orientation, ext: string) =>
    WIDTHS[o].map((w) => `${base}chapters/${set_}-${ch}-${o}-${w}.${ext} ${w}w`).join(", ");
  const p = document.createElement("picture");
  p.className = "spread-still";
  p.setAttribute("aria-hidden", "true");
  p.innerHTML = `
    <source media="(orientation: portrait)" type="image/avif" srcset="${set("portrait", "avif")}" sizes="100vw">
    <source media="(orientation: portrait)" type="image/webp" srcset="${set("portrait", "webp")}" sizes="100vw">
    <source media="(orientation: portrait)" srcset="${set("portrait", "jpg")}" sizes="100vw">
    <source type="image/avif" srcset="${set("landscape", "avif")}" sizes="100vw">
    <source type="image/webp" srcset="${set("landscape", "webp")}" sizes="100vw">
    <img src="${base}chapters/${set_}-${ch}-landscape-1920.jpg" srcset="${set("landscape", "jpg")}" sizes="100vw" alt="" loading="lazy" decoding="async">`;
  return p;
}

export function initStaticSpreads(root: HTMLElement, _orientation: Orientation) {
  const base = root.dataset.assetBase ?? "/";
  const ch2 = root.querySelector<HTMLElement>("[data-ch2-frame]");
  const ch3 = root.querySelector<HTMLElement>("[data-ch3-frame]");
  if (ch2 && !ch2.querySelector(".spread-still")) ch2.prepend(picture(base, "ch2"));
  if (ch3 && !ch3.querySelector(".spread-still")) ch3.prepend(picture(base, "ch3"));
  // M3: Chapters 4, 5 and 7 over stills of their poses; Chapter 6 is printed on ivory.
  for (const ch of ["ch4", "ch5", "ch7"] as const) {
    const f = root.querySelector<HTMLElement>(`[data-${ch}-frame]`);
    if (f && !f.querySelector(".spread-still")) f.prepend(picture(base, ch));
  }

  root
    .querySelectorAll<HTMLElement>("[data-ch2-line]")
    .forEach((l) => (l.dataset.state = "active"));
  root.querySelector<HTMLElement>("[data-ch3-line]")?.setAttribute("data-state", "active");
  // Live-mode inline styles (after a B→still downgrade) must not survive into the spreads.
  for (const sel of [
    "[data-hero]",
    "[data-ch3-content]",
    "[data-ch3-portrait]",
    "[data-ch4-frame]",
    "[data-ch4-printed]",
    "[data-ch4-title]",
    "[data-ch4-line]",
    "[data-ch5-frame]",
    "[data-ch6-intro]",
    "[data-ch6-spread]",
    "[data-ch7-frame]",
    "[data-ch7-content]",
  ]) {
    const el = root.querySelector<HTMLElement>(sel);
    if (el) el.removeAttribute("style");
  }
  root.querySelectorAll<HTMLElement>("[data-product]").forEach((p) => (p.dataset.active = "true"));

  // Chapter 3 page, drawn once per frame size.
  let paperRef: Paper | undefined;
  if (ch3) {
    let svg = ch3.querySelector<SVGSVGElement>(".paper-static");
    if (!svg) {
      svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
      svg.classList.add("paper-static");
      ch3.querySelector(".spread-still")?.after(svg);
    }
    const paper = new Paper(svg);
    paperRef = paper;
    let manifest: StillManifest | undefined;
    const draw = () => {
      if (!manifest) return;
      const o: Orientation = matchMedia("(orientation: portrait)").matches
        ? "portrait"
        : "landscape";
      const edgeN = manifest.edges[o];
      if (!edgeN?.length) return;
      const W = ch3.clientWidth;
      const H = ch3.clientHeight;
      const [sw, sh] = STILL_SIZE[o];
      const k = Math.max(W / sw, H / sh);
      const ox = (W - sw * k) / 2;
      const oy = (H - sh * k) / 2;
      paper.render({
        edge: edgeN.map(([x, y]) => [x * sw * k + ox, y * sh * k + oy]),
        side: o === "landscape" ? "right" : "bottom",
        open: 1,
        away: 0,
        width: W,
        height: H,
        gap: 7,
        toggles: { ...DEFAULT_TOGGLES, spill: false },
      });
    };
    void fetch(`${base}chapters/manifest.json`)
      .then((r) => r.json() as Promise<StillManifest>)
      .then((m) => {
        manifest = m;
        draw();
        grounds();
      })
      .catch(() => undefined);
    let t = 0;
    addEventListener("resize", () => {
      clearTimeout(t);
      t = window.setTimeout(draw, 150);
    });
  }

  // Header and index turn espresso wherever ivory lies under them (as in the live chapters).
  const parts = [".logo-slot", ".header-actions", "[data-chapter-index]"]
    .map((q) => root.querySelector<HTMLElement>(q))
    .filter((e): e is HTMLElement => !!e);
  const groundSections = [...root.querySelectorAll<HTMLElement>("[data-ground-section]")];
  const onIvory = (x: number, y: number) => {
    for (const sec of groundSections) {
      const b = sec.getBoundingClientRect();
      if (y >= b.top && y <= b.bottom) return sec.dataset.groundSection === "ivory";
    }
    if (ch3 && paperRef) {
      const b = ch3.getBoundingClientRect();
      if (y >= b.top && y <= b.bottom) return paperRef.covers(x - b.left, y - b.top);
    }
    return false;
  };
  const grounds = () => {
    for (const el of parts) {
      const r = el.getBoundingClientRect();
      el.dataset.ground = onIvory(r.left + r.width / 2, r.top + r.height / 2) ? "ivory" : "ink";
    }
  };
  addEventListener("scroll", grounds, { passive: true });
  grounds();

  // Chapter index follows the section in view.
  const ticks = [...root.querySelectorAll<HTMLElement>("[data-chapter-tick]")];
  const sections = CHAPTERS.map((c) => document.getElementById(c.id));
  if (!("IntersectionObserver" in window)) return;
  const io = new IntersectionObserver(
    (entries) => {
      for (const e of entries) {
        if (!e.isIntersecting) continue;
        const i = sections.indexOf(e.target as HTMLElement);
        ticks.forEach((tk, n) =>
          n === i ? tk.setAttribute("aria-current", "true") : tk.removeAttribute("aria-current"),
        );
      }
    },
    { rootMargin: "-45% 0px -45% 0px" },
  );
  sections.forEach((s) => s && io.observe(s));
}
