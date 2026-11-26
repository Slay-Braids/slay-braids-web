import type { Claim } from "./claims";

/**
 * Site copy for the M1 prototype.
 * - The positioning line was supplied by the project owner in the brief (2026-11-26).
 * - Everything marked `placeholder: true` is layout copy awaiting management wording and is
 *   visibly labelled as such in the prototype.
 * - There are deliberately NO product claims here yet: the FUTURA range data is pending.
 */
export const positioning = {
  line1: "Premium look.",
  line2: "Affordable price.",
  source: "Project owner brief, 2026-11-26",
} as const;

export const brand = {
  name: "SLAY BRAIDS",
  productLine: "FUTURA",
  /** Logos must be the original files from management; nothing is recreated. */
  logoStatus: "awaiting original files",
} as const;

export interface PlaceholderCopy {
  text: string;
  placeholder: true;
}

export const manifesto: PlaceholderCopy[] = [
  { text: "Manifesto line one — wording to come from SLAY BRAIDS.", placeholder: true },
  { text: "Manifesto line two — wording to come from SLAY BRAIDS.", placeholder: true },
  { text: "Manifesto line three — wording to come from SLAY BRAIDS.", placeholder: true },
];

/** Product claims for FUTURA. Empty until management approves wording. */
export const futuraClaims: Claim[] = [];

/**
 * Flexible enquiry routing until management confirms whether the site supports direct
 * product sales, salon services, or both.
 */
export const enquiry = {
  ctaLabel: "Make an enquiry",
  href: "#enquire",
  topics: ["General enquiry", "FUTURA products", "Braiding services"],
  status: "Enquiry routing is being set up — this prototype does not send messages.",
} as const;
