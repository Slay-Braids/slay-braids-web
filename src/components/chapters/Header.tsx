"use client";

import { useRef } from "react";
import { enquiry } from "@/content/site";
import { CHAPTERS } from "@/content/chapters";

/**
 * Site header (M2, menu extended to seven chapters in M3). The logo slot is a labelled placeholder: the original SLAY BRAIDS logo file has not
 * been supplied and is never recreated. The menu is a native modal <dialog>: focus moves into it
 * and is trapped, Escape closes it, focus returns to the Menu button.
 */
export function Header() {
  const dialog = useRef<HTMLDialogElement>(null);
  const button = useRef<HTMLButtonElement>(null);
  const open = () => dialog.current?.showModal();
  const close = () => {
    dialog.current?.close();
    button.current?.focus();
  };
  return (
    <>
      <header data-site-header className="site-header">
        {/* Placeholder slot: plain text, not a recreation of the logo (the file is pending). */}
        <a
          href="#top"
          className="logo-slot"
          data-ground="ink"
          aria-label="SLAY BRAIDS, home"
          title="Logo file pending"
        >
          SLAY BRAIDS
        </a>
        <div className="header-actions" data-ground="ink">
          <button
            ref={button}
            type="button"
            className="menu-button"
            aria-haspopup="dialog"
            aria-controls="site-menu"
            onClick={open}
          >
            Menu
          </button>
          <a href={enquiry.href} className="header-enquire">
            Enquire
          </a>
        </div>
      </header>
      <dialog
        id="site-menu"
        ref={dialog}
        className="site-menu"
        aria-label="Menu"
        onClose={() => button.current?.focus()}
      >
        <div className="site-menu-inner">
          <button type="button" className="menu-close" onClick={close}>
            Close
          </button>
          <nav aria-label="All chapters">
            <ol className="menu-list">
              {CHAPTERS.map((c, i) => (
                <li key={c.id}>
                  <a href={`#${c.id}`} onClick={close}>
                    <span className="menu-num" aria-hidden="true">
                      {String(i + 1).padStart(2, "0")}
                    </span>{" "}
                    {c.name}
                  </a>
                </li>
              ))}
            </ol>
          </nav>
          <p className="menu-note">Chapter titles are working titles until SLAY BRAIDS approves them.</p>
          <a href={enquiry.href} className="menu-enquire" onClick={close}>
            {enquiry.ctaLabel}
          </a>
        </div>
      </dialog>
    </>
  );
}
