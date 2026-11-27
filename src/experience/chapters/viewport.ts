/** Viewport-height helpers shared by the controller and the chapters (tiny, no deps). */
/** One CSS viewport height in px, as used by the chapter layout (set once per width). */
export function vhPx(): number {
  const v = parseFloat(getComputedStyle(document.documentElement).getPropertyValue("--vh"));
  return Number.isFinite(v) && v > 0 ? v : innerHeight / 100;
}

/** Fix --vh to the current viewport; mobile URL-bar resizes keep it (no layout jumps). */
export function syncVh(force = false) {
  const root = document.documentElement;
  const w = String(innerWidth);
  if (!force && root.dataset.vhWidth === w) return;
  root.dataset.vhWidth = w;
  root.style.setProperty("--vh", `${innerHeight / 100}px`);
}
