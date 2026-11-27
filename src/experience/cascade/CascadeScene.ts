/**
 * Live Unbraiding Cascade (three.js). Loaded only on tier A/B, after the anchor still is painted.
 */
import {
  BufferAttribute,
  BufferGeometry,
  ColorManagement,
  GLSL3,
  LinearSRGBColorSpace,
  Mesh,
  PerspectiveCamera,
  RawShaderMaterial,
  Scene,
  Vector2,
  Vector3,
  Vector4,
  WebGLRenderer,
} from "three";
import type { CascadeGeometryData, Orientation } from "./geometry";
import { cascadeFragment, cascadeVertex } from "./shaders";
import { FRAMING, cameraAt, coverFov, type CameraKey } from "../framing";

export const SCENE_BG: [number, number, number] = [10 / 255, 9 / 255, 8 / 255]; // = --color-ink #0a0908

export interface CascadeSceneOptions {
  canvas: HTMLCanvasElement;
  orientation: Orientation;
  geometry: CascadeGeometryData;
  maxDpr: number;
  antialias: boolean;
  /** Keep the drawing buffer (needed to read pixels for anchor rendering / tests). */
  preserveDrawingBuffer?: boolean;
}

export interface SceneStats {
  fibres: number;
  vertices: number;
  triangles: number;
  drawCalls: number;
  dpr: number;
  width: number;
  height: number;
  gpu: string;
}

/** Everything the shader received for the frame just rendered (for the Chapter 3 guide strand). */
export interface FrameState {
  time: number;
  wind: number;
  pointer: [number, number];
  pointerForce: number;
  /** Damped scroll position (vh in timeline mode, 0..1 progress otherwise). */
  scroll: number;
  /** Column-major 4x4 matrices of the camera used for this frame. */
  projection: Float32Array;
  view: Float32Array;
  camRight: [number, number, number];
  camUp: [number, number, number];
  aspect: number;
  /** CSS size of the canvas. */
  cssWidth: number;
  cssHeight: number;
}

const damp = (current: number, target: number, lambda: number, dt: number) =>
  current + (target - current) * (1 - Math.exp(-lambda * dt));

export class CascadeScene {
  readonly renderer: WebGLRenderer;
  readonly camera: PerspectiveCamera;
  private readonly scene = new Scene();
  private readonly material: RawShaderMaterial;
  private readonly mesh: Mesh;
  private readonly geometryData: CascadeGeometryData;
  private orientation: Orientation;
  private maxDpr: number;

  private raf = 0;
  private last = 0;
  private running = false;
  private time = 0;
  private windTarget = 0;
  private wind = 0;
  private scrollTarget = 0;
  private scroll = 0;
  private pointer = new Vector2(0, 0);
  private pointerTargetForce = 0;
  private pointerForce = 0;
  private lastPointerMove = -1e9;
  private onFrame?: (dtMs: number) => void;
  // M2 (isolated, outside the locked look): timeline camera and deterministic review controls.
  private timeline?: (vh: number) => CameraKey;
  private pearlCurve?: (vh: number) => number;
  private timeFrozen = false;
  private cssWidth = 1;
  private cssHeight = 1;

  constructor(opts: CascadeSceneOptions) {
    ColorManagement.enabled = false; // shader writes display sRGB; clear colour must match CSS exactly
    this.orientation = opts.orientation;
    this.maxDpr = opts.maxDpr;
    this.geometryData = opts.geometry;

    this.renderer = new WebGLRenderer({
      canvas: opts.canvas,
      antialias: opts.antialias,
      alpha: false,
      powerPreference: "high-performance",
      preserveDrawingBuffer: !!opts.preserveDrawingBuffer,
    });
    this.renderer.outputColorSpace = LinearSRGBColorSpace;
    this.renderer.setClearColor(
      (Math.round(SCENE_BG[0] * 255) << 16) |
        (Math.round(SCENE_BG[1] * 255) << 8) |
        Math.round(SCENE_BG[2] * 255),
      1,
    );

    const g = new BufferGeometry();
    g.setAttribute("position", new BufferAttribute(opts.geometry.positions, 3));
    g.setAttribute("aTangent", new BufferAttribute(opts.geometry.tangents, 4, true));
    g.setAttribute("aParams", new BufferAttribute(opts.geometry.params, 4, true));
    g.setIndex(new BufferAttribute(opts.geometry.indices, 1));
    // Bounds are known from the generator; avoids a full scan on the main thread.
    g.boundingSphere = null;

    this.material = new RawShaderMaterial({
      glslVersion: GLSL3,
      vertexShader: cascadeVertex,
      fragmentShader: cascadeFragment,
      transparent: true,
      depthWrite: false,
      depthTest: false,
      uniforms: {
        uTime: { value: 0 },
        uWind: { value: 0 },
        uPointer: { value: this.pointer },
        uPointerForce: { value: 0 },
        uAspect: { value: 1 },
        uViewportH: { value: 1 },
        uFovTan: { value: 1 },
        uFibreWidth: { value: 0.0052 },
        uCamRight: { value: new Vector3(1, 0, 0) },
        uCamUp: { value: new Vector3(0, 1, 0) },
        uKeyDir: { value: new Vector3(...FRAMING[opts.orientation].keyDir).normalize() },
        uKeyPool: { value: new Vector4(...FRAMING[opts.orientation].keyPool) },
        uKeyColor: { value: new Vector3(1.0, 0.85, 0.64).multiplyScalar(2.6) },
        uFillDir: { value: new Vector3(-0.62, 0.18, 0.76) },
        uFillColor: { value: new Vector3(0.3, 0.31, 0.34) },
        uBg: { value: new Vector3(...SCENE_BG) },
        uFogNear: { value: 5.6 },
        uFogFar: { value: 10.5 },
        uPearl: { value: 0 },
        uExposure: { value: 1.0 },
      },
    });
    this.mesh = new Mesh(g, this.material);
    this.mesh.frustumCulled = false;
    this.scene.add(this.mesh);

    this.camera = new PerspectiveCamera(FRAMING[this.orientation].fov, 1, 0.1, 40);
    this.applyCamera(0);
  }

  /** Match the anchor still's `object-fit: cover` framing exactly at any viewport aspect. */
  setSize(width: number, height: number, dpr = window.devicePixelRatio || 1) {
    const ratio = Math.min(dpr, this.maxDpr);
    this.cssWidth = width;
    this.cssHeight = height;
    this.renderer.setPixelRatio(ratio);
    this.renderer.setSize(width, height, false);
    const preset = FRAMING[this.orientation];
    this.camera.aspect = width / height;
    this.camera.fov = coverFov(this.camera.aspect, preset.refAspect, preset.fov);
    this.camera.updateProjectionMatrix();
    const u = this.material.uniforms;
    u.uAspect!.value = this.camera.aspect;
    u.uViewportH!.value = height * ratio;
    u.uFovTan!.value = Math.tan((this.camera.fov * Math.PI) / 360);
  }

  private applyCamera(progress: number) {
    const key = this.timeline
      ? this.timeline(progress)
      : cameraAt(FRAMING[this.orientation].keys, progress);
    this.camera.position.set(...key.position);
    if (key.up) this.camera.up.set(...key.up);
    else this.camera.up.set(0, 1, 0);
    this.camera.lookAt(new Vector3(...key.target));
    this.camera.updateMatrixWorld();
    const e = this.camera.matrixWorld.elements;
    (this.material.uniforms.uCamRight!.value as Vector3).set(e[0]!, e[1]!, e[2]!);
    (this.material.uniforms.uCamUp!.value as Vector3).set(e[4]!, e[5]!, e[6]!);
    // FUTURA chapter (between keys 2 and 3) cools the light towards pearl. In the M2 chapter
    // timeline the pearl shift belongs to Chapter 4, so Chapters 1–3 keep the default light.
    // M3: the timeline may supply its own pearl curve (0 throughout Chapters 1–3); the locked
    // uniform itself and its range are unchanged.
    const pearl = this.timeline
      ? (this.pearlCurve?.(progress) ?? 0)
      : smooth(0.42, 0.55, progress) * (1 - smooth(0.82, 0.95, progress));
    this.material.uniforms.uPearl!.value = pearl;
  }

  setScrollProgress(p: number) {
    this.scrollTarget = Math.min(1, Math.max(0, p));
  }

  /** M2: drive the camera from the chapter timeline (scroll position in vh). */
  setCameraTimeline(fn: (vh: number) => CameraKey, pearl?: (vh: number) => number) {
    this.timeline = fn;
    this.pearlCurve = pearl;
    this.scroll = 0;
    this.scrollTarget = 0;
  }

  /** M2: scroll position in vh (timeline mode). `immediate` skips damping (tests, the lab). */
  setScrollVh(vh: number, immediate = false) {
    this.scrollTarget = Math.max(0, vh);
    if (immediate) this.scroll = this.scrollTarget;
  }

  /** Review/test aid: full wind, time held at `t` seconds (deterministic frames). */
  freezeWindAt(t: number) {
    this.timeFrozen = true;
    this.wind = 1;
    this.windTarget = 1;
    this.time = t;
  }

  /** The exact inputs of the frame just rendered. */
  frameState(): FrameState {
    const u = this.material.uniforms;
    const r = u.uCamRight!.value as Vector3;
    const up = u.uCamUp!.value as Vector3;
    return {
      time: u.uTime!.value as number,
      wind: u.uWind!.value as number,
      pointer: [this.pointer.x, this.pointer.y],
      pointerForce: u.uPointerForce!.value as number,
      scroll: this.scroll,
      projection: Float32Array.from(this.camera.projectionMatrix.elements),
      view: Float32Array.from(this.camera.matrixWorldInverse.elements),
      camRight: [r.x, r.y, r.z],
      camUp: [up.x, up.y, up.z],
      aspect: this.camera.aspect,
      cssWidth: this.cssWidth,
      cssHeight: this.cssHeight,
    };
  }

  /** FrameState for another scroll position without rendering (camera only, wind as now). */
  frameStateAt(vh: number): FrameState {
    const saved = this.scroll;
    this.applyCamera(vh);
    const fs = this.frameState();
    fs.scroll = vh;
    this.applyCamera(saved);
    return fs;
  }

  /** Current damped scroll value (vh in timeline mode). */
  get scrollValue() {
    return this.scroll;
  }

  get isRunning() {
    return this.running;
  }

  /** Geometry the scene renders (read-only use by the guide strand). */
  get geometry(): CascadeGeometryData {
    return this.geometryData;
  }

  /** The live material's uniform values (read-only use by the lab probe). */
  get liveUniforms() {
    return this.material.uniforms;
  }

  /** Read the frame just rendered (call in the same task as the render). */
  readPixels(): { data: Uint8Array; width: number; height: number } {
    const gl = this.renderer.getContext();
    const width = gl.drawingBufferWidth;
    const height = gl.drawingBufferHeight;
    const data = new Uint8Array(width * height * 4);
    gl.readPixels(0, 0, width, height, gl.RGBA, gl.UNSIGNED_BYTE, data);
    return { data, width, height };
  }

  /** Pointer in NDC (-1..1). */
  setPointer(xNdc: number, yNdc: number) {
    this.pointer.set(xNdc, yNdc);
    this.lastPointerMove = performance.now();
  }

  /** Begin the gentle motion that grows out of the frozen anchor pose. */
  startMotion() {
    this.windTarget = 1;
  }

  /** Compile shaders off the critical path (parallel compile where the driver supports it). */
  async prepare() {
    this.applyCamera(this.scroll);
    await this.renderer.compileAsync(this.scene, this.camera);
  }

  /** Render exactly one frame in the given state (anchor rendering, first handoff frame). */
  renderStill() {
    this.material.uniforms.uTime!.value = this.time;
    this.material.uniforms.uWind!.value = this.wind;
    this.material.uniforms.uPointerForce!.value = this.pointerForce;
    this.applyCamera(this.scroll);
    this.renderer.render(this.scene, this.camera);
  }

  start(onFrame?: (dtMs: number) => void) {
    this.onFrame = onFrame;
    if (this.running) return;
    this.running = true;
    this.last = performance.now();
    const tick = (now: number) => {
      if (!this.running) return;
      const dtMs = Math.min(100, now - this.last);
      this.last = now;
      this.step(dtMs / 1000, now);
      this.onFrame?.(dtMs);
      this.raf = requestAnimationFrame(tick);
    };
    this.raf = requestAnimationFrame(tick);
  }

  stop() {
    this.running = false;
    cancelAnimationFrame(this.raf);
  }

  private step(dt: number, now: number) {
    if (!this.timeFrozen) {
      this.wind = damp(this.wind, this.windTarget, 1.4, dt);
      this.time += dt * this.wind;
    }
    // Pointer force rises while the pointer moves and eases back so strands spring home.
    this.pointerTargetForce = now - this.lastPointerMove < 140 ? 1 : 0;
    this.pointerForce = damp(
      this.pointerForce,
      this.pointerTargetForce,
      this.pointerTargetForce ? 7 : 2.6,
      dt,
    );
    this.scroll = damp(this.scroll, this.scrollTarget, 5.5, dt);
    this.renderStill();
  }

  stats(): SceneStats {
    const gl = this.renderer.getContext();
    const ext = gl.getExtension("WEBGL_debug_renderer_info");
    return {
      fibres: this.geometryData.fibreCount,
      vertices: this.geometryData.vertexCount,
      triangles: this.geometryData.triangleCount,
      drawCalls: this.renderer.info.render.calls,
      dpr: this.renderer.getPixelRatio(),
      width: this.renderer.domElement.width,
      height: this.renderer.domElement.height,
      gpu: ext
        ? String(gl.getParameter(ext.UNMASKED_RENDERER_WEBGL))
        : String(gl.getParameter(gl.RENDERER)),
    };
  }

  dispose() {
    this.stop();
    this.mesh.geometry.dispose();
    this.material.dispose();
    this.renderer.dispose();
  }
}

function smooth(e0: number, e1: number, x: number) {
  const t = Math.min(1, Math.max(0, (x - e0) / (e1 - e0)));
  return t * t * (3 - 2 * t);
}
