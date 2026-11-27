import type { Claim } from "./claims";

/**
 * FUTURA range for Chapter 5 (The Collection).
 *
 * No range data has been supplied by SLAY BRAIDS management yet: no product names, shades,
 * prices, photography or claims. The three entries below are STRUCTURAL PLACEHOLDERS. They are
 * rendered with visible "pending" labels, carry no price and no colour, and exist only so the
 * showcase, its controls and its accessibility can be built and tested.
 *
 * When the real data arrives, replace these entries. A price, shade colour or photograph is only
 * rendered when its `approved` record is present; claims go through `publishableClaims`.
 */
export interface Approval {
  approvedBy: string;
  approvedOn: string; // ISO date
}

export interface Shade {
  id: string;
  name: string;
  /** Swatch colour sampled from a photographed product sample. Never invented. */
  swatch?: { hex: string } & Approval;
  photo?: { src: string; alt: string; width: number; height: number } & Approval;
}

export interface Product {
  id: string;
  name: string;
  placeholder: boolean;
  /** Price as approved by management, e.g. { amount: "…", currency: "GBP" }. */
  price?: { display: string } & Approval;
  shades: Shade[];
  claims: Claim[];
}

const pendingShades = (p: number): Shade[] =>
  [1, 2, 3].map((s) => ({ id: `p${p}-s${s}`, name: `Shade ${s}` }));

export const products: Product[] = [1, 2, 3].map((p) => ({
  id: `product-${p}`,
  name: `FUTURA product ${p}`,
  placeholder: true,
  shades: pendingShades(p),
  claims: [],
}));

export const isApproved = (a?: Partial<Approval>): boolean =>
  !!a && typeof a.approvedBy === "string" && a.approvedBy.trim().length > 0 && /^\d{4}-\d{2}-\d{2}$/.test(a.approvedOn ?? "");
