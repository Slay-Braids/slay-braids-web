import { ANCHOR } from "@/experience/tiers";

/**
 * Fixed stage behind the editorial content: the anchor still (LCP, static fallback) and the
 * canvas the live scene fades into. The still and the canvas are pixel-aligned by design.
 */
const LANDSCAPE = [1280, 1920, 2560] as const;
const PORTRAIT = [720, 1080, 1440] as const;

export function anchorSrcSet(base: string, orientation: "landscape" | "portrait", ext: string) {
  const widths = orientation === "landscape" ? LANDSCAPE : PORTRAIT;
  return widths
    .map((w) => `${base}anchors/${ANCHOR.version}-${orientation}-${w}.${ext} ${w}w`)
    .join(", ");
}

export function AnchorStage({ assetBase = "/" }: { assetBase?: string }) {
  return (
    <div className="stage" data-stage data-live="false" aria-hidden="true">
      <picture>
        <source
          media="(orientation: portrait)"
          type="image/avif"
          srcSet={anchorSrcSet(assetBase, "portrait", "avif")}
          sizes="100vw"
        />
        <source
          media="(orientation: portrait)"
          type="image/webp"
          srcSet={anchorSrcSet(assetBase, "portrait", "webp")}
          sizes="100vw"
        />
        <source
          media="(orientation: portrait)"
          srcSet={anchorSrcSet(assetBase, "portrait", "jpg")}
          sizes="100vw"
        />
        <source
          type="image/avif"
          srcSet={anchorSrcSet(assetBase, "landscape", "avif")}
          sizes="100vw"
        />
        <source
          type="image/webp"
          srcSet={anchorSrcSet(assetBase, "landscape", "webp")}
          sizes="100vw"
        />
        <img
          src={`${assetBase}anchors/${ANCHOR.version}-landscape-1920.jpg`}
          srcSet={anchorSrcSet(assetBase, "landscape", "jpg")}
          sizes="100vw"
          alt=""
          width={1920}
          height={1080}
          fetchPriority="high"
          decoding="async"
        />
      </picture>
      <canvas />
    </div>
  );
}
