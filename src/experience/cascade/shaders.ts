/**
 * Hair shading for the Unbraiding Cascade.
 *
 * - Ribbons: each fibre sample pair is expanded into a camera-facing ribbon in the vertex
 *   shader. Ribbons never go below ~1 device pixel; sub-pixel fibres keep their true coverage
 *   through alpha instead (prevents shimmer without fattening the hair).
 * - Shading: Kajiya-Kay style anisotropic model with two shifted highlights (a tight champagne
 *   primary and a broader, warmer secondary with glints), a cool soft fill, weave/bundle
 *   occlusion baked into the geometry, and back-light transmission on loose strands.
 * - Output is display-referred sRGB written directly (no renderer colour management), so the
 *   live canvas and the pre-rendered anchor still are produced by exactly the same maths.
 */

export const cascadeVertex = /* glsl */ `
precision highp float;

in vec3 position;
in vec4 aTangent;   // xyz tangent, w ribbon side (-1 / +1)
in vec4 aParams;    // x t along fibre, y looseness, z fibre seed, w occlusion

uniform mat4 projectionMatrix;
uniform mat4 modelViewMatrix;
uniform float uTime;
uniform float uWind;
uniform vec2  uPointer;
uniform float uPointerForce;
uniform float uAspect;
uniform float uViewportH;
uniform float uFovTan;
uniform float uFibreWidth;
uniform vec3  uCamRight;
uniform vec3  uCamUp;

out vec3  vT;
out vec3  vWorld;
out float vSide;
out vec4  vParams;
out float vCoverage;
out float vViewZ;

void main() {
  float t = aParams.x;
  float loose = aParams.y;
  float seed = aParams.z;
  vec3 p = position;
  vec3 T = normalize(aTangent.xyz);

  // Motion. uWind is exactly 0 in the anchor pose, so the first live frame equals the still.
  float tip = t * t;
  vec3 sway = vec3(
    sin(p.y * 0.9 + p.z * 0.7 + uTime * 0.55),
    0.35 * sin(p.x * 0.8 + uTime * 0.43),
    0.6 * sin(p.x * 0.6 + p.y * 0.5 + uTime * 0.37));
  vec3 flutter = vec3(
    sin(t * 23.0 + uTime * 1.7 + seed * 40.0),
    cos(t * 19.0 + uTime * 1.3 + seed * 31.0),
    0.5 * sin(t * 17.0 + uTime * 1.1 + seed * 17.0));
  p += uWind * (sway * (0.025 + 0.085 * tip) + flutter * 0.02 * loose * (0.3 + tip));

  // Pointer: soft radial parting in screen space; loose strands respond most, braids barely.
  vec4 c0 = projectionMatrix * modelViewMatrix * vec4(p, 1.0);
  vec2 d = (c0.xy / c0.w - uPointer) * vec2(uAspect, 1.0);
  float r2 = dot(d, d);
  float f = uPointerForce * exp(-r2 / 0.05);
  vec2 dir = d * inversesqrt(max(r2, 1e-6));
  float dist = -(modelViewMatrix * vec4(p, 1.0)).z;
  p += (uCamRight * dir.x + uCamUp * dir.y) * f * dist * 0.055 * (0.12 + 0.88 * loose) * (0.35 + 0.65 * t);

  // Camera-facing ribbon expansion with a one-pixel floor.
  vec4 mv = modelViewMatrix * vec4(p, 1.0);
  vec3 Tv = normalize(mat3(modelViewMatrix) * T);
  vec3 viewDir = normalize(-mv.xyz);
  vec3 side = normalize(cross(Tv, viewDir));
  float pxWorld = 2.0 * (-mv.z) * uFovTan / uViewportH;
  float w = uFibreWidth * (1.0 - 0.6 * pow(t, 3.0));
  float wc = max(w, pxWorld * 0.9);
  vCoverage = clamp(w / wc, 0.0, 1.0);
  mv.xyz += side * aTangent.w * wc * 0.5;

  gl_Position = projectionMatrix * mv;
  vT = T;
  vWorld = p;
  vSide = aTangent.w;
  vParams = aParams;
  vViewZ = -mv.z;
}
`;

export const cascadeFragment = /* glsl */ `
precision highp float;

in vec3  vT;
in vec3  vWorld;
in float vSide;
in vec4  vParams;
in float vCoverage;
in float vViewZ;

uniform vec3  cameraPosition;
uniform vec3  uKeyDir;
uniform vec3  uKeyColor;
uniform vec4  uKeyPool;
uniform vec3  uFillDir;
uniform vec3  uFillColor;
uniform vec3  uBg;
uniform float uFogNear;
uniform float uFogFar;
uniform float uPearl;
uniform float uExposure;

out vec4 outColor;

float hash(float n) { return fract(sin(n) * 43758.5453123); }
vec3 acesFit(vec3 x) { return clamp((x * (2.51 * x + 0.03)) / (x * (2.43 * x + 0.59) + 0.14), 0.0, 1.0); }

void main() {
  float t = vParams.x;
  float loose = vParams.y;
  float seed = vParams.z;
  float ao = vParams.w;

  vec3 T = normalize(vT);
  vec3 V = normalize(cameraPosition - vWorld);
  vec3 N = normalize(V - T * dot(T, V));

  // Deep espresso-black fibre with per-fibre variation; FUTURA sections cool it a touch.
  vec3 base = mix(vec3(0.010, 0.008, 0.006), vec3(0.040, 0.027, 0.018), hash(seed * 97.13));
  base = mix(base, base * vec3(0.94, 0.98, 1.07), uPearl);

  // Cuticle tilt: per-fibre highlight shift plus slow variation along the length.
  float shift = (hash(seed * 13.7) - 0.5) * 0.32 + sin(t * 31.0 + seed * 20.0) * 0.05;
  vec3 T1 = normalize(T + N * (shift - 0.09));
  vec3 T2 = normalize(T + N * (shift + 0.14));

  vec3 L = normalize(uKeyDir);
  vec3 H = normalize(L + V);
  float h1 = dot(T1, H);
  float h2 = dot(T2, H);
  float spec1 = pow(max(0.0, sqrt(max(0.0, 1.0 - h1 * h1))), 190.0);
  float spec2 = pow(max(0.0, sqrt(max(0.0, 1.0 - h2 * h2))), 30.0);
  float glint = 0.45 + 0.55 * pow(0.5 + 0.5 * sin(t * 160.0 + seed * 91.0), 3.0);

  float tl = dot(T, L);
  float diffK = sqrt(max(0.0, 1.0 - tl * tl));
  vec3 Lf = normalize(uFillDir);
  float tf = dot(T, Lf);
  float diffF = sqrt(max(0.0, 1.0 - tf * tf));
  float back = pow(max(0.0, dot(-V, L)), 3.0);

  vec3 keyTint = mix(uKeyColor, uKeyColor * vec3(0.93, 0.97, 1.05), uPearl);
  // Softbox pool: highlights live here; outside it the hair falls back to deep black.
  vec3 dp = vWorld - uKeyPool.xyz;
  float pool = exp(-dot(dp.xy, dp.xy) / (uKeyPool.w * uKeyPool.w));
  float sheen = 0.12 + 0.88 * pool;
  vec3 col =
      base * (0.3 + 0.7 * diffF) * uFillColor * ao * 0.8
    + base * diffK * keyTint * 0.16 * ao * (0.4 + 0.6 * pool)
    + keyTint * vec3(1.0, 0.88, 0.68) * spec1 * ao * 0.6 * mix(0.55, 1.0, loose) * sheen
    + keyTint * vec3(1.0, 0.74, 0.46) * spec2 * glint * 0.07 * ao * sheen
    + keyTint * vec3(1.0, 0.8, 0.58) * back * (0.05 + 0.3 * loose) * (0.4 + 0.6 * t) * 0.55;

  col = pow(acesFit(col * uExposure), vec3(1.0 / 2.2));
  col = mix(col, uBg, smoothstep(uFogNear, uFogFar, vViewZ));

  float edge = 1.0 - smoothstep(0.45, 1.0, abs(vSide));
  float tipFade = 1.0 - smoothstep(0.86, 1.0, t);
  float a = vCoverage * edge * tipFade * mix(0.95, 0.8, loose);
  if (a < 0.003) discard;
  outColor = vec4(col, a);
}
`;
