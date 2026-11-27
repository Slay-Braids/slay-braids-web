/**
 * Preview harness: bundles the SAME components and experience code as the Next.js site into a
 * folder with relative paths, for the private artifact preview (which allows only relative
 * own files, inline/data fonts, and #hash flags). Not the production build.
 */
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import path from "node:path";

export default defineConfig({
  root: path.resolve(__dirname),
  base: "./",
  publicDir: path.resolve(__dirname, "../public"),
  plugins: [react(), tailwindcss()],
  resolve: { alias: { "@": path.resolve(__dirname, "../src") } },
  worker: { format: "es" },
  build: {
    outDir: path.resolve(__dirname, "../dist-preview"),
    emptyOutDir: true,
    sourcemap: false,
    // The preview host only allows fonts as data: URIs.
    assetsInlineLimit: (file) => (file.endsWith(".woff2") ? true : undefined),
  },
});
