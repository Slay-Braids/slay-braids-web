import { AnchorStage } from "../AnchorStage";
import { ExperienceBoot } from "../ExperienceBoot";
import { Header } from "./Header";
import { LoopVideo, Logo, StillPicture } from "../Media";
import { craft, enquiry, futura, lookbook, looks, positioning, promise } from "@/content/site";
import { craftClip, lookClips, lookbookMedia, portraitStill } from "@/content/media";
import { SECTION_VH } from "@/experience/chapters/story";
import { CHAPTERS } from "@/content/chapters";
import type { CSSProperties } from "react";

/** Section heights (the scroll track) for each orientation, from the story layout. */
const sectionVh = (k: "ch4" | "ch5" | "ch6" | "ch7") =>
  ({ "--h-l": SECTION_VH.landscape[k], "--h-p": SECTION_VH.portrait[k] }) as CSSProperties;

const pad = (n: number) => String(n).padStart(2, "0");

/**
 * The SLAY BRAIDS website: Chapters 1–7, enquiries and the footer, in the brand's red, black and
 * white, with original brand footage and the original logo. DOM order = visual order = keyboard
 * order: skip link → header → main (h1 first) → chapter index → footer. Decorative layers (3D,
 * still, page edge, grain, numerals, scroll cue) are hidden from assistive technology.
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
      <Header assetBase={assetBase} />

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
              <span className="block italic text-red">{positioning.line2}</span>
            </h1>
            <div className="hero-rise hero-ctas">
              <a href="#ch4" className="btn-primary">
                Discover FUTURA
              </a>
              <a href="#ch5" className="btn-secondary">
                {promise.primary.label}
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
              <h2 id="ch2-title" className="ch2-title font-display">
                {craft.title}
              </h2>
              <figure className="ch2-film">
                <LoopVideo clip={craftClip} base={assetBase} />
              </figure>
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
                The Unbraiding
              </h2>
              <figure className="ch3-portrait" data-ch3-portrait>
                <div className="portrait-mount">
                  <StillPicture still={portraitStill} base={assetBase} sizes="(max-width: 900px) 46vw, 18vw" />
                </div>
              </figure>
              <div className="ch3-line" data-ch3-line data-state="hidden">
                <Logo base={assetBase} width={260} className="ch3-logo" />
              </div>
            </div>
          </div>
        </section>

        {/* Chapter 4 — FUTURA by SLAY BRAIDS */}
        <section id="ch4" className="ch4 chapter" aria-labelledby="ch4-title" style={sectionVh("ch4")}>
          <div className="chapter-frame ch4-frame" data-ch4-frame>
            <div className="ch4-printed" data-ch4-printed aria-hidden="true">
              <p className="numeral numeral-ivory">04</p>
              <p className="ch4-printed-name font-display">{futura.name}</p>
              <p className="ch4-printed-by">{futura.by}</p>
            </div>
            <div className="ch4-content" data-ch4-content>
              <h2 id="ch4-title" className="ch4-title font-display" data-ch4-title>
                {futura.name}
                <span className="ch4-by">
                  <span className="sr-only"> </span>
                  {futura.by}
                </span>
              </h2>
              <p className="ch4-line" data-ch4-line>
                {futura.line}
              </p>
            </div>
          </div>
        </section>

        {/* Chapter 5 — The Looks */}
        <section id="ch5" className="ch5 chapter" aria-labelledby="ch5-title" style={sectionVh("ch5")}>
          <div className="chapter-frame ch5-frame" data-ch5-frame>
            <div className="ch5-head">
              <p className="numeral" aria-hidden="true">
                05
              </p>
              <h2 id="ch5-title" className="ch5-title font-display">
                {looks.title}
              </h2>
              <p className="ch5-intro">{looks.intro}</p>
            </div>
            <div className="showcase" data-showcase>
              <div className="showcase-controls">
                <button type="button" className="showcase-btn" data-prev>
                  <span aria-hidden="true">←</span> Previous
                  <span className="sr-only"> look</span>
                </button>
                <p className="showcase-counter" aria-hidden="true">
                  <span data-counter>01</span> / {pad(lookClips.length)}
                </p>
                <button type="button" className="showcase-btn" data-next>
                  Next<span className="sr-only"> look</span> <span aria-hidden="true">→</span>
                </button>
              </div>
              <p className="sr-only" aria-live="polite" data-showcase-status />
              <ol className="products">
                {lookClips.map((clip, i) => (
                  <li key={clip.id} className="product" data-product={i} data-active={i === 0 ? "true" : "false"}>
                    <article className="product-card" aria-labelledby={`${clip.id}-name`}>
                      <div className="product-photo">
                        <LoopVideo clip={clip} base={assetBase} />
                      </div>
                      <div className="product-info">
                        <p className="product-count" aria-hidden="true">
                          {pad(i + 1)}
                        </p>
                        <h3 id={`${clip.id}-name`} className="product-name font-display">
                          Look {pad(i + 1)}
                        </h3>
                      </div>
                    </article>
                  </li>
                ))}
              </ol>
            </div>
          </div>
        </section>

        {/* Chapter 6 — Lookbook */}
        <section id="ch6" className="ch6 chapter" aria-labelledby="ch6-title" style={sectionVh("ch6")}>
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
              {lookbookMedia.map((item, i) => (
                <figure key={i} className={`look look-${i + 1}`}>
                  <div className="look-mount">
                    {item.kind === "video" ? (
                      <LoopVideo clip={item.clip} base={assetBase} />
                    ) : (
                      <StillPicture still={item.still} base={assetBase} sizes="(max-width: 900px) 46vw, 28vw" />
                    )}
                  </div>
                </figure>
              ))}
            </div>
          </div>
        </section>

        {/* Chapter 7 — The promise */}
        <section id="ch7" className="ch7 chapter" aria-labelledby="ch7-title" style={sectionVh("ch7")}>
          <div className="chapter-frame ch7-frame" data-ch7-frame>
            <div className="ch7-content" data-ch7-content>
              <p className="numeral" aria-hidden="true">
                07
              </p>
              <h2 id="ch7-title" className="hero-title ch7-title font-display">
                <span className="block">{positioning.line1}</span>
                <span className="block italic text-red">{positioning.line2}</span>
              </h2>
              <div className="hero-ctas">
                <a href={promise.primary.href} className="btn-primary">
                  {promise.primary.label}
                </a>
                <a href={promise.secondary.href} className="btn-secondary">
                  {promise.secondary.label}
                </a>
              </div>
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
            <h2 id="enquire-title" className="font-display enquire-title" data-reveal>
              {enquiry.title}
            </h2>
            <p className="enquire-status" data-reveal>
              {enquiry.status}
            </p>
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
          <a href="#top" className="footer-logo" aria-label="SLAY BRAIDS, back to the top">
            <Logo base={assetBase} width={150} alt="" />
          </a>
          <nav aria-label="Footer">
            <ul className="footer-links">
              {CHAPTERS.map((c) => (
                <li key={c.id}>
                  <a href={`#${c.id}`}>{c.name}</a>
                </li>
              ))}
              <li>
                <a href="#enquire">{enquiry.title}</a>
              </li>
            </ul>
          </nav>
          <p className="footer-legal">© SLAY BRAIDS · {futura.line}</p>
        </div>
      </footer>
      <ExperienceBoot />
    </div>
  );
}
