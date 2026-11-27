/**
 * Chapter 3 transition lab (#lab-transition). Private review tool, never part of the page:
 *  - scrub the transition, switch each edge treatment on and off, show the guide points
 *  - GPU accuracy probe: CPU guide strand vs the locked vertex shader on this GPU
 *    (scripted 30 s run with live wind and a moving pointer; readback every 10th frame)
 *  - camera path plot for the whole Chapters 1–3 timeline
 *  - results as JSON (copy button, and window.__lab for automation)
 */
import type { LiveChapters, ChapterFrameInfo } from "./live";
import { CHAPTER_LAYOUT, CH3, cameraTimeline } from "./cameraTimeline";
import { GpuProbe, percentiles } from "./probe";
import type { PaperToggles } from "./paper";
import { vhPx } from "./viewport";

export const ACCURACY = { p99: 2, max: 3 } as const; // CSS px, approved acceptance criteria

export interface LabResults {
  date: string;
  viewport: { width: number; height: number; dpr: number };
  orientation: string;
  gpu: string;
  durationMs: number;
  guidePoints: number;
  probedFrames: number;
  /** Readback interval in frames (spec: every 10th). */
  probeEvery: number;
  /** What the probed frames covered: wind strength and pointer force actually sent to the GPU. */
  conditions: {
    windMin: number;
    windMax: number;
    pointerForceMax: number;
    framesWithPointer: number;
  };
  pointError: ReturnType<typeof percentiles>;
  edgeError: ReturnType<typeof percentiles>;
  pass: boolean;
  transitionFrames: ReturnType<typeof percentiles>;
  edgeComputeMs: ReturnType<typeof percentiles>;
}

declare global {
  interface Window {
    __lab?: {
      run: (durationMs?: number, probeEvery?: number) => Promise<LabResults>;
      last?: LabResults;
    };
  }
}

const css = `
.lab{position:fixed;right:12px;bottom:40px;z-index:60;width:340px;max-height:calc(100vh - 80px);overflow:auto;
 background:rgba(12,11,10,.94);color:#e9e2d6;font:12px/1.45 ui-monospace,Menlo,monospace;border:1px solid #3b342c;border-radius:6px;padding:12px}
.lab h2{font:600 12px/1.2 ui-monospace,Menlo,monospace;letter-spacing:.08em;text-transform:uppercase;margin:0 0 8px;color:#d8c3a0}
.lab label{display:flex;gap:8px;align-items:center;margin:3px 0}
.lab input[type=range]{width:100%}
.lab button{background:#d8c3a0;color:#0a0908;border:0;border-radius:3px;padding:6px 10px;font:inherit;cursor:pointer;margin:6px 6px 0 0}
.lab button[disabled]{opacity:.5}
.lab .row{display:flex;justify-content:space-between}
.lab .pass{color:#9fd49a}.lab .fail{color:#f08f7f}
.lab svg{width:100%;height:120px;background:#14120f;margin-top:6px}
.lab-overlay{position:fixed;inset:0;z-index:55;pointer-events:none}
`;

export function mountLab(chapters: LiveChapters) {
  const style = document.createElement("style");
  style.textContent = css;
  document.head.append(style);
  const panel = document.createElement("aside");
  panel.className = "lab";
  panel.setAttribute("aria-label", "Transition lab");
  panel.innerHTML = `
    <h2>Chapter 3 transition lab</h2>
    <label>Position <span data-k="pos">–</span></label>
    <input type="range" min="0" max="1000" value="500" data-k="slider" aria-label="Chapter 3 position">
    <div data-k="toggles"></div>
    <label><input type="checkbox" data-k="points"> show guide points (CPU ● / GPU ○)</label>
    <div><button data-k="run">Run accuracy test (30 s)</button><button data-k="copy" disabled>Copy results</button></div>
    <div data-k="out" style="margin-top:8px">Not run yet.</div>
    <h2 style="margin-top:12px">Camera path (Ch1–3)</h2>
    <svg viewBox="0 0 300 120" data-k="plot" aria-hidden="true"></svg>
    <div class="row"><span>— pos x  — pos y  — pos z</span><span data-k="vh"></span></div>`;
  document.body.append(panel);
  const q = <T extends Element>(k: string) => panel.querySelector<T>(`[data-k=${k}]`)!;

  const o = () => chapters.currentOrientation;
  const L = () => CHAPTER_LAYOUT[o()].ch3;
  const slider = q<HTMLInputElement>("slider");
  const setPos = (rel: number) => scrollTo(0, (L()[0] + rel * (L()[1] - L()[0])) * vhPx());
  slider.addEventListener("input", () => setPos(+slider.value / 1000));
  setPos(0.5);

  const names: [keyof PaperToggles, string][] = [
    ["highlight", "champagne highlight (1 px, 35 %)"],
    ["paperShadow", "paper inner shadow"],
    ["contactShadow", "contact shadow on hair"],
    ["spill", "light spill at key pool"],
  ];
  const tg = q<HTMLDivElement>("toggles");
  for (const [k, label] of names) {
    const l = document.createElement("label");
    l.innerHTML = `<input type="checkbox" checked> ${label}`;
    l.querySelector("input")!.addEventListener("change", (e) => {
      chapters.toggles[k] = (e.target as HTMLInputElement).checked;
    });
    tg.append(l);
  }

  // Guide point overlay.
  const overlay = document.createElement("canvas");
  overlay.className = "lab-overlay";
  document.body.append(overlay);
  const showPoints = q<HTMLInputElement>("points");
  let lastGpu: Float64Array | undefined;

  // Camera path plot.
  const drawPlot = () => {
    const svg = q<SVGSVGElement>("plot");
    const tl = cameraTimeline(o());
    const end = L()[1];
    const pts: [number, number, number][] = [];
    for (let v = 0; v <= end; v += 2) pts.push(tl(v).position);
    const all = pts.flat();
    const lo = Math.min(...all);
    const hi = Math.max(...all);
    const X = (i: number) => ((i * 2) / end) * 300;
    const Y = (v: number) => 112 - ((v - lo) / (hi - lo || 1)) * 104;
    const colors = ["#d8c3a0", "#8fb3d9", "#c98fb3"];
    const lines = [0, 1, 2]
      .map(
        (c) =>
          `<polyline fill="none" stroke="${colors[c]}" stroke-width="1.2" points="${pts.map((p, i) => `${X(i).toFixed(1)},${Y(p[c]!).toFixed(1)}`).join(" ")}"/>`,
      )
      .join("");
    const marks = CHAPTER_LAYOUT[o()].stops
      .map(
        (s) =>
          `<line x1="${(s / end) * 300}" x2="${(s / end) * 300}" y1="0" y2="120" stroke="#3b342c"/>`,
      )
      .join("");
    svg.innerHTML = `${marks}${lines}<line data-k="cursor" x1="0" x2="0" y1="0" y2="120" stroke="#fff" stroke-opacity=".6"/>`;
  };
  drawPlot();

  // Accuracy run state.
  let running: null | {
    t0: number;
    duration: number;
    frame: number;
    pointErr: number[];
    edgeErr: number[];
    dts: number[];
    edgeMs: number[];
    probed: number;
    every: number;
    wind: number[];
    force: number[];
    probe: GpuProbe;
    pointerTimer: number;
    resolve: (r: LabResults) => void;
  } = null;
  let lastT = performance.now();

  const prev = chapters.onChapterFrame;
  chapters.onChapterFrame = (info: ChapterFrameInfo) => {
    prev?.(info);
    const now = performance.now();
    const dt = now - lastT;
    lastT = now;
    const v = info.fs.scroll;
    q<HTMLSpanElement>("pos").textContent =
      `${v.toFixed(1)} vh · ch3 ${(info.s3.rel * 100).toFixed(1)} % · open ${info.s3.open.toFixed(2)} · away ${info.s3.away.toFixed(2)}`;
    q<HTMLSpanElement>("vh").textContent = `${v.toFixed(0)} vh`;
    const cur = panel.querySelector<SVGLineElement>("[data-k=cursor]");
    if (cur) {
      const x = ((v / L()[1]) * 300).toFixed(1);
      cur.setAttribute("x1", x);
      cur.setAttribute("x2", x);
    }

    if (running) {
      const r = running;
      const el = now - r.t0;
      // Scripted path: sweep the page between arriving and resting, pointer circling the edge.
      const rel =
        CH3.paperIn[0] +
        (CH3.holdEnd - CH3.paperIn[0]) * (0.5 - 0.5 * Math.cos((el / r.duration) * Math.PI * 4));
      setPos(rel);
      if (info.inTransition) {
        r.dts.push(dt);
        r.edgeMs.push(info.edgeMs);
      }
      r.frame++;
      if (r.frame % r.every === 0 && info.inTransition) {
        const sc = chapters.currentScene;
        const u = sc.liveUniforms;
        const cr = u.uCamRight!.value as { x: number; y: number; z: number };
        const cu = u.uCamUp!.value as { x: number; y: number; z: number };
        const pt = u.uPointer!.value as { x: number; y: number };
        const gpu = r.probe.run(
          {
            projection: info.fs.projection,
            view: info.fs.view,
            time: u.uTime!.value as number,
            wind: u.uWind!.value as number,
            pointer: [pt.x, pt.y],
            pointerForce: u.uPointerForce!.value as number,
            aspect: u.uAspect!.value as number,
            camRight: [cr.x, cr.y, cr.z],
            camUp: [cu.x, cu.y, cu.z],
          },
          info.fs.cssWidth,
          info.fs.cssHeight,
        );
        const cpu = chapters.guide.points(info.fs);
        for (let i = 0; i < cpu.xy.length / 2; i++) {
          r.pointErr.push(
            Math.hypot(cpu.xy[i * 2]! - gpu[i * 2]!, cpu.xy[i * 2 + 1]! - gpu[i * 2 + 1]!),
          );
        }
        const eC = chapters.guide.edgeFromPoints(
          cpu.xy,
          cpu.runs,
          info.fs.cssWidth,
          info.fs.cssHeight,
        );
        const eG = chapters.guide.edgeFromPoints(
          gpu,
          cpu.runs,
          info.fs.cssWidth,
          info.fs.cssHeight,
        );
        eC.forEach((p, i) => r.edgeErr.push(Math.hypot(p[0] - eG[i]![0], p[1] - eG[i]![1])));
        r.probed++;
        r.wind.push(u.uWind!.value as number);
        r.force.push(u.uPointerForce!.value as number);
        lastGpu = gpu;
      }
      if (el >= r.duration) finish();
    }

    // Overlay.
    const ctx = overlay.getContext("2d")!;
    if (overlay.width !== innerWidth) {
      overlay.width = innerWidth;
      overlay.height = innerHeight;
    }
    ctx.clearRect(0, 0, overlay.width, overlay.height);
    if (showPoints.checked && info.s3.open > 0) {
      const cpu = chapters.guide.points(info.fs).xy;
      ctx.fillStyle = "rgba(120,255,150,.8)";
      for (let i = 0; i < cpu.length; i += 2) ctx.fillRect(cpu[i]! - 1, cpu[i + 1]! - 1, 2, 2);
      if (lastGpu) {
        ctx.strokeStyle = "rgba(255,90,200,.8)";
        for (let i = 0; i < lastGpu.length; i += 8) {
          ctx.beginPath();
          ctx.arc(lastGpu[i]!, lastGpu[i + 1]!, 3, 0, Math.PI * 2);
          ctx.stroke();
        }
      }
      if (info.edge) {
        ctx.strokeStyle = "rgba(255,255,255,.7)";
        ctx.beginPath();
        info.edge.forEach((p, i) => (i ? ctx.lineTo(p[0], p[1]) : ctx.moveTo(p[0], p[1])));
        ctx.stroke();
      }
    }
  };

  const finish = () => {
    const r = running!;
    running = null;
    clearInterval(r.pointerTimer);
    const pointError = percentiles(r.pointErr);
    const edgeError = percentiles(r.edgeErr);
    const res: LabResults = {
      date: new Date().toISOString(),
      viewport: { width: innerWidth, height: innerHeight, dpr: devicePixelRatio },
      orientation: o(),
      gpu: r.probe.renderer,
      durationMs: Math.round(performance.now() - r.t0),
      guidePoints: chapters.guide.pointCount,
      probedFrames: r.probed,
      probeEvery: r.every,
      conditions: {
        windMin: r.wind.length ? Math.min(...r.wind) : NaN,
        windMax: r.wind.length ? Math.max(...r.wind) : NaN,
        pointerForceMax: r.force.length ? Math.max(...r.force) : NaN,
        framesWithPointer: r.force.filter((f) => f > 0.05).length,
      },
      pointError,
      edgeError,
      pass:
        r.probed > 0 &&
        pointError.p99 <= ACCURACY.p99 &&
        pointError.max <= ACCURACY.max &&
        edgeError.p99 <= ACCURACY.p99 &&
        edgeError.max <= ACCURACY.max,
      transitionFrames: percentiles(r.dts),
      edgeComputeMs: percentiles(r.edgeMs),
    };
    r.probe.dispose();
    window.__lab!.last = res;
    const f = (x: number) => (Number.isFinite(x) ? x.toFixed(3) : "–");
    q<HTMLDivElement>("out").innerHTML = `
      <div class="${res.pass ? "pass" : "fail"}">${res.pass ? "PASS" : "FAIL"} · points and edge: P99 ≤ ${ACCURACY.p99} px, max ≤ ${ACCURACY.max} px</div>
      <div>guide points ${res.guidePoints} · probed frames ${res.probedFrames} (every ${res.probeEvery}) · samples ${pointError.n}</div>
      <div>wind ${f(res.conditions.windMin)}–${f(res.conditions.windMax)} · pointer force max ${f(res.conditions.pointerForceMax)} (${res.conditions.framesWithPointer} frames)</div>
      <div>point error px  P50 ${f(pointError.p50)} · P95 ${f(pointError.p95)} · P99 ${f(pointError.p99)} · max ${f(pointError.max)}</div>
      <div>edge error px   P50 ${f(edgeError.p50)} · P99 ${f(edgeError.p99)} · max ${f(edgeError.max)}</div>
      <div>transition frames ms  P50 ${f(res.transitionFrames.p50)} · P95 ${f(res.transitionFrames.p95)} · P99 ${f(res.transitionFrames.p99)}</div>
      <div>edge compute ms  P50 ${f(res.edgeComputeMs.p50)} · P95 ${f(res.edgeComputeMs.p95)}</div>
      <div>GPU ${res.gpu}</div>`;
    q<HTMLButtonElement>("run").disabled = false;
    q<HTMLButtonElement>("copy").disabled = false;
    r.resolve(res);
  };

  const run = (durationMs = 30000, probeEvery = 10) =>
    new Promise<LabResults>((resolve) => {
      if (running) return;
      q<HTMLButtonElement>("run").disabled = true;
      q<HTMLDivElement>("out").textContent = "Running…";
      const t0 = performance.now();
      running = {
        t0,
        duration: durationMs,
        frame: 0,
        pointErr: [],
        edgeErr: [],
        dts: [],
        edgeMs: [],
        probed: 0,
        every: Math.max(1, Math.round(probeEvery)),
        wind: [],
        force: [],
        // The pointer moves on its own clock (as a real hand does), so the pointer push is active
        // in every probed frame whatever the frame rate.
        pointerTimer: window.setInterval(() => {
          const el = performance.now() - t0;
          chapters.currentScene.setPointer(0.35 * Math.sin(el / 700), 0.55 * Math.sin(el / 1100));
        }, 30),
        probe: new GpuProbe(chapters.currentScene.geometry, chapters.guide.sampleIndices()),
        resolve,
      };
    });

  q<HTMLButtonElement>("run").addEventListener("click", () => void run());
  q<HTMLButtonElement>("copy").addEventListener("click", () => {
    void navigator.clipboard?.writeText(JSON.stringify(window.__lab?.last, null, 2));
  });
  window.__lab = { run };
}
