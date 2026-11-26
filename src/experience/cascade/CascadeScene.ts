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
import { FRAMING, cameraAt, coverFov } from "../framing";

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
    const key = cameraAt(FRAMING[this.orientation].keys, progress);
    this.camera.position.set(...key.position);
    this.camera.lookAt(new Vector3(...key.target));
    this.camera.updateMatrixWorld();
    const e = this.camera.matrixWorld.elements;
    (this.material.uniforms.uCamRight!.value as Vector3).set(e[0]!, e[1]!, e[2]!);
    (this.material.uniforms.uCamUp!.value as Vector3).set(e[4]!, e[5]!, e[6]!);
    // FUTURA chapter (between keys 2 and 3) cools the light towards pearl.
    const pearl = smooth(0.42, 0.55, progress) * (1 - smooth(0.82, 0.95, progress));
    this.material.uniforms.uPearl!.value = pearl;
  }

  setScrollProgress(p: number) {
    this.scrollTarget = Math.min(1, Math.max(0, p));
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
    this.wind = damp(this.wind, this.windTarget, 1.4, dt);
    this.time += dt * this.wind;
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
