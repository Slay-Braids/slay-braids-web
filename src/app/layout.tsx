import type { Metadata, Viewport } from "next";
import "@/styles/globals.css";
import { anchorSrcSet } from "@/components/AnchorStage";
import { THEME_BOOT } from "@/experience/theme";

export const metadata: Metadata = {
  title: "SLAY BRAIDS — Premium look. Affordable price.",
  description: "SLAY BRAIDS. Premium look. Affordable price. FUTURA by SLAY BRAIDS.",
  // Indexing on (27 Nov 2026): model consent confirmed by the owner.
  metadataBase: new URL("https://slaybraids.vercel.app"),
  alternates: { canonical: "/" },
  openGraph: {
    type: "website",
    url: "https://slaybraids.vercel.app",
    siteName: "SLAY BRAIDS",
    title: "SLAY BRAIDS — Premium look. Affordable price.",
    description: "Braids and hair that look like a splurge, at a price that isn't one. FUTURA by SLAY BRAIDS.",
    images: [{ url: "/media/og.jpg", width: 1200, height: 630, alt: "SLAY BRAIDS" }],
  },
  twitter: { card: "summary_large_image", images: ["/media/og.jpg"] },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  // v4: both schemes are supported, so browsers' own "dark mode for websites" leaves the page to
  // its dark theme instead of recolouring it.
  themeColor: [
    { media: "(prefers-color-scheme: dark)", color: "#0a0a0a" },
    { media: "(prefers-color-scheme: light)", color: "#ffffff" },
  ],
  colorScheme: "light dark",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    // data-static is on by default so the page is complete without JavaScript (the printed spreads);
    // the inline script removes it before first paint when JavaScript runs.
    <html lang="en" data-static="true" data-theme="light" suppressHydrationWarning>
      <head>
        <link rel="icon" type="image/png" href="/media/favicon.png" />
        {/* Theme before first paint: the visitor's pick, else the system setting. */}
        <script dangerouslySetInnerHTML={{ __html: THEME_BOOT }} />
        {/* Marks JS availability before paint so reveal styles never hide content without JS. */}
        <script
          dangerouslySetInnerHTML={{ __html:
              "document.documentElement.classList.add('js');document.documentElement.removeAttribute('data-static')" }}
        />
        {/* The anchor still is the LCP element: preload the right orientation. */}
        {(["light", "dark"] as const).flatMap((t) =>
          (["portrait", "landscape"] as const).map((o) => (
            <link
              key={`${t}-${o}`}
              rel="preload"
              as="image"
              type="image/avif"
              media={`(prefers-color-scheme: ${t}) and (orientation: ${o})`}
              imageSrcSet={anchorSrcSet("/", o, "avif", t)}
              imageSizes="100vw"
              fetchPriority="high"
            />
          )),
        )}
      </head>
      <body>{children}</body>
    </html>
  );
}
