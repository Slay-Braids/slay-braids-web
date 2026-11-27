/**
 * Brand footage playback, every tier. A clip plays only while:
 *  - it is on screen (its chapter frame is shown in the live experience, its product step is the
 *    active one, and its box intersects the viewport),
 *  - motion is allowed (no reduced motion), and
 *  - the visitor has not paused motion with the header control (WCAG 2.2.2).
 * Clips load only when first needed (preload="none"); posters show until then.
 */
const reduced = () =>
  /(^|[?&#,])reduced(=1)?($|[&,])/.test(location.search + location.hash) ||
  document.documentElement.dataset.reducedMotion === "true" ||
  matchMedia("(prefers-reduced-motion: reduce)").matches;

export function initMedia(root: HTMLElement) {
  const videos = [...root.querySelectorAll<HTMLVideoElement>("[data-loop-video]")];
  const toggle = document.querySelector<HTMLButtonElement>("[data-motion-toggle]");
  let paused = reduced();
  const label = () => {
    if (!toggle) return;
    toggle.setAttribute("aria-pressed", String(paused));
    toggle.querySelector("[data-motion-label]")!.textContent = paused ? "Play video" : "Pause video";
  };
  label();
  toggle?.addEventListener("click", () => {
    paused = !paused;
    label();
    tick();
  });

  const shouldPlay = (v: HTMLVideoElement) => {
    if (paused || document.hidden) return false;
    const isStatic = document.documentElement.dataset.static === "true";
    if (!isStatic) {
      const frame = v.closest<HTMLElement>(".chapter-frame");
      if (frame && frame.dataset.visible !== "true") return false;
      const step = v.closest<HTMLElement>("[data-product]");
      if (step && step.dataset.active !== "true") return false;
      if (frame && parseFloat(getComputedStyle(frame).opacity) < 0.05) return false;
    }
    const r = v.getBoundingClientRect();
    return r.width > 0 && r.bottom > 0 && r.top < innerHeight && r.right > 0 && r.left < innerWidth;
  };
  let raf = 0;
  const tick = () => {
    raf = 0;
    for (const v of videos) {
      const on = shouldPlay(v);
      if (on && v.paused) {
        if (v.preload === "none") v.preload = "auto";
        void v.play().catch(() => undefined);
      } else if (!on && !v.paused) v.pause();
    }
  };
  const schedule = () => {
    if (!raf) raf = requestAnimationFrame(tick);
  };
  addEventListener("scroll", schedule, { passive: true });
  addEventListener("resize", schedule);
  document.addEventListener("visibilitychange", schedule);
  // Chapter frames change state from the scroll clock; a light poll keeps playback in step.
  setInterval(schedule, 400);
  schedule();
}
