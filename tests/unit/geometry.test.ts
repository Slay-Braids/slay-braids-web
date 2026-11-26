import { describe, expect, it } from "vitest";
import { buildCascade } from "@/experience/cascade/geometry";
import { TIER_SETTINGS, anchorConfig } from "@/experience/tiers";
import { createHash } from "node:crypto";

const hash = (a: ArrayBufferView) =>
  createHash("sha256")
    .update(new Uint8Array(a.buffer, a.byteOffset, a.byteLength))
    .digest("hex");

describe("Unbraiding Cascade geometry", () => {
  it("is deterministic for the anchor seed (anchor still and live frame are the same pose)", () => {
    const a = buildCascade(anchorConfig("landscape"));
    const b = buildCascade(anchorConfig("landscape"));
    expect(hash(a.positions)).toBe(hash(b.positions));
    expect(hash(a.params)).toBe(hash(b.params));
  });

  it("produces 3 strands per braid and the configured fibres per strand", () => {
    const cfg = { ...anchorConfig("portrait"), ...TIER_SETTINGS.B.cascade };
    const g = buildCascade(cfg);
    expect(g.fibreCount).toBe(cfg.braids * 3 * cfg.fibresPerStrand);
    expect(g.vertexCount % 2).toBe(0); // ribbon pairs
    expect(g.indices.length).toBe(g.triangleCount * 3);
    let maxIndex = 0;
    for (let i = 0; i < g.indices.length; i++) maxIndex = Math.max(maxIndex, g.indices[i]!);
    expect(maxIndex).toBeLessThan(g.vertexCount);
  });

  it("has both braided and fully loose hair in every composition", () => {
    for (const o of ["landscape", "portrait"] as const) {
      const g = buildCascade(anchorConfig(o));
      let braided = 0;
      let loose = 0;
      for (let v = 0; v < g.vertexCount; v++) {
        const l = g.params[v * 4 + 1]!;
        if (l < 10) braided++;
        if (l > 245) loose++;
      }
      expect(braided / g.vertexCount).toBeGreaterThan(0.25);
      expect(loose / g.vertexCount).toBeGreaterThan(0.15);
    }
  });

  it("contains only finite positions", () => {
    const g = buildCascade(anchorConfig("landscape"));
    let bad = 0;
    for (let i = 0; i < g.positions.length; i++) if (!Number.isFinite(g.positions[i]!)) bad++;
    expect(bad).toBe(0);
  });
});
