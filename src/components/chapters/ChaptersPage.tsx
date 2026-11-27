import { AnchorStage } from "../AnchorStage";
import { ExperienceBoot } from "../ExperienceBoot";
import { Header } from "./Header";
import { collection, enquiry, futura, lookbook, manifesto, positioning, promise } from "@/content/site";
import { products, isApproved } from "@/content/products";
import { publishableClaims } from "@/content/claims";
import { SECTION_VH } from "@/experience/chapters/story";
import { CHAPTERS } from "@/content/chapters";
import type { CSSProperties } from "react";

/** Section heights (the scroll track) for each orientation, from the story layout. */
const sectionVh = (k: "ch4" | "ch5" | "ch6" | "ch7") =>
  ({ "--h-l": SECTION_VH.landscape[k], "--h-p": SECTION_VH.portrait[k] }) as CSSProperties;

const Placeholder = ({ label = "Placeholder copy" }: { label?: string }) => (
  <span className="placeholder-tag">{label}</span>
);

/**
 * The SLAY BRAIDS website: Chapters 1–7, the enquiry and the footer. DOM order = visual order = keyboard order:
 * skip link → header → main (h1 first) → chapter index → footer. Decorative layers (3D, still,
 * page edge, grain, numerals, scroll cue) are hidden from assistive technology.
 */
export function ChaptersPage({ assetBase = "/" }: { assetBase?: string }) {
  return (
    <div id="experience" data-chapters data-asset-base={assetBase}>
      <a href="#ch1-title" className="skip-link">
        Skip to main content
      </a>
      <AnchorStage assetBase={assetBase} />
      <svg className="paper-layer" data-paper aria-hidden="true" />
      <div className="grain" aria-hidden="true" />
      <Header />

      <main id="main" data-scroll-root className="relative z-10">
        {/* Chapter 1 — Arrival */}
        <section id="top" className="ch1 chapter" aria-labelledby="ch1-title">
          <div aria-hidden="true" className="scrim-bottom ch1-scrim md:hidden" data-hero-scrim />
          <div className="ch1-content" data-hero>
            <p className="label hero-rise numeral-label" aria-hidden="true">
              01
            </p>
            <h1 id="ch1-title" tabIndex={-1} className="hero-rise hero-title font-display">
              <span className="block">{positioning.line1}</span>
              <span className="block italic text-champagne">{positioning.line2}</span>
            </h1>
            <div className="hero-rise hero-ctas">
              <a href={enquiry.href} className="btn-primary">
                {enquiry.ctaLabel}
              </a>
              <a href="#ch4" className="btn-secondary">
                Discover FUTURA
              </a>
            </div>
          </div>
          <div className="scroll-cue" data-scroll-cue aria-hidden="true">
            <span>Scroll</span>
            <i />
          </div>
        </section>

        {/* Chapter 2 — The Craft */}
        <section id="ch2" className="ch2 chapter" aria-labelledby="ch2-title">
          <div className="chapter-frame" data-ch2-frame>
            <div className="ch2-field" aria-hidden="true" />
            <div className="ch2-copy">
              <p className="numeral" aria-hidden="true">
                02
              </p>
              <h2 id="ch2-title" className="sr-only">
                The craft (working title)
              </h2>
              <div className="ch2-lines">
                {manifesto.map((m, i) => (
                  <p
                    key={i}
                    data-ch2-line={i}
                    data-state="hidden"
                    className="ch2-line font-display"
                  >
                    {m.text}
                  </p>
                ))}
              </div>
              <Placeholder />
            </div>
          </div>
        </section>

        {/* Chapter 3 — The Unbraiding */}
        <section id="ch3" className="ch3 chapter" aria-labelledby="ch3-title">
          <div className="chapter-frame" data-ch3-frame>
            <div className="ch3-content" data-ch3-content>
              <p className="numeral numeral-ivory" aria-hidden="true">
                03
              </p>
              <h2 id="ch3-title" className="sr-only">
                The unbraiding (working title)
              </h2>
              <figure className="ch3-portrait" data-ch3-portrait>
                <div className="portrait-mount">
                  <p className="portrait-placeholder">
                    Portrait
                    <br />
                    awaiting approved photography
                  </p>
                </div>
                <figcaption className="portrait-caption">Photo credit pending</figcaption>
              </figure>
              <p className="ch3-line font-display" data-ch3-line data-state="hidden">
                Chapter 3 line — wording to come from SLAY BRAIDS.
                <Placeholder />
              </p>
            </div>
          </div>
        </section>

        {/* Chapter 4 — FUTURA */}
        <section
          id="ch4"
          className="ch4 chapter"
          aria-labelledby="ch4-title"
          style={sectionVh("ch4")}
        >
          <div className="chapter-frame ch4-frame" data-ch4-frame>
            <div className="ch4-printed" data-ch4-printed aria-hidden="true">
              <p className="numeral numeral-ivory">04</p>
              <p className="ch4-printed-name font-display">{futura.name}</p>
            </div>
            <div className="ch4-content" data-ch4-content>
              <h2 id="ch4-title" className="ch4-title font-display" data-ch4-title>
                {futura.name}
                <span className="sr-only">, </span>
                <Placeholder label="Logo file pending" />
              </h2>
              <p className="ch4-line" data-ch4-line>
                {futura.line}
              </p>
            </div>
          </div>
        </section>

        {/* Chapter 5 — The Collection */}
        <section
          id="ch5"
          className="ch5 chapter"
          aria-labelledby="ch5-title"
          style={sectionVh("ch5")}
        >
          <div className="chapter-frame ch5-frame" data-ch5-frame>
            <div className="ch5-head">
              <p className="numeral" aria-hidden="true">
                05
              </p>
              <h2 id="ch5-title" className="ch5-title font-display">
                {collection.title}
              </h2>
              <p className="ch5-intro">
                {collection.intro} <Placeholder label="Range data pending" />
              </p>
            </div>
            <div className="showcase" data-showcase>
              <div className="showcase-controls">
                <button type="button" className="showcase-btn" data-prev>
                  <span aria-hidden="true">←</span> Previous
                  <span className="sr-only"> product</span>
                </button>
                <p className="showcase-counter" aria-hidden="true">
                  <span data-counter>01</span> / {String(products.length).padStart(2, "0")}
                </p>
                <button type="button" className="showcase-btn" data-next>
                  Next<span className="sr-only"> product</span> <span aria-hidden="true">→</span>
                </button>
              </div>
              <p className="sr-only" aria-live="polite" data-showcase-status />
              <ol className="products">
                {products.map((p, i) => (
                  <li
                    key={p.id}
                    className="product"
                    data-product={i}
                    data-active={i === 0 ? "true" : "false"}
                  >
                    <article className="product-card" aria-labelledby={`${p.id}-name`}>
                      <div className="product-photo" data-product-photo>
                        <p className="product-photo-placeholder">
                          Product photograph
                          <br />
                          awaiting approved photography
                        </p>
                      </div>
                      <div className="product-info">
                        <p className="product-count" aria-hidden="true">
                          {String(i + 1).padStart(2, "0")}
                        </p>
                        <h3 id={`${p.id}-name`} className="product-name font-display">
                          {p.name}
                        </h3>
                        {p.placeholder && <Placeholder label="Name, shades and price pending" />}
                        <fieldset className="shades">
                          <legend className="shades-legend">Shade</legend>
                          {p.shades.map((sh, k) => (
                            <label key={sh.id} className="swatch">
                              <input
                                type="radio"
                                name={`${p.id}-shade`}
                                value={sh.id}
                                defaultChecked={k === 0}
                                data-shade-name={sh.name}
                              />
                              <span
                                className={`swatch-chip${sh.swatch && isApproved(sh.swatch) ? "" : " swatch-pending"}`}
                                style={
                                  sh.swatch && isApproved(sh.swatch)
                                    ? { background: sh.swatch.hex }
                                    : undefined
                                }
                                aria-hidden="true"
                              >
                                {sh.swatch && isApproved(sh.swatch) ? "" : k + 1}
                              </span>
                              <span className="swatch-name">
                                {sh.name}
                                {!(sh.swatch && isApproved(sh.swatch)) && (
                                  <span className="sr-only"> (colour pending)</span>
                                )}
                              </span>
                            </label>
                          ))}
                        </fieldset>
                        <p className="product-price">
                          {p.price && isApproved(p.price) ? p.price.display : collection.priceMissing}
                        </p>
                        {publishableClaims(p.claims).length > 0 && (
                          <ul className="product-claims">
                            {publishableClaims(p.claims)
                              .slice(0, 2)
                              .map((c) => (
                                <li key={c.id}>{c.text}</li>
                              ))}
                          </ul>
                        )}
                        <a
                          href={enquiry.href}
                          className="btn-primary product-enquire"
                          data-enquire-product={p.name}
                        >
                          Enquire about this product
                        </a>
                      </div>
                    </article>
                  </li>
                ))}
              </ol>
            </div>
          </div>
        </section>

        {/* Chapter 6 — Lookbook */}
        <section
          id="ch6"
          className="ch6 chapter"
          aria-labelledby="ch6-title"
          style={sectionVh("ch6")}
        >
          <div className="chapter-frame ch6-frame" data-ch6-frame>
            <div className="ch6-intro" data-ch6-intro>
              <p className="numeral numeral-ivory" aria-hidden="true">
                06
              </p>
              <h2 id="ch6-title" className="ch6-title font-display">
                {lookbook.title}
              </h2>
            </div>
            <div className="ch6-spread" data-ch6-spread>
              {lookbook.items.map((item, i) => (
                <figure key={item.id} className={`look look-${i + 1}`}>
                  <div className="look-mount">
                    <p className="look-placeholder">
                      {item.kind === "video" ? "Film loop" : "Photograph"}
                      <br />
                      awaiting approved {item.kind === "video" ? "footage" : "photography"}
                    </p>
                  </div>
                  <figcaption className="look-caption">
                    {item.caption} {i + 1} · credit pending
                  </figcaption>
                </figure>
              ))}
              <p className="ch6-line font-display">
                {lookbook.line.text}
                <Placeholder />
              </p>
              <p className="ch6-status">{lookbook.status}.</p>
            </div>
          </div>
        </section>

        {/* Chapter 7 — The promise */}
        <section
          id="ch7"
          className="ch7 chapter"
          aria-labelledby="ch7-title"
          style={sectionVh("ch7")}
        >
          <div className="chapter-frame ch7-frame" data-ch7-frame>
            <div className="ch7-content" data-ch7-content>
              <p className="numeral" aria-hidden="true">
                07
              </p>
              <h2 id="ch7-title" className="hero-title ch7-title font-display">
                <span className="block">{positioning.line1}</span>
                <span className="block italic text-champagne">{positioning.line2}</span>
              </h2>
              <div className="hero-ctas">
                <a href={enquiry.href} className="btn-primary">
                  {enquiry.ctaLabel}
                </a>
                <a href={promise.secondary.href} className="btn-secondary">
                  {promise.secondary.label}
                </a>
              </div>
              <p className="ch7-note">{promise.note}</p>
            </div>
          </div>
        </section>

        <section
          id="enquire"
          className="enquire-section"
          data-opaque
          data-ground-section="ink"
          aria-labelledby="enquire-title"
        >
          <div className="enquire-inner">
            <p className="label" data-reveal>
              Enquiries
            </p>
            <h2 id="enquire-title" className="font-display enquire-title" data-reveal>
              Make an enquiry
            </h2>
            <p className="enquire-status" data-reveal>
              {enquiry.status}
            </p>
            <form className="enquire-form" data-enquiry-form noValidate aria-describedby="enquire-note">
              <div className="field">
                <label htmlFor="enq-name">Name</label>
                <input id="enq-name" name="name" autoComplete="name" required aria-describedby="enq-name-err" />
                <p id="enq-name-err" className="field-error" data-error-for="name" hidden>
                  Please enter your name.
                </p>
              </div>
              <div className="field">
                <label htmlFor="enq-email">Email</label>
                <input id="enq-email" name="email" type="email" autoComplete="email" required aria-describedby="enq-email-err" />
                <p id="enq-email-err" className="field-error" data-error-for="email" hidden>
                  Please enter an email address like name@example.com.
                </p>
              </div>
              <div className="field">
                <label htmlFor="enq-topic">Topic</label>
                <select id="enq-topic" name="topic">
                  {enquiry.topics.map((t) => (
                    <option key={t}>{t}</option>
                  ))}
                </select>
              </div>
              <div className="field">
                <label htmlFor="enq-message">Message</label>
                <textarea id="enq-message" name="message" rows={5} required aria-describedby="enq-message-err" />
                <p id="enq-message-err" className="field-error" data-error-for="message" hidden>
                  Please write a short message.
                </p>
              </div>
              <div className="enquire-actions">
                <button type="submit" className="btn-primary">
                  Check my enquiry
                </button>
                <button type="button" disabled className="btn-disabled">
                  Sending is not enabled in the preview
                </button>
              </div>
              <div className="enquire-result" role="status" data-enquiry-status />
              <p id="enquire-note" className="enquire-note">
                Topics are provisional until SLAY BRAIDS confirms products, services, or both.
              </p>
            </form>
          </div>
        </section>
      </main>

      <nav className="chapter-index" data-chapter-index data-ground="ink" aria-label="Chapters">
        {CHAPTERS.map((c, i) => (
          <a key={c.id} href={`#${c.id}`} data-chapter-tick={i + 1} aria-current={i === 0 ? "true" : undefined}>
            <span className="sr-only">
              Chapter {i + 1}, {c.name}
            </span>
          </a>
        ))}
      </nav>

      <footer className="site-footer" data-ground-section="ink">
        <div className="footer-inner">
          <a href="#top" className="logo-slot footer-logo" aria-label="SLAY BRAIDS, back to the top" title="Logo file pending">
            SLAY BRAIDS
          </a>
          <nav aria-label="Footer">
            <ul className="footer-links">
              {CHAPTERS.map((c) => (
                <li key={c.id}>
                  <a href={`#${c.id}`}>{c.name}</a>
                </li>
              ))}
              <li>
                <a href={enquiry.href}>{enquiry.ctaLabel}</a>
              </li>
            </ul>
          </nav>
          <p className="footer-legal">© SLAY BRAIDS · FUTURA is a SLAY BRAIDS product line.</p>
          <p className="footer-legal">Legal pages and social links to follow.</p>
        </div>
      </footer>
      <p data-testid="banner" className="preview-banner">
        Preview · not for publication · placeholder content is marked
      </p>
      <ExperienceBoot />
    </div>
  );
}
