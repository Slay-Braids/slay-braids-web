import type { Metadata, Viewport } from "next";
import "@/styles/globals.css";
import { anchorSrcSet } from "@/components/AnchorStage";

export const metadata: Metadata = {
  title: "SLAY BRAIDS — Premium look. Affordable price.",
  description: "Preview of the SLAY BRAIDS website. Not for publication.",
  robots: { index: false, follow: false },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#0a0908",
  colorScheme: "dark",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    // data-static is on by default so the page is complete without JavaScript (the printed spreads);
    // the inline script removes it before first paint when JavaScript runs.
    <html lang="en" data-static="true" suppressHydrationWarning>
      <head>
        <link rel="icon" href="data:," />
        {/* Marks JS availability before paint so reveal styles never hide content without JS. */}
        <script
          dangerouslySetInnerHTML={{ __html:
              "document.documentElement.classList.add('js');document.documentElement.removeAttribute('data-static')" }}
        />
        {/* The anchor still is the LCP element: preload the right orientation. */}
        <link
          rel="preload"
          as="image"
          type="image/avif"
          media="(orientation: portrait)"
          imageSrcSet={anchorSrcSet("/", "portrait", "avif")}
          imageSizes="100vw"
          fetchPriority="high"
        />
        <link
          rel="preload"
          as="image"
          type="image/avif"
          media="(orientation: landscape)"
          imageSrcSet={anchorSrcSet("/", "landscape", "avif")}
          imageSizes="100vw"
          fetchPriority="high"
        />
      </head>
      <body>{children}</body>
    </html>
  );
}
