import { describe, expect, it } from "vitest";
import {
  isPublishable,
  publishableClaims,
  requirePublishable,
  UnapprovedClaimError,
  type Claim,
} from "@/content/claims";
import { futuraClaims } from "@/content/site";

const approved: Claim = {
  id: "ok",
  text: "Approved wording",
  source: "slay-management",
  approvedBy: "Product lead",
  approvedOn: "2026-12-01",
};

describe("claim gating", () => {
  it("publishes only management-approved claims with approver and date", () => {
    expect(isPublishable(approved)).toBe(true);
    expect(isPublishable({ ...approved, approvedBy: undefined })).toBe(false);
    expect(isPublishable({ ...approved, approvedBy: "  " })).toBe(false);
    expect(isPublishable({ ...approved, approvedOn: "next week" })).toBe(false);
    expect(isPublishable({ ...approved, text: "" })).toBe(false);
  });

  it("never publishes research references, even if marked approved", () => {
    const research: Claim = { ...approved, id: "ref", source: "research-reference" };
    expect(isPublishable(research)).toBe(false);
    expect(publishableClaims([approved, research]).map((c) => c.id)).toEqual(["ok"]);
  });

  it("fails loudly when a page requires an unapproved claim", () => {
    expect(() => requirePublishable({ ...approved, approvedOn: undefined })).toThrow(
      UnapprovedClaimError,
    );
  });

  it("ships no FUTURA product claims until management approves them", () => {
    expect(publishableClaims(futuraClaims)).toHaveLength(0);
  });
});
