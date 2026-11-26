import { AnchorStage } from "./AnchorStage";
import { SiteHeader } from "./SiteHeader";
import { ExperienceBoot } from "./ExperienceBoot";
import { enquiry, manifesto, positioning } from "@/content/site";

const Placeholder = () => (
  <span className="ml-2 inline-block rounded-sm border border-mist/40 px-1.5 py-0.5 align-middle text-[10px] tracking-[0.14em] text-mist uppercase">
    Placeholder copy
  </span>
);

/**
 * M1 prototype homepage. Scope: proves the cascade, the anchor → live handoff, pointer response,
 * scroll camera, performance and fallbacks. Copy is limited to the approved positioning line;
 * everything else is visibly marked as placeholder. No product claims are shown.
 */
export function HomePrototype({ assetBase = "/" }: { assetBase?: string }) {
  return (
    <div id="experience">
      <a href="#main" className="skip-link">
        Skip to content
      </a>
      <AnchorStage assetBase={assetBase} />
      <div className="grain" aria-hidden="true" />
      <SiteHeader />
      <p
        data-testid="banner"
        className="fixed inset-x-0 bottom-0 z-30 bg-ink/80 px-4 py-2 text-center text-[11px] tracking-[0.12em] text-mist uppercase"
      >
        M1 prototype · not for publication · placeholder copy is marked
      </p>

      <main id="main" data-scroll-root className="legible relative z-10">
        <section
          id="top"
          className="relative flex min-h-svh flex-col justify-end px-[max(5vw,16px)] pb-[11svh] md:pb-[14svh]"
          aria-labelledby="hero-title"
        >
          <div
            aria-hidden="true"
            className="scrim-bottom pointer-events-none absolute inset-x-0 bottom-0 h-[52svh] md:hidden"
          />
          <p className="label hero-rise relative mb-4 md:mb-5">SLAY BRAIDS · FUTURA</p>
          <h1
            id="hero-title"
            className="hero-rise relative font-display max-w-[11ch] text-[length:var(--text-hero)] leading-[0.95] font-medium"
          >
            <span className="block">{positioning.line1}</span>
            <span className="block italic text-champagne">{positioning.line2}</span>
          </h1>
          <div className="hero-rise relative mt-7 flex flex-wrap gap-3 md:mt-9">
            <a
              href={enquiry.href}
              className="inline-flex min-h-12 items-center rounded-full bg-champagne px-5 font-medium whitespace-nowrap text-ink transition-opacity hover:opacity-90 md:px-6"
            >
              {enquiry.ctaLabel}
            </a>
            <a
              href="#futura"
              className="inline-flex min-h-12 items-center rounded-full border border-ivory/40 px-5 whitespace-nowrap text-ivory hover:border-ivory md:px-6"
            >
              Discover FUTURA
            </a>
          </div>
        </section>

        <section
          id="craft"
          className="flex min-h-svh items-center px-[max(5vw,16px)]"
          aria-labelledby="craft-title"
        >
          <div className="max-w-xl">
            <h2 id="craft-title" className="label mb-6" data-reveal>
              The craft <Placeholder />
            </h2>
            {manifesto.map((m, i) => (
              <p
                key={i}
                className="font-display mb-5 text-[length:var(--text-display)] leading-[1.05] text-ivory/90"
                data-reveal
              >
                {m.text}
              </p>
            ))}
          </div>
        </section>

        <section
          id="futura"
          className="flex min-h-svh items-end justify-end px-[max(5vw,16px)] pb-[16svh]"
          aria-labelledby="futura-title"
        >
          <div className="max-w-lg text-right">
            <p className="label mb-4" data-reveal>
              A SLAY BRAIDS product line
            </p>
            <h2
              id="futura-title"
              className="font-display text-[length:var(--text-hero)] leading-none tracking-[0.04em]"
              data-reveal
            >
              FUTURA
            </h2>
            <p className="mt-6 text-[length:var(--text-lead)] text-ivory/80" data-reveal>
              The FUTURA logo, range and product details will appear here once supplied and approved
              by SLAY BRAIDS.
            </p>
          </div>
        </section>

        <section
          id="showcase"
          className="flex min-h-[130svh] items-center px-[max(5vw,16px)]"
          aria-labelledby="showcase-title"
        >
          <div
            className="max-w-md rounded-sm border border-ivory/15 bg-ink/50 p-6 backdrop-blur-sm"
            data-reveal
          >
            <h2 id="showcase-title" className="label mb-3">
              Product showcase <Placeholder />
            </h2>
            <p className="text-ivory/85">
              Prototype stage. Swatches, textures and prices are added only from approved product
              data — none is shown yet.
            </p>
            <p className="mt-4 text-sm text-mist">
              Move your pointer, or drag a finger, across the loose strands.
            </p>
          </div>
        </section>

        <section
          id="finale"
          className="flex min-h-svh flex-col items-center justify-center px-[max(5vw,16px)] text-center"
          aria-labelledby="finale-title"
        >
          <h2
            id="finale-title"
            className="font-display text-[length:var(--text-display)] leading-[1.02]"
            data-reveal
          >
            {positioning.line1} <span className="italic text-champagne">{positioning.line2}</span>
          </h2>
          <a
            href={enquiry.href}
            className="mt-10 inline-flex min-h-12 items-center rounded-full bg-champagne px-7 font-medium text-ink"
            data-reveal
          >
            {enquiry.ctaLabel}
          </a>
        </section>

        <section
          id="enquire"
          className="bg-ink px-[max(5vw,16px)] py-24"
          aria-labelledby="enquire-title"
        >
          <div className="mx-auto max-w-xl">
            <h2 id="enquire-title" className="font-display text-4xl">
              Make an enquiry
            </h2>
            <p className="mt-3 text-mist">{enquiry.status}</p>
            <form className="mt-8 grid gap-5" aria-describedby="enquire-note">
              <label className="grid gap-2 text-sm">
                Name
                <input
                  name="name"
                  autoComplete="name"
                  className="min-h-12 rounded-sm border border-ivory/25 bg-ink-2 px-4 text-base text-ivory"
                />
              </label>
              <label className="grid gap-2 text-sm">
                Email
                <input
                  name="email"
                  type="email"
                  autoComplete="email"
                  className="min-h-12 rounded-sm border border-ivory/25 bg-ink-2 px-4 text-base text-ivory"
                />
              </label>
              <label className="grid gap-2 text-sm">
                Topic
                <select
                  name="topic"
                  className="min-h-12 rounded-sm border border-ivory/25 bg-ink-2 px-4 text-base text-ivory"
                >
                  {enquiry.topics.map((t) => (
                    <option key={t}>{t}</option>
                  ))}
                </select>
              </label>
              <label className="grid gap-2 text-sm">
                Message
                <textarea
                  name="message"
                  rows={4}
                  className="rounded-sm border border-ivory/25 bg-ink-2 px-4 py-3 text-base text-ivory"
                />
              </label>
              <button
                type="button"
                disabled
                className="min-h-12 cursor-not-allowed rounded-full bg-ivory/20 px-6 text-ivory/60"
              >
                Sending is not enabled in the prototype
              </button>
              <p id="enquire-note" className="text-xs text-mist">
                Topics are provisional until SLAY BRAIDS confirms products, services, or both.
              </p>
            </form>
          </div>
        </section>

        <footer className="bg-ink px-[max(5vw,16px)] pt-10 pb-20 text-sm text-mist">
          <p>© SLAY BRAIDS · FUTURA is a SLAY BRAIDS product line.</p>
          <p className="mt-2">Legal pages to follow.</p>
        </footer>
      </main>
      <ExperienceBoot />
    </div>
  );
}
