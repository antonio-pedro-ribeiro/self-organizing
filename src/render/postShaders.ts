/** Bloom bright pass: keep what is brighter than uThreshold, with a soft knee. */
export const BRIGHT_FRAG = `#version 300 es
precision highp float;
uniform sampler2D uScene;
uniform float uThreshold;
in vec2 vUv;
out vec4 outColor;

void main() {
  vec3 c = texture(uScene, vUv).rgb;
  float luma = dot(c, vec3(0.2126, 0.7152, 0.0722));
  outColor = vec4(c * smoothstep(uThreshold - 0.15, uThreshold + 0.15, luma), 1.0);
}
`;

/** One direction of a 9-tap Gaussian blur; uDir is one texel in x or y. */
export const BLUR_FRAG = `#version 300 es
precision highp float;
uniform sampler2D uSource;
uniform vec2 uDir;
in vec2 vUv;
out vec4 outColor;

void main() {
  const float w[5] = float[5](0.227027, 0.1945946, 0.1216216, 0.054054, 0.016216);
  vec3 sum = texture(uSource, vUv).rgb * w[0];
  for (int i = 1; i < 5; i++) {
    vec2 o = uDir * float(i) * 1.5;
    sum += (texture(uSource, vUv + o).rgb + texture(uSource, vUv - o).rgb) * w[i];
  }
  outColor = vec4(sum, 1.0);
}
`;

/** Final composite to the canvas: scene plus bloom times strength. */
export const COMPOSITE_FRAG = `#version 300 es
precision highp float;
uniform sampler2D uScene;
uniform sampler2D uBloom;
uniform float uStrength;
in vec2 vUv;
out vec4 outColor;

void main() {
  vec3 c = texture(uScene, vUv).rgb + texture(uBloom, vUv).rgb * uStrength;
  outColor = vec4(min(c, vec3(1.0)), 1.0);
}
`;
