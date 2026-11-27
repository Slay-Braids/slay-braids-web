/** Editorial text reveals: CSS transitions toggled by IntersectionObserver (no library). */
export function initReveals(root: HTMLElement) {
  const els = root.querySelectorAll<HTMLElement>("[data-reveal]");
  if (
    document.documentElement.dataset.reducedMotion === "true" ||
    !("IntersectionObserver" in window)
  ) {
    els.forEach((el) => el.setAttribute("data-revealed", "true"));
    return;
  }
  const io = new IntersectionObserver(
    (entries) => {
      for (const e of entries) {
        if (e.isIntersecting) {
          e.target.setAttribute("data-revealed", "true");
          io.unobserve(e.target);
        }
      }
    },
    { threshold: 0.25 },
  );
  els.forEach((el) => io.observe(el));
}
