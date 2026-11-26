/**
 * Bundle report for the static export: what the first screen loads vs what is lazy.
 *   pnpm build && pnpm perf:bundle   → docs/perf/bundle.json
 */
import { readFile, readdir, writeFile, mkdir } from "node:fs/promises";
import { gzipSync, brotliCompressSync } from "node:zlib";
import path from "node:path";

const OUT = path.resolve("out");
const html = await readFile(path.join(OUT, "index.html"), "utf8");
// Scripts modern browsers execute on first load (noModule polyfills are skipped by them).
const scriptTags = [...html.matchAll(/<script[^>]*src="([^"]+\.js)"[^>]*>/g)];
const initial = new Set(scriptTags.filter((m) => !/noModule/i.test(m[0])).map((m) => m[1]));
const legacyOnly = scriptTags.filter((m) => /noModule/i.test(m[0])).map((m) => m[1]);
const css = [...html.matchAll(/<link[^>]+href="([^"]+\.css)"/g)].map((m) => m[1]);
const chunkDir = path.join(OUT, "_next/static/chunks");
const files = [];
async function walk(dir) {
  for (const e of await readdir(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) await walk(p);
    else if (p.endsWith(".js")) files.push(p);
  }
}
await walk(chunkDir);
const rows = [];
for (const f of files) {
  const buf = await readFile(f);
  const rel = "/" + path.relative(OUT, f).split(path.sep).join("/");
  const s = buf.toString();
  const label = s.includes("THREE.WebGLRenderer")
    ? "three.js + CascadeScene"
    : s.includes("ScrollTrigger")
      ? "GSAP + ScrollTrigger"
      : s.includes("lenis")
        ? "Lenis"
        : s.includes("onmessage") && s.length < 20000
          ? "geometry worker"
          : "";
  rows.push({
    file: rel,
    initial: initial.has(rel),
    raw: buf.length,
    gzip: gzipSync(buf).length,
    brotli: brotliCompressSync(buf).length,
    label,
  });
}
const sum = (rs, k) => rs.reduce((a, r) => a + r[k], 0);
const init = rows.filter((r) => r.initial);
const lazy = rows.filter((r) => !r.initial && !legacyOnly.includes(r.file));
const cssBytes = [];
for (const c of css) {
  const b = await readFile(path.join(OUT, c));
  cssBytes.push({ file: c, raw: b.length, gzip: gzipSync(b).length });
}
const report = {
  initialJS: {
    files: init.length,
    raw: sum(init, "raw"),
    gzip: sum(init, "gzip"),
    brotli: sum(init, "brotli"),
  },
  lazyJS: { files: lazy.length, raw: sum(lazy, "raw"), gzip: sum(lazy, "gzip") },
  legacyBrowsersOnly: legacyOnly,
  css: cssBytes,
  labelledLazy: lazy
    .filter((r) => r.label)
    .map(({ label, gzip, raw }) => ({
      label,
      gzipKB: +(gzip / 1024).toFixed(1),
      rawKB: +(raw / 1024).toFixed(1),
    })),
};
await mkdir("docs/perf", { recursive: true });
await writeFile("docs/perf/bundle.json", JSON.stringify(report, null, 2) + "\n");
console.log(JSON.stringify(report, null, 2));
