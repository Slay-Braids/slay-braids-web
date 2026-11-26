/**
 * GPU accuracy probe for the Chapter 3 guide strand (transition lab only).
 *
 * It does NOT re-implement the displacement. It takes the locked vertex shader source at runtime
 * and keeps, verbatim:
 *   - every declaration before `void main() {`
 *   - the body from `void main() {` up to `// Camera-facing ribbon expansion`
 *     (wind sway, flutter and pointer push: everything that moves a fibre centre line)
 * and appends only an output stage: project the displaced point with the same matrices and write
 * its NDC position into one texel of a float render target (one GL point per guide sample).
 *
 * The probe reads the uniform values the scene actually sent to the GPU for the frame just
 * rendered, and the same geometry buffers. Comparing its output with the CPU guide strand
 * (guideStrand.ts) measures the real error of the page edge, in CSS pixels.
 */
import { cascadeVertex } from "../cascade/shaders";
import type { CascadeGeometryData } from "../cascade/geometry";

const MAIN = "void main() {";
const STOP = "// Camera-facing ribbon expansion";

/** The locked shader split into its declarations and displacement body (throws if not found). */
export function extractLockedDisplacement(src = cascadeVertex) {
  const a = src.indexOf(MAIN);
  const b = src.indexOf(STOP);
  if (a < 0 || b < 0 || b < a) throw new Error("probe: locked shader markers not found");
  return { declarations: src.slice(0, a), body: src.slice(a + MAIN.length, b) };
}

function probeVertexSource() {
  const { declarations, body } = extractLockedDisplacement();
  return `#version 300 es
${declarations}
in float aIndex;
uniform vec2 uProbeSize;
out vec4 vProbe;
void main() {
${body}
  // ---- probe output stage (not part of the locked shader) ----
  vec4 probeClip = projectionMatrix * modelViewMatrix * vec4(p, 1.0);
  vProbe = vec4(probeClip.xy / probeClip.w, probeClip.w, 1.0);
  float px = mod(aIndex, uProbeSize.x);
  float py = floor(aIndex / uProbeSize.x);
  gl_Position = vec4((px + 0.5) / uProbeSize.x * 2.0 - 1.0, (py + 0.5) / uProbeSize.y * 2.0 - 1.0, 0.0, 1.0);
  gl_PointSize = 1.0;
}`;
}

const FRAG = `#version 300 es
precision highp float;
in vec4 vProbe;
out vec4 outColor;
void main() { outColor = vProbe; }`;

export interface ProbeUniforms {
  projection: ArrayLike<number>;
  view: ArrayLike<number>;
  time: number;
  wind: number;
  pointer: [number, number];
  pointerForce: number;
  aspect: number;
  camRight: [number, number, number];
  camUp: [number, number, number];
}

export class GpuProbe {
  private gl: WebGL2RenderingContext;
  private prog: WebGLProgram;
  private vao: WebGLVertexArrayObject;
  private fbo: WebGLFramebuffer;
  private size: [number, number];
  private count: number;
  private loc: Record<string, WebGLUniformLocation | null> = {};
  readonly renderer: string;

  constructor(g: CascadeGeometryData, samples: number[]) {
    const canvas = document.createElement("canvas");
    canvas.width = canvas.height = 1;
    const gl = canvas.getContext("webgl2", { antialias: false });
    if (!gl) throw new Error("probe: WebGL2 unavailable");
    if (!gl.getExtension("EXT_color_buffer_float")) throw new Error("probe: float render targets unavailable");
    this.gl = gl;
    const dbg = gl.getExtension("WEBGL_debug_renderer_info");
    this.renderer = String(gl.getParameter(dbg ? dbg.UNMASKED_RENDERER_WEBGL : gl.RENDERER));

    const sh = (type: number, src: string) => {
      const s = gl.createShader(type)!;
      gl.shaderSource(s, src);
      gl.compileShader(s);
      if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) throw new Error(`probe shader: ${gl.getShaderInfoLog(s)}`);
      return s;
    };
    const prog = gl.createProgram()!;
    gl.attachShader(prog, sh(gl.VERTEX_SHADER, probeVertexSource()));
    gl.attachShader(prog, sh(gl.FRAGMENT_SHADER, FRAG));
    gl.linkProgram(prog);
    if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) throw new Error(`probe link: ${gl.getProgramInfoLog(prog)}`);
    this.prog = prog;
    for (const n of ["projectionMatrix", "modelViewMatrix", "uTime", "uWind", "uPointer", "uPointerForce", "uAspect", "uCamRight", "uCamUp", "uProbeSize", "uViewportH", "uFovTan", "uFibreWidth"]) {
      this.loc[n] = gl.getUniformLocation(prog, n);
    }

    // One vertex per guide sample: the sample's first ribbon vertex (both share the centre line).
    this.count = samples.length;
    const pos = new Float32Array(this.count * 3);
    const tan = new Int8Array(this.count * 4);
    const par = new Uint8Array(this.count * 4);
    const idx = new Float32Array(this.count);
    samples.forEach((s, i) => {
      const v = s * 2;
      pos.set(g.positions.subarray(v * 3, v * 3 + 3), i * 3);
      tan.set(g.tangents.subarray(v * 4, v * 4 + 4), i * 4);
      par.set(g.params.subarray(v * 4, v * 4 + 4), i * 4);
      idx[i] = i;
    });
    this.vao = gl.createVertexArray()!;
    gl.bindVertexArray(this.vao);
    const attr = (name: string, data: ArrayBufferView, size: number, type: number, norm: boolean) => {
      const l = gl.getAttribLocation(prog, name);
      if (l < 0) return; // optimised away (e.g. unused tangent)
      const b = gl.createBuffer();
      gl.bindBuffer(gl.ARRAY_BUFFER, b);
      gl.bufferData(gl.ARRAY_BUFFER, data, gl.STATIC_DRAW);
      gl.enableVertexAttribArray(l);
      gl.vertexAttribPointer(l, size, type, norm, 0, 0);
    };
    attr("position", pos, 3, gl.FLOAT, false);
    attr("aTangent", tan, 4, gl.BYTE, true); // int8 normalised, as in the scene
    attr("aParams", par, 4, gl.UNSIGNED_BYTE, true); // same normalised bytes as the scene
    attr("aIndex", idx, 1, gl.FLOAT, false);

    const w = Math.min(1024, this.count);
    const h = Math.ceil(this.count / w);
    this.size = [w, h];
    const tex = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, tex);
    gl.texStorage2D(gl.TEXTURE_2D, 1, gl.RGBA32F, w, h);
    this.fbo = gl.createFramebuffer()!;
    gl.bindFramebuffer(gl.FRAMEBUFFER, this.fbo);
    gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, tex, 0);
  }

  /** GPU-displaced, projected guide points in CSS px (x, y interleaved). */
  run(u: ProbeUniforms, cssWidth: number, cssHeight: number): Float64Array {
    const gl = this.gl;
    const [w, h] = this.size;
    gl.useProgram(this.prog);
    gl.bindVertexArray(this.vao);
    gl.bindFramebuffer(gl.FRAMEBUFFER, this.fbo);
    gl.viewport(0, 0, w, h);
    gl.clearColor(0, 0, 0, 0);
    gl.clear(gl.COLOR_BUFFER_BIT);
    const L = this.loc;
    gl.uniformMatrix4fv(L.projectionMatrix!, false, Float32Array.from(u.projection));
    gl.uniformMatrix4fv(L.modelViewMatrix!, false, Float32Array.from(u.view)); // model = identity
    gl.uniform1f(L.uTime!, u.time);
    gl.uniform1f(L.uWind!, u.wind);
    gl.uniform2f(L.uPointer!, u.pointer[0], u.pointer[1]);
    gl.uniform1f(L.uPointerForce!, u.pointerForce);
    gl.uniform1f(L.uAspect!, u.aspect);
    gl.uniform3f(L.uCamRight!, ...u.camRight);
    gl.uniform3f(L.uCamUp!, ...u.camUp);
    gl.uniform2f(L.uProbeSize!, w, h);
    gl.drawArrays(gl.POINTS, 0, this.count);
    const out = new Float32Array(w * h * 4);
    gl.readPixels(0, 0, w, h, gl.RGBA, gl.FLOAT, out);
    const xy = new Float64Array(this.count * 2);
    for (let i = 0; i < this.count; i++) {
      xy[i * 2] = (out[i * 4]! * 0.5 + 0.5) * cssWidth;
      xy[i * 2 + 1] = (1 - (out[i * 4 + 1]! * 0.5 + 0.5)) * cssHeight;
    }
    return xy;
  }

  dispose() {
    this.gl.getExtension("WEBGL_lose_context")?.loseContext();
  }
}

export function percentiles(v: number[]) {
  if (!v.length) return { n: 0, p50: NaN, p95: NaN, p99: NaN, max: NaN };
  const s = [...v].sort((a, b) => a - b);
  const q = (p: number) => s[Math.min(s.length - 1, Math.floor(p * (s.length - 1)))]!;
  return { n: s.length, p50: q(0.5), p95: q(0.95), p99: q(0.99), max: s.at(-1)! };
}
