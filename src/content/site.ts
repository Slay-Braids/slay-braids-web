import type { Claim } from "./claims";

/**
 * Production site copy. Only verified wording is used:
 * - The positioning line: project owner brief (2026-11-26).
 * - "FUTURA by SLAY BRAIDS" / "FUTURA is a SLAY BRAIDS product line.": project owner brief and
 *   instruction (2026-11-27).
 * - Factual descriptions of the site itself ("Looks from the SLAY BRAIDS shoot", "Online
 *   enquiries are not open yet").
 * No product names, shades, prices, specifications, claims, contacts or testimonials exist in
 * the brand material, so none are published. See docs/production-assets.md for what is missing.
 */
export const positioning = {
  line1: "Premium look.",
  line2: "Affordable price.",
  source: "Project owner brief, 2026-11-26",
} as const;

export const brand = {
  name: "SLAY BRAIDS",
  productLine: "FUTURA",
  /** Original logo files from the SLAY BRAIDS Drive (trimmed only): public/media/logo-*. */
  logo: { red: "media/logo-red", white: "media/logo-white", alt: "SLAY BRAIDS" },
} as const;

/** Product claims for FUTURA. Empty: none have been approved. */
export const futuraClaims: Claim[] = [];

/**
 * Enquiries: no verified submission destination (email, form endpoint or CRM) exists, so the
 * site carries no form. The section says so plainly; nothing pretends to send.
 */
export const enquiry = {
  href: "#enquire",
  title: "Enquiries",
  status: "Online enquiries are not open yet.",
  /** Set when SLAY BRAIDS confirms a destination; the form is rendered only when this is set. */
  destination: null as null | { kind: "email" | "endpoint"; value: string },
} as const;

export const futura = {
  name: "FUTURA",
  by: "by SLAY BRAIDS",
  line: "FUTURA is a SLAY BRAIDS product line.",
  lineSource: "Project owner brief, 2026-11-26; instruction 2026-11-27",
} as const;

export const craft = {
  title: "The Craft",
} as const;

export const looks = {
  title: "The Looks",
  intro: "Looks from the SLAY BRAIDS shoot.",
} as const;

export const lookbook = {
  title: "Lookbook",
} as const;

export const promise = {
  primary: { label: "See the looks", href: "#ch5" },
  secondary: { label: "Back to the start", href: "#top" },
} as const;
