import type { Claim } from "./claims";

/**
 * Production site copy. Only verified wording is used:
 * - The positioning line: project owner brief (2026-11-26).
 * - "FUTURA by SLAY BRAIDS" / "FUTURA is a SLAY BRAIDS product line.": project owner brief and
 *   instruction (2026-11-27).
 * - Factual descriptions of the site itself ("Looks from the SLAY BRAIDS shoot", "Online
 *   enquiries are not open yet").
 * - Write-ups (27 Nov 2026, owner request): descriptions of what each chapter, look and image
 *   shows, written around the brand positioning (premium look, affordable price). They describe
 *   what is visible; they invent no product names, shade codes, prices, contacts or testimonials.
 * - FUTURA fibre features: paraphrased from Kaneka's futura page
 *   (https://www.kanekalon.com/en/futura.html, read 2026-11-27), excluding its product list, at
 *   the owner's request. Kaneka's own caveat on the heat figure is kept.
 */
export const positioning = {
  line1: "Premium look.",
  line2: "Affordable price.",
  source: "Project owner brief, 2026-11-26",
  /** Hero subline (write-up). */
  sub: "Braids and hair that look like a splurge, at a price that isn't one.",
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
  headline: "Made to look expensive. Priced not to be.",
  intro:
    "FUTURA is the SLAY BRAIDS collection made with futura, a fibre from Kaneka created to look and move like real hair. You get the finish people usually pay a premium for, at a SLAY BRAIDS price.",
  featuresTitle: "What futura fibre brings",
  features: [
    { title: "Feels like real hair", text: "Smooth and soft, and easy to comb through." },
    { title: "Body and bounce", text: "Keeps its curl, tight or loose, and looks just as good straight." },
    {
      title: "Heat-styling friendly",
      text: "Can be styled with irons. Kaneka recommends 180 °C; that is guidance, not a guaranteed value.",
    },
    {
      title: "Flame-retardant fibre",
      text: "Recommended for attachments worn for longer, such as wigs worn with glue.",
    },
    { title: "Blend for a natural finish", text: "futura types can be mixed for a more natural look and feel." },
    { title: "Made for wigs and weaves", text: "Suited to wigs, weaves and other hair attachments." },
  ],
  source: "Fibre information: Kaneka Corporation (kanekalon.com). futura is a fibre made by Kaneka.",
} as const;

export const craft = {
  title: "The Craft",
  text: "Every look starts here: a length of hair in the hand, before it is braided, twisted or worn loose. Soft, waved and full of movement, shown exactly as it comes.",
  caption: "Braiding hair, before styling",
} as const;

export const unbraiding = {
  title: "The Unbraiding",
  text: "Braided at the root, free at the ends. The same hair, styled two ways.",
} as const;

export const looks = {
  title: "The Looks",
  intro: "Four looks from the SLAY BRAIDS shoot, on real models in real light. Keep scrolling, or use Previous and Next.",
} as const;

export const lookbook = {
  title: "Lookbook",
  intro: "Up close: colour, texture and movement, exactly as they were shot.",
} as const;

export const promise = {
  sub: "That is the SLAY BRAIDS promise: the look you came for, at a price that lets you come back for the next one.",
  primary: { label: "See the looks", href: "#ch5" },
  secondary: { label: "Back to the start", href: "#top" },
} as const;
