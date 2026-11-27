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
import { products } from "../content/products";

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
    if (status) status.textContent = `Product ${i + 1} of ${items.length}: ${products[i]?.name ?? ""}`;
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
