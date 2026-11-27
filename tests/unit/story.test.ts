import { describe, expect, it } from "vitest";
import { CHAPTER_LAYOUT, cameraTimeline, storyStops } from "@/experience/chapters/cameraTimeline";
import { ch3State } from "@/experience/chapters/driver";
import {
  STORY,
  SECTION_VH,
  boundaries,
  chapterIndex,
  landingVh,
  mapVh,
  pageState,
  pearlAt,
  productAt,
  productVh,
  worldAt,
  pageColor,
  groundOf,
  TONE,
  PAGE_COLOR,
} from "@/experience/chapters/story";
import { products } from "@/content/products";

const O = ["landscape", "portrait"] as const;
const full = (o: (typeof O)[number]) =>
  cameraTimeline(o, storyStops(o, STORY[o], products.map((_, i) => productVh(o, i))));

describe("M3 story layout", () => {
  for (const o of O) {
    it(`${o}: Chapters 1–3 camera is exactly the approved M2 curve`, () => {
      const m2 = cameraTimeline(o);
      const m3 = full(o);
      for (let vh = 0; vh <= CHAPTER_LAYOUT[o].ch3[1]; vh += 0.5) expect(m3(vh)).toEqual(m2(vh));
    });

    it(`${o}: Chapters 1–3 page and light are unchanged`, () => {
      for (let vh = 0; vh < STORY[o].ch4[0]; vh += 0.5) {
        const s3 = ch3State(o, vh);
        const p = pageState(o, vh);
        if (s3.open <= 0) expect(p).toBeNull();
        else expect([p!.open, p!.away, p!.guide]).toEqual([s3.open, s3.away, "ch3"]);
        expect(pearlAt(o, vh)).toBe(0);
      }
    });

    it(`${o}: the camera never jumps across all seven chapters`, () => {
      const cam = full(o);
      const end = STORY[o].ch7[1];
      let prev = cam(0).position;
      for (let vh = 0.25; vh <= end; vh += 0.25) {
        const p = cam(vh).position;
        expect(Math.hypot(p[0] - prev[0], p[1] - prev[1], p[2] - prev[2])).toBeLessThan(0.02);
        prev = p;
      }
    });

    it(`${o}: the page covers the screen where Chapter 3 ends and Chapter 4 begins`, () => {
      expect(pageState(o, STORY[o].ch4[0] - 0.01)!.full).toBe(true);
      expect(pageState(o, STORY[o].ch4[0])!.full).toBe(true);
      expect(pageState(o, STORY[o].ch6Close[1] + 10)!.full).toBe(true);
      expect(pageState(o, STORY[o].ch7Line)).toBeNull();
      expect(pageState(o, STORY[o].ch5[0] + 30)).toBeNull();
    });

    it(`${o}: section heights add up to the story layout`, () => {
      const S = STORY[o];
      const h = SECTION_VH[o];
      expect(S.ch4[1] - S.ch4[0]).toBe(h.ch4);
      expect(S.ch5[1] - S.ch5[0]).toBe(h.ch5);
      expect(S.ch6[1] - S.ch6[0]).toBe(h.ch6);
      expect(S.ch7[1] - S.ch7[0]).toBe(h.ch7);
    });

    it(`${o}: products, chapter index and landing points agree`, () => {
      products.forEach((_, i) => expect(productAt(o, productVh(o, i))).toBe(i));
      expect(chapterIndex(o, 0)).toBe(0);
      expect(chapterIndex(o, CHAPTER_LAYOUT[o].ch2[0])).toBe(0); // switches strictly after, as M2
      for (const [id, k] of [["ch4", 3], ["ch5", 4], ["ch6", 5], ["ch7", 6]] as const)
        expect(chapterIndex(o, landingVh(o, id)!)).toBe(k);
      // pearlAt is no longer used by the live page (production identity has no pearl shift).
      expect(pearlAt(o, landingVh(o, "ch7")!)).toBe(0);
    });
  }

  it("rotation keeps chapter and product", () => {
    const b = boundaries("portrait");
    for (let vh = 0; vh < b.at(-1)! + 100; vh += 3) {
      const l = mapVh("portrait", "landscape", vh);
      expect(chapterIndex("landscape", l)).toBe(chapterIndex("portrait", vh));
      if (vh > STORY.portrait.ch5[0] && vh < STORY.portrait.ch5[1])
        expect(productAt("landscape", l)).toBe(productAt("portrait", vh));
      expect(mapVh("landscape", "portrait", l)).toBeCloseTo(vh, 6);
    }
  });
});

describe("v4 themes: worlds and pages by tone", () => {
  const vhs = (o: "landscape" | "portrait") => Array.from({ length: 160 }, (_, i) => i * 10).filter((v) => v <= STORY[o].ch7[1]);
  it("dark swaps white and black; red stays red", () => {
    for (const o of ["landscape", "portrait"] as const)
      for (const vh of vhs(o)) {
        const l = worldAt(o, vh, "light");
        const d = worldAt(o, vh, "dark");
        const swap = { white: "black", black: "white", red: "red" } as const;
        expect(d.name).toBe(swap[l.name]);
      }
  });
  it("light theme is unchanged from v3", () => {
    for (const o of ["landscape", "portrait"] as const)
      for (const vh of vhs(o)) expect(worldAt(o, vh)).toEqual(worldAt(o, vh, "light"));
    expect(PAGE_COLOR).toEqual({ ch3: "black", ch4: "black", ch6: "red" });
  });
  it("pages and sections resolve per theme", () => {
    expect(pageColor("ch3", "dark")).toBe("white");
    expect(pageColor("ch6", "dark")).toBe("red");
    expect(groundOf("paper", "dark")).toBe("black");
    expect(groundOf("inverse", "dark")).toBe("white");
    expect(groundOf("paper", "light")).toBe("white");
    expect(groundOf("black", "dark")).toBe("black");
    expect(TONE.dark.paper).toBe("black");
  });
});
