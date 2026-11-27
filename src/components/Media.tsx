import type { LoopClip, Still } from "@/content/media";

/**
 * A muted, looping clip of original brand footage. It never autoplays by itself: the site's
 * media controller (experience/media.ts) plays it only while it is on screen, motion is allowed
 * and the visitor has not paused motion. Posters show first (and in reduced motion, only).
 * The 720p file is used up to 900 px wide, the 1080p file above.
 */
export function LoopVideo({ clip, base, className }: { clip: LoopClip; base: string; className?: string }) {
  const m = `${base}media/${clip.base}`;
  return (
    <video
      className={`loop-video${className ? ` ${className}` : ""}`}
      data-loop-video
      muted
      loop
      playsInline
      preload="none"
      poster={`${m}-poster-1080.webp`}
      aria-label={clip.alt}
      width={1080}
      height={1920}
    >
      <source src={`${m}-720.mp4`} type="video/mp4" media="(max-width: 900px)" />
      <source src={`${m}-1080.mp4`} type="video/mp4" />
    </video>
  );
}

export function StillPicture({
  still,
  base,
  className,
  sizes = "(max-width: 900px) 90vw, 36vw",
  eager = false,
  widths = [540, 1080],
}: {
  still: Still;
  base: string;
  className?: string;
  sizes?: string;
  eager?: boolean;
  widths?: [number, number];
}) {
  const m = `${base}media/${still.base}`;
  const set = (ext: string) => widths.map((w) => `${m}-${w}.${ext} ${w}w`).join(", ");
  return (
    <picture className={className}>
      <source type="image/avif" srcSet={set("avif")} sizes={sizes} />
      <source type="image/webp" srcSet={set("webp")} sizes={sizes} />
      <img
        src={`${m}-${widths[1]}.jpg`}
        srcSet={set("jpg")}
        sizes={sizes}
        alt={still.alt}
        width={still.width}
        height={still.height}
        loading={eager ? "eager" : "lazy"}
        decoding="async"
      />
    </picture>
  );
}

/** The original SLAY BRAIDS logo (trimmed PNG/WebP from the Drive file). */
export function Logo({
  base,
  variant = "red",
  width,
  className,
  alt = "SLAY BRAIDS",
}: {
  base: string;
  variant?: "red" | "white";
  width: number;
  className?: string;
  alt?: string;
}) {
  const m = `${base}media/logo-${variant}`;
  const widths = variant === "red" ? [320, 640, 1280] : [320];
  return (
    <picture className={className}>
      <source type="image/webp" srcSet={widths.map((w) => `${m}-${w}.webp ${w}w`).join(", ")} sizes={`${width}px`} />
      <img
        src={`${m}-320.png`}
        srcSet={widths.map((w) => `${m}-${w}.png ${w}w`).join(", ")}
        sizes={`${width}px`}
        alt={alt}
        width={width}
        height={Math.round(width * LOGO_RATIO[variant])}
        decoding="async"
      />
    </picture>
  );
}
/** Height / width of the trimmed logo files (set from the encode; see public/media/manifest.json). */
export const LOGO_RATIO = { red: 0.686, white: 0.686 } as const;
