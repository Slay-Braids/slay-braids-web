import { describe, expect, it } from "vitest";
import { TIER_SETTINGS, decideTier, parseFlags, type DeviceSignals } from "@/experience/tiers";

const desktop: DeviceSignals = {
  webgl2: true,
  reducedMotion: false,
  saveData: false,
  deviceMemory: 8,
  hardwareConcurrency: 10,
  coarsePointer: false,
  gpu: "ANGLE (Apple, Apple M2, OpenGL 4.1)",
  viewportWidth: 1440,
};

describe("tier decision", () => {
  it("gives capable desktops the full cascade", () => {
    expect(decideTier(desktop).tier).toBe("A");
  });
  it("falls back to the static still for reduced motion, Data Saver, no WebGL2, low memory", () => {
    expect(decideTier({ ...desktop, reducedMotion: true }).tier).toBe("C");
    expect(decideTier({ ...desktop, saveData: true }).tier).toBe("C");
    expect(decideTier({ ...desktop, webgl2: false }).tier).toBe("C");
    expect(decideTier({ ...desktop, deviceMemory: 2 }).tier).toBe("C");
  });
  it("gives phones and weak or software GPUs the lighter cascade", () => {
    expect(decideTier({ ...desktop, coarsePointer: true, viewportWidth: 390 }).tier).toBe("B");
    expect(decideTier({ ...desktop, gpu: "Google SwiftShader" }).tier).toBe("B");
    expect(decideTier({ ...desktop, gpu: "Mali-G52 MC2" }).tier).toBe("B");
  });
  it("never trades per-braid realism for count: tier B only drops whole braids", () => {
    const { braids: aBraids, ...a } = TIER_SETTINGS.A.cascade;
    const { braids: bBraids, ...b } = TIER_SETTINGS.B.cascade;
    expect(b).toEqual(a);
    expect(bBraids).toBeLessThan(aBraids);
  });
});

describe("URL flags (query string or #hash for the artifact preview)", () => {
  it("parses query flags", () => {
    expect(parseFlags("?perf=1&tier=b&reduced=1", "")).toMatchObject({
      perf: true,
      tier: "B",
      reduced: true,
    });
  });
  it("parses hash flags", () => {
    expect(parseFlags("", "#perf-tier-c")).toMatchObject({ perf: true, tier: "C", reduced: false });
    expect(parseFlags("", "#reduced")).toMatchObject({ reduced: true, perf: false });
    expect(parseFlags("", "#freeze-nodowngrade")).toMatchObject({
      freeze: true,
      noDowngrade: true,
    });
  });
  it("ignores unknown values", () => {
    expect(parseFlags("?tier=z", "#tier-q").tier).toBeUndefined();
  });
});
