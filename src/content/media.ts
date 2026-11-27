/**
 * Brand media on the production site: original footage from the SLAY BRAIDS Google Drive
 * ("Slay shoot footages"), encoded by scripts/encode-brand-media.mjs without grading
 * (public/media/manifest.json lists source file, Drive id and segment for every file).
 *
 * Looks are numbered, not named: no official style, product or shade names have been supplied.
 */
export interface LoopClip {
  id: string;
  /** Short descriptive name of what is shown (a description, not an official style name). */
  name?: string;
  /** Write-up shown with the clip. */
  text?: string;
  /** Base name in public/media: `${base}-720.mp4`, `${base}-1080.mp4`, `${base}-poster-*.{avif,webp,jpg}`. */
  base: string;
  source: string;
  /** Text alternative describing what is visible (no names or claims). */
  alt: string;
}
export interface Still {
  caption?: string;
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
    name: "Copper curls",
    text: "Long copper curls with a braided root: full, defined, and made to move.",
    base: "look-copper",
    source: "IMG_2465.MOV",
    alt: "A model turns to show long copper curls against a floral wall.",
  },
  {
    id: "look-02",
    name: "Platinum waves",
    text: "Long platinum waves with fine braids framing the face, light and airy at the ends.",
    base: "look-platinum",
    source: "IMG_2471.MOV",
    alt: "A model with long platinum waves poses in front of a floral wall.",
  },
  {
    id: "look-03",
    name: "Honey straight",
    text: "Long, straight honey-brown hair with a soft sheen that swings with every turn.",
    base: "look-honey",
    source: "IMG_2466.MOV",
    alt: "A model turns to show long, straight honey-brown hair.",
  },
  {
    id: "look-04",
    name: "Black waves, braided front",
    text: "Black waves worn long, with sculpted cornrows at the front.",
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
      name: "Copper curls, up close",
      text: "Braided at the root, loose to the ends.",
      base: "lookbook-copper",
      source: "IMG_2464.MOV",
      alt: "Close view of copper curls falling down a model's back, a red backdrop behind.",
    },
  },
  {
    kind: "still",
    still: {
      caption: "Honey to rose: a straight look with a soft colour melt.",
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
      caption: "Platinum waves, with fine braids at the parting.",
      base: "lookbook-platinum",
      source: "IMG_2463.MOV",
      alt: "Close portrait of a model with platinum waves and fine braids at the parting.",
      width: 2160,
      height: 3840,
    },
  },
];
