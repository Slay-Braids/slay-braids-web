/**
 * Lighthouse (lab, simulated throttling) against the static export.
 *   pnpm build && pnpm perf:lighthouse
 * Writes docs/perf/lighthouse-<profile>.json and prints a summary.
 * Lab numbers ≠ real devices: headless WebGL is CPU-rendered (SwiftShader), which inflates
 * main-thread contention after the 3D starts. Real-device numbers come from the #perf HUD.
 */
import lighthouse from "lighthouse";
import * as chromeLauncher from "chrome-launcher";
import { createServer } from "node:http";
import { readFile, writeFile, mkdir } from "node:fs/promises";
import path from "node:path";

const OUT = path.resolve("out");
const types = {
  ".html": "text/html",
  ".js": "text/javascript",
  ".css": "text/css",
  ".woff2": "font/woff2",
  ".avif": "image/avif",
  ".webp": "image/webp",
  ".jpg": "image/jpeg",
  ".json": "application/json",
  ".txt": "text/plain",
};
const server = createServer(async (req, res) => {
  let p = path.join(OUT, decodeURIComponent(new URL(req.url, "http://x").pathname));
  if (p.endsWith("/")) p += "index.html";
  try {
    const body = await readFile(p);
    res.writeHead(200, {
      "content-type": types[path.extname(p)] ?? "application/octet-stream",
      "cache-control": "public, max-age=31536000, immutable",
    });
    res.end(body);
  } catch {
    res.writeHead(404);
    res.end();
  }
});
await new Promise((r) => server.listen(4180, "127.0.0.1", r));

const chromePath =
  process.env.CHROME_PATH ?? "/opt/pw-browsers/chromium-1243/chrome-linux64/chrome";
const chrome = await chromeLauncher.launch({
  chromePath,
  chromeFlags: [
    "--headless=new",
    "--no-sandbox",
    "--use-angle=swiftshader",
    "--enable-unsafe-swiftshader",
  ],
});
await mkdir("docs/perf", { recursive: true });

const only = process.argv[2];
const runs = [
  { name: "mobile-auto", url: "/", formFactor: "mobile" },
  { name: "mobile-static", url: "/?tier=C", formFactor: "mobile" },
  { name: "desktop-auto", url: "/", formFactor: "desktop" },
];
const summary = {};
for (const r of runs.filter((x) => !only || x.name === only)) {
  const desktop = r.formFactor === "desktop";
  const result = await lighthouse(`http://127.0.0.1:4180${r.url}`, {
    port: chrome.port,
    output: "json",
    onlyCategories: ["performance", "accessibility", "best-practices", "seo"],
    formFactor: r.formFactor,
    screenEmulation: desktop
      ? { mobile: false, width: 1440, height: 900, deviceScaleFactor: 1, disabled: false }
      : undefined,
    throttling: desktop
      ? { rttMs: 40, throughputKbps: 10240, cpuSlowdownMultiplier: 1 }
      : undefined,
  });
  const lhr = result.lhr;
  const a = lhr.audits;
  summary[r.name] = {
    performance: Math.round(lhr.categories.performance.score * 100),
    accessibility: Math.round(lhr.categories.accessibility.score * 100),
    bestPractices: Math.round(lhr.categories["best-practices"].score * 100),
    seo: Math.round(lhr.categories.seo.score * 100),
    LCP_ms: Math.round(a["largest-contentful-paint"].numericValue),
    FCP_ms: Math.round(a["first-contentful-paint"].numericValue),
    TBT_ms: Math.round(a["total-blocking-time"].numericValue),
    CLS: +a["cumulative-layout-shift"].numericValue.toFixed(3),
    SpeedIndex_ms: Math.round(a["speed-index"].numericValue),
    lcpElement:
      a["largest-contentful-paint-element"]?.details?.items?.[0]?.items?.[0]?.node?.snippet ?? null,
  };
  // Diagnostics: the LCP element, layout shifts and any failed accessibility audits.
  const failedA11y = Object.values(a)
    .filter(
      (x) => lhr.categories.accessibility.auditRefs.some((ref) => ref.id === x.id) && x.score === 0,
    )
    .map((x) => ({
      id: x.id,
      nodes: (x.details?.items ?? []).map((i) => i.node?.snippet).slice(0, 6),
    }));
  summary[r.name].failedAccessibility = failedA11y;
  summary[r.name].lcpDetail = JSON.stringify(
    a["largest-contentful-paint-element"]?.details ?? null,
  ).slice(0, 1200);
  summary[r.name].layoutShifts = (a["layout-shifts"]?.details?.items ?? [])
    .map((i) => ({ score: i.score, node: i.node?.snippet }))
    .slice(0, 5);
  await writeFile(
    `docs/perf/lighthouse-${r.name}.json`,
    JSON.stringify(summary[r.name], null, 2) + "\n",
  );
}
console.log(JSON.stringify(summary, null, 2));
await chrome.kill();
server.close();
