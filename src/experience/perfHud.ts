/**
 * Performance HUD (#perf or ?perf=1). For real-device testing: shows what the device actually
 * achieves and offers a one-tap copy of the results.
 */
import type { ExperienceState } from "./controller";

function pct(sorted: number[], p: number) {
  if (!sorted.length) return 0;
  return sorted[Math.min(sorted.length - 1, Math.floor((p / 100) * sorted.length))]!;
}

export function summarise(state: ExperienceState) {
  const ft = [...state.frameTimes].sort((a, b) => a - b);
  const p50 = pct(ft, 50);
  const p95 = pct(ft, 95);
  const p99 = pct(ft, 99);
  const nav = performance.getEntriesByType("navigation")[0] as
    PerformanceNavigationTiming | undefined;
  const lcp = performance.getEntriesByType("largest-contentful-paint").at(-1) as
    PerformanceEntry | undefined;
  const mem = (performance as unknown as { memory?: { usedJSHeapSize: number } }).memory;
  return {
    anchor: state.anchor,
    tier: state.tier,
    tierReason: state.tierReason,
    orientation: state.orientation,
    viewport: `${innerWidth}×${innerHeight} @${devicePixelRatio}x`,
    userAgent: navigator.userAgent,
    fpsMedian: p50 ? Math.round(1000 / p50) : null,
    frameMsP50: +p50.toFixed(1),
    frameMsP95: +p95.toFixed(1),
    frameMsP99: +p99.toFixed(1),
    framesSampled: ft.length,
    lcpMs: lcp ? Math.round(lcp.startTime) : null,
    domContentLoadedMs: nav ? Math.round(nav.domContentLoadedEventEnd) : null,
    jsHeapMB: mem ? +(mem.usedJSHeapSize / 1e6).toFixed(1) : null,
    marks: state.marks,
    downgrades: state.downgrades,
    scene: state.stats ?? null,
  };
}

export function mountPerfHud(state: ExperienceState) {
  // Observe LCP so it is available in summaries.
  try {
    new PerformanceObserver(() => {}).observe({ type: "largest-contentful-paint", buffered: true });
  } catch {
    /* unsupported */
  }
  const box = document.createElement("aside");
  box.setAttribute("aria-label", "Performance readout");
  box.style.cssText =
    "position:fixed;right:12px;bottom:12px;z-index:50;max-width:min(92vw,360px);font:12px/1.45 ui-monospace,Menlo,monospace;" +
    "background:rgba(10,9,8,.88);color:#f2ece2;border:1px solid rgba(216,195,160,.35);padding:10px 12px;border-radius:6px;white-space:pre-wrap";
  const pre = document.createElement("div");
  const btn = document.createElement("button");
  btn.type = "button";
  btn.textContent = "Copy results";
  btn.style.cssText =
    "margin-top:8px;min-height:44px;padding:0 14px;background:#d8c3a0;color:#0a0908;border:0;border-radius:4px;font:600 13px system-ui;cursor:pointer";
  btn.addEventListener("click", async () => {
    try {
      await navigator.clipboard.writeText(JSON.stringify(summarise(state), null, 2));
      btn.textContent = "Copied";
    } catch {
      btn.textContent = "Copy blocked — long-press the text instead";
    }
  });
  box.append(pre, btn);
  document.body.append(box);
  const render = () => {
    const s = summarise(state);
    pre.textContent =
      `tier ${s.tier} · ${s.orientation} · ${s.viewport}\n` +
      `fps ${s.fpsMedian ?? "–"} · frame p50 ${s.frameMsP50} / p95 ${s.frameMsP95} ms\n` +
      `LCP ${s.lcpMs ?? "–"} ms · live at ${s.marks.handoffDone ?? "–"} ms\n` +
      (s.scene
        ? `fibres ${(s.scene as { fibres: number }).fibres} · draw calls ${(s.scene as { drawCalls: number }).drawCalls}\n`
        : "") +
      (s.downgrades.length ? `downgrades: ${s.downgrades.join(", ")}\n` : "") +
      `reason: ${s.tierReason}`;
  };
  render();
  setInterval(render, 1000);
}
