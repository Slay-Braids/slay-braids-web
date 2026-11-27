/**
 * Site interactions that work on every tier (live, static and reduced motion): chapter links,
 * focus following, the Chapter 5 showcase controls and the enquiry form. No three.js; small.
 *
 * In the live experience Chapters 4–7 are fixed frames driven by the scroll position, so a
 * chapter link or a keyboard focus must move the scroll position to where that content is on
 * screen. In the static spreads everything is in normal flow and native behaviour is kept.
 */
import { landingVh, productVh } from "./chapters/story";
import { vhPx } from "./chapters/viewport";

type LenisLike = { scrollTo: (y: number, o?: Record<string, unknown>) => void };

const isStatic = () => document.documentElement.dataset.static === "true";
const isLive = () => !isStatic() && document.querySelector('[data-stage][data-live="true"]') != null;
const orientation = () => (matchMedia("(orientation: portrait)").matches ? "portrait" : "landscape");
const reducedMotion = () =>
  document.documentElement.dataset.reducedMotion === "true" ||
  matchMedia("(prefers-reduced-motion: reduce)").matches;

/** Move the scroll position to `vh`. Instant jumps also snap the camera (no flight through
 *  every chapter); short moves (the showcase) glide. */
export function scrollToVh(vh: number, glide = false) {
  const top = Math.round(vh * vhPx());
  const lenis = (window as unknown as { __lenis?: LenisLike }).__lenis;
  if (glide && !reducedMotion()) {
    if (lenis) lenis.scrollTo(top, { duration: 1.1 });
    else scrollTo({ top, behavior: "smooth" });
    return;
  }
  if (lenis) lenis.scrollTo(top, { immediate: true, force: true });
  else scrollTo(0, top);
  dispatchEvent(new CustomEvent("slay:jump", { detail: top }));
}

function focusHeading(section: Element | null) {
  const h = section?.querySelector<HTMLElement>("h2, h1");
  if (!h) return;
  if (!h.hasAttribute("tabindex")) h.setAttribute("tabindex", "-1");
  setTimeout(() => h.focus({ preventScroll: true }), 0);
}

export function initInteractions(root: HTMLElement) {
  // Chapter links (menu, index, footer, CTAs): land each live chapter at its settled state.
  document.addEventListener(
    "click",
    (e) => {
      const a = (e.target as Element | null)?.closest?.("a[href^='#']");
      if (!a || !isLive()) return;
      const id = a.getAttribute("href")!.slice(1);
      const vh = landingVh(orientation(), id);
      if (vh == null) return;
      e.preventDefault();
      history.replaceState(null, "", `#${id}`);
      scrollToVh(vh);
      focusHeading(document.getElementById(id));
    },
    true,
  );

  // Keyboard focus follows into the fixed chapter frames.
  root.addEventListener("focusin", (e) => {
    if (!isLive()) return;
    const el = e.target as HTMLElement;
    const product = el.closest<HTMLElement>("[data-product]");
    if (product && product.dataset.active !== "true") {
      scrollToVh(productVh(orientation(), Number(product.dataset.product)));
      return;
    }
    const frame = el.closest<HTMLElement>(".chapter-frame");
    const section = el.closest<HTMLElement>("section.chapter");
    if (!frame || !section || frame.dataset.visible === "true") return;
    const vh = landingVh(orientation(), section.id);
    if (vh != null) scrollToVh(vh);
  });

  initShowcase(root);
  initEnquiry(root);
  initViewToggle();
}

/**
 * "Simple view / Immersive view": the visitor's choice, remembered on this device. The simple view
 * is the static spreads (no 3D, no scroll-driven frames). Reduced motion always gets it.
 */
function initViewToggle() {
  const buttons = [...document.querySelectorAll<HTMLButtonElement>("[data-view-toggle]")];
  if (!buttons.length) return;
  const reduced = matchMedia("(prefers-reduced-motion: reduce)").matches;
  const label = () => {
    const simple = isStatic();
    for (const b of buttons) {
      b.textContent = simple ? "Switch to immersive view" : "Switch to simple view";
      b.hidden = simple && reduced; // reduced motion: the simple view is the right one
    }
    const note = document.querySelector<HTMLElement>("[data-view-note]");
    if (note)
      note.textContent = simple
        ? "The full experience with the 3D scroll. Best on recent phones and computers."
        : "A lighter version without the 3D scroll, for phones that struggle with it.";
  };
  label();
  // The tier is decided after this runs, and can step down later: keep the label in step.
  new MutationObserver(label).observe(document.documentElement, { attributes: true, attributeFilter: ["data-static"] });
  for (const b of buttons)
    b.addEventListener("click", () => {
      try {
        localStorage.setItem("slay-view", isStatic() ? "immersive" : "simple");
      } catch {
        /* storage blocked: the URL parameter still works */
      }
      const u = new URL(location.href);
      u.searchParams.delete("tier"); // the visitor's choice wins over a forced review tier
      u.searchParams.set("view", isStatic() ? "immersive" : "simple");
      u.hash = "";
      location.assign(u.toString());
    });
}

function initShowcase(root: HTMLElement) {
  const sc = root.querySelector<HTMLElement>("[data-showcase]");
  if (!sc) return;
  const status = sc.querySelector<HTMLElement>("[data-showcase-status]");
  const items = [...sc.querySelectorAll<HTMLElement>("[data-product]")];
  const counter = sc.querySelector<HTMLElement>("[data-counter]");
  // Static spreads show every product, so the controls step through them in place.
  let cursor = 0;
  const active = () =>
    isStatic() ? cursor : Math.max(0, items.findIndex((p) => p.dataset.active === "true"));
  const go = (d: number) => {
    const i = Math.min(items.length - 1, Math.max(0, active() + d));
    if (isLive()) scrollToVh(productVh(orientation(), i), true);
    else if (isStatic()) {
      cursor = i;
      items[i]?.scrollIntoView({ block: "center", behavior: reducedMotion() ? "auto" : "smooth" });
      if (counter) counter.textContent = String(i + 1).padStart(2, "0");
    } else {
      // Not live yet (still loading): the controls still work on the DOM.
      items.forEach((p, k) => (p.dataset.active = String(k === i)));
    }
    if (status) status.textContent = `Look ${i + 1} of ${items.length}`;
  };
  sc.querySelector("[data-prev]")?.addEventListener("click", () => go(-1));
  sc.querySelector("[data-next]")?.addEventListener("click", () => go(1));
  // Enquire about a product: preselect the topic and note the product and shade.
  sc.querySelectorAll<HTMLAnchorElement>("[data-enquire-product]").forEach((a) =>
    a.addEventListener("click", () => {
      const li = a.closest("[data-product]");
      const shade = li?.querySelector<HTMLInputElement>("input[type=radio]:checked")?.dataset.shadeName;
      const topic = root.querySelector<HTMLSelectElement>("#enq-topic");
      const msg = root.querySelector<HTMLTextAreaElement>("#enq-message");
      if (topic) {
        const opt = [...topic.options].find((o) => /futura/i.test(o.text));
        if (opt) topic.value = opt.value;
      }
      if (msg && !msg.value.trim())
        msg.value = `I'd like to know more about ${a.dataset.enquireProduct}${shade ? `, ${shade}` : ""}.`;
    }),
  );
}

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

function initEnquiry(root: HTMLElement) {
  const form = root.querySelector<HTMLFormElement>("[data-enquiry-form]");
  if (!form) return;
  const status = form.querySelector<HTMLElement>("[data-enquiry-status]");
  const checks: Record<string, (v: string) => boolean> = {
    name: (v) => v.trim().length > 0,
    email: (v) => EMAIL.test(v.trim()),
    message: (v) => v.trim().length > 0,
  };
  const validate = (name: string, show: boolean) => {
    const field = form.elements.namedItem(name) as HTMLInputElement | HTMLTextAreaElement | null;
    const err = form.querySelector<HTMLElement>(`[data-error-for="${name}"]`);
    if (!field) return true;
    const ok = checks[name]!(field.value);
    if (show || field.getAttribute("aria-invalid") === "true") {
      field.setAttribute("aria-invalid", String(!ok));
      if (err) err.hidden = ok;
    }
    return ok;
  };
  for (const name of Object.keys(checks)) {
    const field = form.elements.namedItem(name) as HTMLElement | null;
    field?.addEventListener("blur", () => {
      if ((field as HTMLInputElement).value) validate(name, true);
    });
    field?.addEventListener("input", () => validate(name, false));
  }
  form.addEventListener("submit", (e) => {
    e.preventDefault();
    const bad = Object.keys(checks).filter((n) => !validate(n, true));
    if (!status) return;
    if (bad.length) {
      status.dataset.state = "error";
      status.textContent = `Please check ${bad.length === 1 ? "1 field" : `${bad.length} fields`} above.`;
      (form.elements.namedItem(bad[0]!) as HTMLElement | null)?.focus();
      return;
    }
    status.dataset.state = "ok";
    status.textContent =
      "Your enquiry is complete. Sending is not enabled in this preview, so nothing has been sent and nothing has been stored.";
  });
}
