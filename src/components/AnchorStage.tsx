import { ANCHOR } from "@/experience/tiers";
import { SCHEME_MEDIA_BOOT } from "@/experience/theme";

/**
 * Fixed stage behind the editorial content: the anchor still (LCP, static fallback) and the
 * canvas the live scene fades into. The still and the canvas are pixel-aligned by design.
 * v4: a dark still (the same render on the dark theme's black world) is chosen by the colour
 * scheme; a theme picked on the site rewrites those media queries (see experience/theme.ts).
 */
const LANDSCAPE = [1280, 1920, 2560] as const;
const PORTRAIT = [720, 1080, 1440] as const;

export function anchorSrcSet(
  base: string,
  orientation: "landscape" | "portrait",
  ext: string,
  theme: "light" | "dark" = "light",
) {
  const widths = orientation === "landscape" ? LANDSCAPE : PORTRAIT;
  const name = theme === "dark" ? `${ANCHOR.version}-dark` : ANCHOR.version;
  return widths.map((w) => `${base}anchors/${name}-${orientation}-${w}.${ext} ${w}w`).join(", ");
}

const DARK = "(prefers-color-scheme: dark)";
const PORTRAIT_Q = "(orientation: portrait)";

export function AnchorStage({ assetBase = "/" }: { assetBase?: string }) {
  const sources: { media?: string; scheme?: boolean; o: "landscape" | "portrait"; t: "light" | "dark"; ext?: string }[] = [];
  for (const t of ["dark", "light"] as const)
    for (const o of ["portrait", "landscape"] as const)
      for (const ext of ["avif", "webp", "jpg"]) {
        const parts = [t === "dark" ? DARK : "", o === "portrait" ? PORTRAIT_Q : ""].filter(Boolean);
        sources.push({ media: parts.length ? parts.join(" and ") : undefined, scheme: t === "dark", o, t, ext });
      }
  // The light landscape jpg is the <img> itself.
  sources.pop();
  return (
    <div className="stage" data-stage data-live="false" aria-hidden="true">
      <picture>
        {sources.map((s) => (
          <source
            key={`${s.t}-${s.o}-${s.ext}`}
            media={s.media}
            data-scheme={s.scheme ? "" : undefined}
            type={s.ext === "jpg" ? undefined : `image/${s.ext}`}
            srcSet={anchorSrcSet(assetBase, s.o, s.ext!, s.t)}
            sizes="100vw"
          />
        ))}
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
      <script dangerouslySetInnerHTML={{ __html: SCHEME_MEDIA_BOOT }} />
      <canvas />
    </div>
  );
}
