import { AnchorStage } from "../AnchorStage";
import { ExperienceBoot } from "../ExperienceBoot";
import { Header } from "./Header";
import { enquiry, manifesto, positioning } from "@/content/site";

const Placeholder = ({ label = "Placeholder copy" }: { label?: string }) => (
  <span className="placeholder-tag">{label}</span>
);

/**
 * M2 preview: Chapters 1–3 (approved phase only). DOM order = visual order = keyboard order:
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
          <div aria-hidden="true" className="scrim-bottom pointer-events-none absolute inset-x-0 bottom-0 h-[52%] md:hidden" />
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
              <a href="#next" className="btn-secondary">
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
                  <p key={i} data-ch2-line={i} data-state="hidden" className="ch2-line font-display">
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

        {/* End of this preview */}
        <section id="next" className="end-card" data-opaque data-ground-section="ivory" aria-labelledby="next-title">
          <p className="label" data-reveal>
            Next review
          </p>
          <h2 id="next-title" className="font-display end-title" data-reveal>
            Chapter 4 · FUTURA
          </h2>
          <p className="end-note" data-reveal>
            Chapters 4–7 are built after this preview is approved.
          </p>
          <a href="#top" className="btn-secondary btn-on-ivory" data-reveal>
            Back to the top
          </a>
        </section>

        <section id="enquire" className="enquire-section" data-ground-section="ink" aria-labelledby="enquire-title">
          <div className="mx-auto max-w-xl">
            <h2 id="enquire-title" className="font-display text-4xl">
              Make an enquiry
            </h2>
            <p className="mt-3 text-mist">{enquiry.status}</p>
            <form className="mt-8 grid gap-5" aria-describedby="enquire-note">
              <label className="field">
                Name
                <input name="name" autoComplete="name" />
              </label>
              <label className="field">
                Email
                <input name="email" type="email" autoComplete="email" />
              </label>
              <label className="field">
                Topic
                <select name="topic">
                  {enquiry.topics.map((t) => (
                    <option key={t}>{t}</option>
                  ))}
                </select>
              </label>
              <label className="field">
                Message
                <textarea name="message" rows={4} />
              </label>
              <button type="button" disabled className="btn-disabled">
                Sending is not enabled in the preview
              </button>
              <p id="enquire-note" className="text-xs text-mist">
                Topics are provisional until SLAY BRAIDS confirms products, services, or both.
              </p>
            </form>
          </div>
        </section>
      </main>

      <nav className="chapter-index" data-chapter-index data-ground="ink" aria-label="Chapters">
        <a href="#top" data-chapter-tick="1" aria-current="true">
          <span className="sr-only">Chapter 1, Arrival</span>
        </a>
        <a href="#ch2" data-chapter-tick="2">
          <span className="sr-only">Chapter 2, The Craft</span>
        </a>
        <a href="#ch3" data-chapter-tick="3">
          <span className="sr-only">Chapter 3, The Unbraiding</span>
        </a>
      </nav>

      <footer className="site-footer" data-ground-section="ink">
        <p>© SLAY BRAIDS · FUTURA is a SLAY BRAIDS product line.</p>
        <p className="mt-2">Legal pages to follow.</p>
      </footer>
      <p data-testid="banner" className="preview-banner">
        M2 preview · Chapters 1–3 · not for publication · placeholder copy is marked
      </p>
      <ExperienceBoot />
    </div>
  );
}
