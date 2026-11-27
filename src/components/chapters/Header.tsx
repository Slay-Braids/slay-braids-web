"use client";

import { useRef } from "react";
import { CHAPTERS } from "@/content/chapters";
import { Logo } from "../Media";

/**
 * Site header: the original SLAY BRAIDS logo (red, from the brand Drive), a motion control for
 * the brand footage (WCAG 2.2.2: moving content can be paused), and the chapter menu. The menu
 * is a native modal <dialog>: focus moves into it and is trapped, Escape closes it, focus
 * returns to the Menu button.
 */
export function Header({ assetBase = "/" }: { assetBase?: string }) {
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
        <a href="#top" className="logo-slot" data-ground="ink" aria-label="SLAY BRAIDS, home">
          <Logo base={assetBase} width={112} alt="" />
        </a>
        <div className="header-actions" data-ground="ink">
          <button type="button" className="motion-toggle" data-motion-toggle aria-pressed="false">
            <span data-motion-label>Pause video</span>
          </button>
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
          <a href="#enquire" className="menu-enquire" onClick={close}>
            Enquiries
          </a>
          <div className="menu-view">
            <button type="button" className="menu-view-btn" data-view-toggle>
              Simple view
            </button>
            <p className="menu-view-note" data-view-note>
              A lighter version without the 3D scroll, for phones that struggle with it.
            </p>
          </div>
        </div>
      </dialog>
    </>
  );
}
