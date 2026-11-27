/**
 * Brand media on the production site: original footage from the SLAY BRAIDS Google Drive
 * ("Slay shoot footages"), encoded by scripts/encode-brand-media.mjs without grading
 * (public/media/manifest.json lists source file, Drive id and segment for every file).
 *
 * Looks are numbered, not named: no official style, product or shade names have been supplied.
 */
export interface LoopClip {
  id: string;
  /** Base name in public/media: `${base}-720.mp4`, `${base}-1080.mp4`, `${base}-poster-*.{avif,webp,jpg}`. */
  base: string;
  source: string;
  /** Text alternative describing what is visible (no names or claims). */
  alt: string;
}
export interface Still {
  base: string;
  source: string;
  alt: string;
  width: number;
  height: number;
}

export const craftClip: LoopClip = {
  id: "craft",
  base: "craft",
  source: "IMG_2209.MOV",
  alt: "Hands present a long, softly waved length of brown braiding hair against a pale wall.",
};

export const lookClips: LoopClip[] = [
  {
    id: "look-01",
    base: "look-copper",
    source: "IMG_2465.MOV",
    alt: "A model turns to show long copper curls against a floral wall.",
  },
  {
    id: "look-02",
    base: "look-platinum",
    source: "IMG_2471.MOV",
    alt: "A model with long platinum waves poses in front of a floral wall.",
  },
  {
    id: "look-03",
    base: "look-honey",
    source: "IMG_2466.MOV",
    alt: "A model turns to show long, straight honey-brown hair.",
  },
  {
    id: "look-04",
    base: "look-black",
    source: "IMG_2470.MOV",
    alt: "A model shows black waves with braided cornrows at the front.",
  },
];

export const portraitStill: Still = {
  base: "portrait-copper",
  source: "IMG_2465.MOV",
  alt: "Portrait of a model with long copper curls in a black dress.",
  width: 2160,
  height: 3840,
};

export const lookbookMedia: ({ kind: "video"; clip: LoopClip } | { kind: "still"; still: Still })[] = [
  {
    kind: "video",
    clip: {
      id: "lookbook-copper",
      base: "lookbook-copper",
      source: "IMG_2464.MOV",
      alt: "Close view of copper curls falling down a model's back, a red backdrop behind.",
    },
  },
  {
    kind: "still",
    still: {
      base: "lookbook-honey",
      source: "IMG_2468.MOV",
      alt: "Close portrait of a model with long, straight honey-to-rose hair.",
      width: 2160,
      height: 3840,
    },
  },
  {
    kind: "still",
    still: {
      base: "lookbook-platinum",
      source: "IMG_2463.MOV",
      alt: "Close portrait of a model with platinum waves and fine braids at the parting.",
      width: 2160,
      height: 3840,
    },
  },
];
