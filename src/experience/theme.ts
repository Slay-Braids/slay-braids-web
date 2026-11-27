/**
 * v4 themes: light (white by default) and dark. The theme follows the device's system setting
 * unless the visitor picks one (remembered on the device). `?theme=light|dark` also works.
 *
 * The page declares that it supports both colour schemes, so browsers with their own "dark mode
 * for websites" (Samsung Internet, Chrome's auto-dark) use this dark theme instead of
 * recolouring the page themselves. A picked theme is declared as "only light" / "only dark".
 *
 * The inline script in app/layout.tsx applies the same rules before first paint; this module
 * keeps them in step afterwards (toggle, system changes).
 */
export type Theme = "light" | "dark";
export type ThemeChoice = Theme | "system";
export const THEME_KEY = "slay-theme";

const systemDark = () =>
  typeof matchMedia === "function" && matchMedia("(prefers-color-scheme: dark)").matches;

export function readThemeChoice(): ThemeChoice {
  try {
    const q = new URLSearchParams(location.search).get("theme");
    if (q === "light" || q === "dark") return q;
    const s = localStorage.getItem(THEME_KEY);
    if (s === "light" || s === "dark") return s;
  } catch {
    /* storage blocked: follow the system */
  }
  return "system";
}

export function resolveTheme(choice: ThemeChoice): Theme {
  return choice === "system" ? (systemDark() ? "dark" : "light") : choice;
}

/** The theme in effect (set on <html> before first paint). */
export function currentTheme(): Theme {
  if (typeof document === "undefined") return "light";
  return document.documentElement.dataset.theme === "dark" ? "dark" : "light";
}

/**
 * Pictures with a dark variant carry `data-scheme` sources whose media includes
 * "(prefers-color-scheme: dark)". When the visitor's pick differs from the system, those media
 * queries are rewritten so the picture follows the pick.
 */
export function applySchemeMedia(root: ParentNode = document) {
  const choice = readThemeChoice();
  root.querySelectorAll<HTMLSourceElement>("source[data-scheme]").forEach((s) => {
    const base = s.dataset.schemeMedia ?? s.getAttribute("media") ?? "";
    if (!s.dataset.schemeMedia) s.dataset.schemeMedia = base;
    const scheme =
      choice === "system" ? "(prefers-color-scheme: dark)" : choice === "dark" ? "all" : "not all";
    // The scheme query always comes first ("(prefers-color-scheme: dark) and (orientation: …)"),
    // so "all and (orientation: …)" stays valid; a forced-light source simply never matches.
    s.media = scheme === "not all" ? "not all" : base.replace("(prefers-color-scheme: dark)", scheme);
  });
}

function declare(theme: Theme, choice: ThemeChoice) {
  const html = document.documentElement;
  html.dataset.theme = theme;
  html.style.colorScheme = choice === "system" ? "" : `only ${theme}`;
  const meta = document.querySelector<HTMLMetaElement>('meta[name="color-scheme"]');
  if (meta) meta.content = choice === "system" ? "light dark" : `only ${theme}`;
  document
    .querySelectorAll<HTMLMetaElement>('meta[name="theme-color"]')
    .forEach((m) => (m.content = theme === "dark" ? "#0a0a0a" : "#ffffff"));
}

type Listener = (t: Theme) => void;
const listeners = new Set<Listener>();
export function onThemeChange(fn: Listener) {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

export function setThemeChoice(choice: ThemeChoice) {
  try {
    if (choice === "system") localStorage.removeItem(THEME_KEY);
    else localStorage.setItem(THEME_KEY, choice);
  } catch {
    /* not remembered; still applied for this visit */
  }
  // A ?theme= override in the address would win over the pick: drop it.
  const u = new URL(location.href);
  if (u.searchParams.has("theme")) {
    u.searchParams.delete("theme");
    history.replaceState(history.state, "", u);
  }
  apply();
}

function apply() {
  const choice = readThemeChoice();
  const theme = resolveTheme(choice);
  const changed = currentTheme() !== theme;
  declare(theme, choice);
  applySchemeMedia();
  if (changed) listeners.forEach((fn) => fn(theme));
}

/** Theme buttons (`[data-theme-toggle]`), system changes and the first sync. */
export function initTheme() {
  apply();
  matchMedia("(prefers-color-scheme: dark)").addEventListener?.("change", () => {
    if (readThemeChoice() === "system") apply();
  });
  const label = () => {
    const dark = currentTheme() === "dark";
    document.querySelectorAll<HTMLButtonElement>("[data-theme-toggle]").forEach((b) => {
      b.setAttribute("aria-pressed", String(dark));
      const l = b.querySelector<HTMLElement>("[data-theme-label]");
      if (l) l.textContent = dark ? "Light mode" : "Dark mode";
      if (b.dataset.themeIcon != null) b.setAttribute("aria-label", dark ? "Switch to light mode" : "Switch to dark mode");
    });
  };
  label();
  onThemeChange(label);
  document.addEventListener("click", (e) => {
    const b = (e.target as Element | null)?.closest?.("[data-theme-toggle]");
    if (!b) return;
    const next: Theme = currentTheme() === "dark" ? "light" : "dark";
    // Picking the system's own theme goes back to following the system.
    setThemeChoice(next === resolveTheme("system") ? "system" : next);
  });
}

/** Same logic as readThemeChoice/resolveTheme/declare/applySchemeMedia, inlined before paint. */
export const THEME_BOOT = `(function(){var d=document.documentElement,c="system";try{var q=new URLSearchParams(location.search).get("theme");var s=localStorage.getItem("${THEME_KEY}");c=q==="light"||q==="dark"?q:s==="light"||s==="dark"?s:"system"}catch(e){}var t=c==="system"?(matchMedia("(prefers-color-scheme: dark)").matches?"dark":"light"):c;d.dataset.theme=t;if(c!=="system"){d.style.colorScheme="only "+t;var m=document.querySelector('meta[name="color-scheme"]');if(m)m.content="only "+t}window.__themeChoice=c})();`;

/** Inline, right after a picture with dark sources: follow a picked theme before it loads. */
export const SCHEME_MEDIA_BOOT = `(function(){var c=window.__themeChoice;if(!c||c==="system")return;document.querySelectorAll("source[data-scheme]").forEach(function(s){var b=s.getAttribute("media")||"";s.setAttribute("data-scheme-media",b);s.media=c==="dark"?b.replace("(prefers-color-scheme: dark)","all"):"not all"})})();`;
