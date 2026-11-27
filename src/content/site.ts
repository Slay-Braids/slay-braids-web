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

/**
 * Chapters 4–7 copy. The FUTURA fact ("a SLAY BRAIDS product line") comes from the project
 * owner's brief (2026-11-26); its exact wording still needs management sign-off. Everything else
 * is placeholder copy, visibly labelled.
 */
export const futura = {
  name: "FUTURA",
  line: "FUTURA is a SLAY BRAIDS product line.",
  lineSource: "Project owner brief, 2026-11-26 (wording to approve)",
  /** The original FUTURA logo file has not been supplied; nothing is recreated. */
  logoStatus: "awaiting original file",
} as const;

export const collection = {
  title: "The Collection",
  intro: "Each FUTURA product, its shades and its price. Range details to come from SLAY BRAIDS.",
  priceMissing: "Price to be confirmed",
} as const;

export const lookbook = {
  title: "Lookbook",
  line: { text: "Lookbook line — wording to come from SLAY BRAIDS.", placeholder: true } as PlaceholderCopy,
  items: [
    { id: "look-1", kind: "photo", caption: "Lookbook photograph", placeholder: true },
    { id: "look-2", kind: "photo", caption: "Lookbook photograph", placeholder: true },
    { id: "look-3", kind: "video", caption: "Lookbook film loop", placeholder: true },
  ] as const,
  /** Photography and footage need signed model releases before they can be shown. */
  status: "Awaiting approved photography and signed model releases",
} as const;

export const promise = {
  secondary: { label: "See the collection", href: "#ch5" },
  note: "Products, braiding services, or both: the enquiry form takes either until SLAY BRAIDS confirms.",
} as const;
