import { LAPLACIAN } from './presets';

const glslFloat = (x: number): string => x.toPrecision(9);

/** Gray-Scott step: 9-point Laplacian on a torus, explicit Euler. u in R, v in G. */
export const STEP_FRAG = `#version 300 es
precision highp float;
uniform sampler2D uState;
uniform ivec2 uSize;
uniform float uF;
uniform float uK;
uniform float uDu;
uniform float uDv;
uniform float uDt;
out vec4 outState;

vec2 at(ivec2 p) {
  return texelFetch(uState, (p + uSize) % uSize, 0).rg;
}

void main() {
  ivec2 p = ivec2(gl_FragCoord.xy);
  vec2 c = at(p);
  vec2 lap = ${glslFloat(LAPLACIAN.centre)} * c
    + ${glslFloat(LAPLACIAN.edge)} * (at(p + ivec2(1, 0)) + at(p + ivec2(-1, 0)) + at(p + ivec2(0, 1)) + at(p + ivec2(0, -1)))
    + ${glslFloat(LAPLACIAN.corner)} * (at(p + ivec2(1, 1)) + at(p + ivec2(-1, 1)) + at(p + ivec2(1, -1)) + at(p + ivec2(-1, -1)));
  float uvv = c.x * c.y * c.y;
  float du = uDu * lap.x - uvv + uF * (1.0 - c.x);
  float dv = uDv * lap.y + uvv - (uF + uK) * c.y;
  outState = vec4(clamp(c.x + uDt * du, 0.0, 1.0), clamp(c.y + uDt * dv, 0.0, 1.0), 0.0, 1.0);
}
`;

/** Field display: Catmull-Rom bicubic upsampling, colormap on v, brightness from u. */
export const DISPLAY_FRAG = `#version 300 es
precision highp float;
uniform sampler2D uState;
uniform sampler2D uLut;
uniform ivec2 uSize;
uniform float uVMax;
in vec2 vUv;
out vec4 outColor;

vec2 at(ivec2 p) {
  return texelFetch(uState, ((p % uSize) + uSize) % uSize, 0).rg;
}

vec4 weights(float t) {
  float t2 = t * t;
  float t3 = t2 * t;
  return vec4(
    -0.5 * t3 + t2 - 0.5 * t,
    1.5 * t3 - 2.5 * t2 + 1.0,
    -1.5 * t3 + 2.0 * t2 + 0.5 * t,
    0.5 * t3 - 0.5 * t2
  );
}

vec2 bicubic(vec2 uv) {
  vec2 x = uv * vec2(uSize) - 0.5;
  vec2 fl = floor(x);
  ivec2 i = ivec2(fl);
  vec2 f = x - fl;
  vec4 wx = weights(f.x);
  vec4 wy = weights(f.y);
  vec2 acc = vec2(0.0);
  for (int j = -1; j <= 2; j++) {
    vec2 row = vec2(0.0);
    for (int k = -1; k <= 2; k++) {
      row += wx[k + 1] * at(i + ivec2(k, j));
    }
    acc += wy[j + 1] * row;
  }
  return acc;
}

void main() {
  vec2 s = bicubic(vUv);
  float t = clamp(s.y / uVMax, 0.0, 1.0);
  vec3 col = texture(uLut, vec2(t * (255.0 / 256.0) + 0.5 / 256.0, 0.5)).rgb;
  float u = clamp(s.x, 0.0, 1.0);
  col *= 0.6 + 0.4 * u;
  col += vec3(0.03, 0.04, 0.09) * smoothstep(0.0, 1.0, 1.0 - u);
  outColor = vec4(col, 1.0);
}
`;

/** Block means for readback, one output texel per uBlock² field texels: R mean u, G mean v, B mean u·v². */
export const DOWNSAMPLE_FRAG = `#version 300 es
precision highp float;
uniform sampler2D uState;
uniform int uBlock;
out vec4 outMean;

void main() {
  ivec2 origin = ivec2(gl_FragCoord.xy) * uBlock;
  vec3 sum = vec3(0.0);
  for (int y = 0; y < uBlock; y++) {
    for (int x = 0; x < uBlock; x++) {
      vec2 c = texelFetch(uState, origin + ivec2(x, y), 0).rg;
      sum += vec3(c, c.x * c.y * c.y);
    }
  }
  outMean = vec4(sum / float(uBlock * uBlock), 1.0);
}
`;

/**
 * Agent write-back: the per-block update is interpolated bilinearly between
 * block centres (so bursts have no square edges), then u is scaled by R and
 * G is added to v. Linear interpolation keeps the total v added exact.
 */
export const APPLY_FRAG = `#version 300 es
precision highp float;
uniform sampler2D uState;
uniform sampler2D uUpdate;
uniform int uBlock;
uniform int uGrid;
out vec4 outState;

vec2 upd(ivec2 b) {
  return texelFetch(uUpdate, (b + uGrid) % uGrid, 0).rg;
}

void main() {
  ivec2 p = ivec2(gl_FragCoord.xy);
  vec2 c = texelFetch(uState, p, 0).rg;
  vec2 f = (vec2(p) + 0.5) / float(uBlock) - 0.5;
  vec2 fl = floor(f);
  ivec2 b = ivec2(fl);
  vec2 t = f - fl;
  vec2 d = mix(
    mix(upd(b), upd(b + ivec2(1, 0)), t.x),
    mix(upd(b + ivec2(0, 1)), upd(b + ivec2(1, 1)), t.x),
    t.y
  );
  outState = vec4(clamp(c.x * d.x, 0.0, 1.0), clamp(c.y + d.y, 0.0, 1.0), 0.0, 1.0);
}
`;

/** Damage: reset a disc (torus distance) to the homogeneous state u = 1, v = 0. */
export const WIPE_FRAG = `#version 300 es
precision highp float;
uniform sampler2D uState;
uniform vec2 uCenter;
uniform float uRadius;
uniform float uSize;
out vec4 outState;

void main() {
  vec2 c = texelFetch(uState, ivec2(gl_FragCoord.xy), 0).rg;
  vec2 d = abs(gl_FragCoord.xy - uCenter);
  d = min(d, uSize - d);
  outState = length(d) < uRadius ? vec4(1.0, 0.0, 0.0, 1.0) : vec4(c, 0.0, 1.0);
}
`;

/** Brush: mode 0 adds noise to v, mode 1 adds nutrient u; soft falloff inside the disc (torus distance). */
export const BRUSH_FRAG = `#version 300 es
precision highp float;
uniform sampler2D uState;
uniform vec2 uCenter;
uniform float uRadius;
uniform float uSize;
uniform int uMode;
uniform float uSeed;
out vec4 outState;

float hash(vec2 p) {
  return fract(sin(dot(p + uSeed, vec2(12.9898, 78.233))) * 43758.5453);
}

void main() {
  vec2 c = texelFetch(uState, ivec2(gl_FragCoord.xy), 0).rg;
  vec2 d = abs(gl_FragCoord.xy - uCenter);
  d = min(d, uSize - d);
  float r = length(d) / uRadius;
  float w = r < 1.0 ? 1.0 - r * r : 0.0;
  if (uMode == 0) c.y = clamp(c.y + 0.3 * w * hash(gl_FragCoord.xy), 0.0, 1.0);
  else c.x = clamp(c.x + 0.5 * w * (1.0 - c.x), 0.0, 1.0);
  outState = vec4(c, 0.0, 1.0);
}
`;

/** Up to 8 square patches (centre, half side) set to u = 0.5, v = 0.25, wrapping on the torus. */
export const PATCH_FRAG = `#version 300 es
precision highp float;
uniform sampler2D uState;
uniform vec3 uPatches[8];
uniform int uCount;
uniform float uSize;
out vec4 outState;

void main() {
  vec2 c = texelFetch(uState, ivec2(gl_FragCoord.xy), 0).rg;
  vec2 p = floor(gl_FragCoord.xy);
  for (int i = 0; i < 8; i++) {
    if (i >= uCount) break;
    vec2 d = abs(p - uPatches[i].xy);
    d = min(d, uSize - d);
    if (d.x <= uPatches[i].z && d.y <= uPatches[i].z) c = vec2(0.5, 0.25);
  }
  outState = vec4(c, 0.0, 1.0);
}
`;
