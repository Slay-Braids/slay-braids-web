/**
 * Scroll → camera progress. Loaded lazily with the live scene (never on tier C).
 * GSAP ScrollTrigger is the single animation/scroll engine; Lenis smooths wheel scrolling on
 * desktop only (native scrolling is kept on touch devices).
 */
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import type Lenis from "lenis";

export async function bindScrollCamera(
  root: HTMLElement,
  onProgress: (p: number) => void,
  opts: { smooth: boolean },
): Promise<() => void> {
  gsap.registerPlugin(ScrollTrigger);
  ScrollTrigger.config({ ignoreMobileResize: true });

  let lenis: Lenis | undefined;
  let tick: ((time: number) => void) | undefined;
  if (opts.smooth) {
    const { default: Lenis } = await import("lenis");
    const instance = new Lenis({ autoRaf: false, lerp: 0.12 });
    instance.on("scroll", () => ScrollTrigger.update());
    tick = (time: number) => instance.raf(time * 1000);
    lenis = instance;
    gsap.ticker.add(tick);
    gsap.ticker.lagSmoothing(0);
  }

  const scrollRoot = root.querySelector<HTMLElement>("[data-scroll-root]") ?? root;
  const st = ScrollTrigger.create({
    trigger: scrollRoot,
    start: "top top",
    end: "bottom bottom",
    onUpdate: (self) => onProgress(self.progress),
  });
  onProgress(st.progress);

  return () => {
    st.kill();
    if (tick) gsap.ticker.remove(tick);
    lenis?.destroy();
  };
}
