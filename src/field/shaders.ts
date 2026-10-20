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
