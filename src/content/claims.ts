/**
 * Claim gating.
 *
 * Every product statement on the site is a Claim with a recorded source. Only claims that
 * SLAY BRAIDS management has approved (named approver + date) can ever be rendered.
 * Research material (e.g. third-party fibre literature) is stored, if at all, as
 * `research-reference` and is structurally unpublishable.
 */
export type ClaimSource = "slay-management" | "research-reference";

export interface Claim {
  id: string;
  text: string;
  source: ClaimSource;
  /** Required for publication: who at SLAY BRAIDS approved the wording. */
  approvedBy?: string;
  /** Required for publication: ISO date of approval. */
  approvedOn?: string;
  /** Optional internal evidence note (test report, supplier document). Never rendered. */
  evidence?: string;
}

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

export function isPublishable(claim: Claim): boolean {
  return (
    claim.source === "slay-management" &&
    typeof claim.approvedBy === "string" &&
    claim.approvedBy.trim().length > 0 &&
    typeof claim.approvedOn === "string" &&
    ISO_DATE.test(claim.approvedOn) &&
    claim.text.trim().length > 0
  );
}

/** The only way components obtain claim text. Unapproved claims are dropped. */
export function publishableClaims(claims: readonly Claim[]): Claim[] {
  return claims.filter(isPublishable);
}

export class UnapprovedClaimError extends Error {
  constructor(id: string) {
    super(`Claim "${id}" is not approved by SLAY BRAIDS management and cannot be published.`);
    this.name = "UnapprovedClaimError";
  }
}

/** Use when a page cannot render without a specific claim: fails the build instead of shipping it. */
export function requirePublishable(claim: Claim): Claim {
  if (!isPublishable(claim)) throw new UnapprovedClaimError(claim.id);
  return claim;
}
