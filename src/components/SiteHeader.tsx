import { enquiry } from "@/content/site";

/**
 * The logo slot intentionally shows a labelled placeholder: the original SLAY BRAIDS logo file
 * has not been supplied yet, and we do not recreate or approximate it.
 */
export function SiteHeader() {
  return (
    <header className="fixed inset-x-0 top-0 z-30 flex items-center justify-between gap-4 px-[max(5vw,16px)] py-5">
      <a
        href="#top"
        className="flex h-10 items-center rounded-sm border border-dashed border-mist/60 px-3 text-[11px] tracking-[0.18em] whitespace-nowrap text-mist uppercase"
        aria-label="SLAY BRAIDS — home (logo file pending)"
      >
        Logo pending
      </a>
      <nav aria-label="Primary" className="hidden items-center gap-8 text-sm text-ivory/80 md:flex">
        <a className="hover:text-ivory" href="#futura">
          FUTURA
        </a>
        <a className="hover:text-ivory" href="#craft">
          Craft
        </a>
        <a className="hover:text-ivory" href="#enquire">
          Contact
        </a>
      </nav>
      <a
        href={enquiry.href}
        className="inline-flex min-h-11 items-center rounded-full border border-champagne/70 px-5 text-sm whitespace-nowrap text-ivory transition-colors hover:bg-champagne hover:text-ink"
      >
        <span className="sm:hidden">Enquire</span>
        <span className="hidden sm:inline">{enquiry.ctaLabel}</span>
      </a>
    </header>
  );
}
