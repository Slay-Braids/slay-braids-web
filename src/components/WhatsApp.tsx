import { contact, whatsappHref } from "@/content/site";

/** A plain chat-bubble glyph (not the WhatsApp logo), drawn in the current colour. */
export function ChatIcon({ size = 22 }: { size?: number }) {
  return (
    <svg viewBox="0 0 24 24" width={size} height={size} aria-hidden="true" focusable="false">
      <path
        d="M12 3.2c-4.9 0-8.8 3.6-8.8 8.1 0 1.7.6 3.3 1.6 4.6L3.6 20.5l4.8-1.3c1.1.4 2.3.6 3.6.6 4.9 0 8.8-3.6 8.8-8.1S16.9 3.2 12 3.2Z"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinejoin="round"
      />
      <path d="M8.4 10.2h7.2M8.4 13.4h4.6" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
    </svg>
  );
}

/**
 * The WhatsApp chat button (owner request, 27 Nov 2026): always at hand, bottom right. It opens a
 * chat with the verified SLAY BRAIDS number; nothing is sent from the site itself.
 */
export function WhatsAppButton() {
  return (
    <a
      className="wa-float"
      href={whatsappHref}
      target="_blank"
      rel="noopener noreferrer"
      data-wa-float
      aria-label={`Chat with SLAY BRAIDS on WhatsApp, ${contact.whatsapp.display} (opens WhatsApp)`}
    >
      <ChatIcon />
      <span className="wa-float-label" aria-hidden="true">
        WhatsApp
      </span>
    </a>
  );
}
