import { describe, expect, it } from "vitest";
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { buildCascade } from "@/experience/cascade/geometry";
import { cascadeFragment, cascadeVertex } from "@/experience/cascade/shaders";
import { FRAMING } from "@/experience/framing";
import { ANCHOR, anchorConfig } from "@/experience/tiers";
import { SCENE_BG } from "@/experience/cascade/CascadeScene";

/**
 * APPROVED VISUAL FOUNDATION — anchor_v2.
 *
 * anchor_v1 was approved after M1 review. anchor_v2 (27 Nov 2026) follows the owner's instruction
 * to correct the colouring for the red/black/white identity: the key light is neutral white
 * instead of champagne (fill 0.3/0.31/0.34 → 0.3/0.3/0.32). Geometry, shader, pose and framing
 * are unchanged, so only the lighting hash and the version changed; the anchor stills were
 * re-rendered (public/anchors/anchor_v2-*, manifest-anchor_v2.json; anchor_v1 files kept).
 * anchor_v3 (same day, owner request: "white background by default"): the anchor world is white.
 * The lighting block text is unchanged (it reads SCENE_BG), so the world colour is locked
 * separately below; stills re-rendered as anchor_v3-* with manifest-anchor_v3.json.
 *
 * Locks the hair geometry, hair shader, lighting and anchor framing that produce the approved
 * look and the seamless still → live handoff. If this test fails, the approved look has changed.
 * Do not "fix" it by updating the hashes: a change needs explicit owner approval, a new
 * ANCHOR.version (anchor_v2), re-rendered anchor stills, and a re-run of the handoff e2e tests.
 * See docs/visual-foundation.md.
 *
 * Deliberately NOT locked (expected to evolve in M2): scroll camera keyframes after the anchor
 * pose, page design, typography, copy, section structure.
 */
const sha = (b: string | Uint8Array) => createHash("sha256").update(b).digest("hex");
const bytes = (a: ArrayBufferView) => new Uint8Array(a.buffer, a.byteOffset, a.byteLength);

const LOCK = {
  version: "anchor_v3",
  // anchor_v3: the anchor world (scene background) is white for the bright identity.
  sceneBg: [1, 1, 1],
  geometry: {
    landscape: {
      positions: "5fbb4d75f9a425d77f52f2b4f982c4ffa3c88654d282cd90f659c0e1291fc01a",
      params: "94d2161e70465c66ac1a3cc97241760a5d297f373411b1989efca8ada99de03d",
    },
    portrait: {
      positions: "2449bae4b9dcb82507586c6c77fbac1312f2ac9e055c19345f2f42984b7f2d59",
      params: "ecbab123552b38e89a7bba391c34504861016c432e2ca33f897b6a77d791ed2e",
    },
  },
  shaders: "92749c82b3b38b0dad1cfc0ddf163025b3793860fe0c9376bbbbf489093f498d",
  lighting: "363e23bc15b766f067f9e4671269bb79c5a5559e6b1ffdf3da6b800e0df2fece", // anchor_v2 (anchor_v1: 72435cc6…)
  anchorFraming: "eeb9e2cdf9aa9713035b97f65ef0d369ed41dc64e0778cd67dec7e236bb0b63c",
} as const;

describe("approved visual foundation (anchor_v3) is unchanged", () => {
  it("anchor version", () => expect(ANCHOR.version).toBe(LOCK.version));
  it("anchor world colour", () => expect(SCENE_BG).toEqual(LOCK.sceneBg));

  for (const o of ["landscape", "portrait"] as const) {
    it(`hair geometry — ${o}`, () => {
      const g = buildCascade(anchorConfig(o));
      expect(sha(bytes(g.positions))).toBe(LOCK.geometry[o].positions);
      expect(sha(bytes(g.params))).toBe(LOCK.geometry[o].params);
    });
  }

  it("hair shader", () => expect(sha(cascadeVertex + cascadeFragment)).toBe(LOCK.shaders));

  it("lighting and material uniforms", () => {
    const src = readFileSync("src/experience/cascade/CascadeScene.ts", "utf8");
    const block = src
      .slice(src.indexOf("uniforms: {"), src.indexOf("},\n    });"))
      .replace(/\s+/g, "");
    expect(sha(block)).toBe(LOCK.lighting);
  });

  it("anchor framing (camera, key light, softbox pool)", () => {
    const framing = Object.fromEntries(
      Object.entries(FRAMING).map(([k, v]) => [
        k,
        {
          refAspect: v.refAspect,
          fov: v.fov,
          anchorSize: v.anchorSize,
          keyDir: v.keyDir,
          keyPool: v.keyPool,
          anchorPose: v.keys[0],
        },
      ]),
    );
    expect(sha(JSON.stringify(framing))).toBe(LOCK.anchorFraming);
  });
});
