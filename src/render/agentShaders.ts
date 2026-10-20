/**
 * Instanced protocell quad. Per instance: position (field cells), energy and
 * membrane, genome. The quad is drawn in field space, 0..uFieldSize.
 */
export const AGENT_VERT = `#version 300 es
layout(location = 0) in vec2 aPos;
layout(location = 1) in vec2 aState;
layout(location = 2) in vec3 aGenome;
uniform float uFieldSize;
uniform float uRadius;
out vec2 vLocal;
out vec2 vState;
out vec3 vGenome;

void main() {
  vec2 corner = vec2(float(gl_VertexID & 1), float((gl_VertexID >> 1) & 1)) * 2.0 - 1.0;
  vLocal = corner;
  vState = aState;
  vGenome = aGenome;
  vec2 p = (aPos + corner * uRadius) / uFieldSize;
  gl_Position = vec4(p * 2.0 - 1.0, 0.0, 1.0);
}
`;

/**
 * Hue is the hue of the genome read as an RGB colour, so related lineages
 * share a colour and drift shows as a hue shift. Mode 0 draws a disc (ring
 * opacity = M, core brightness = E); mode 1 draws a soft dot for trails.
 */
export const AGENT_FRAG = `#version 300 es
precision highp float;
uniform int uMode;
in vec2 vLocal;
in vec2 vState;
in vec3 vGenome;
out vec4 outColor;

vec3 hueColor(vec3 g) {
  float mx = max(g.r, max(g.g, g.b));
  float mn = min(g.r, min(g.g, g.b));
  float d = mx - mn;
  float h = 0.0;
  if (d > 1e-5) {
    if (mx == g.r) h = mod((g.g - g.b) / d, 6.0);
    else if (mx == g.g) h = (g.b - g.r) / d + 2.0;
    else h = (g.r - g.g) / d + 4.0;
  }
  vec3 k = mod(vec3(5.0, 3.0, 1.0) + h, 6.0);
  vec3 rgb = 1.0 - clamp(min(k, 4.0 - k), 0.0, 1.0);
  return mix(vec3(1.0), rgb, 0.75);
}

void main() {
  float d = length(vLocal);
  if (d > 1.0) discard;
  vec3 hue = hueColor(vGenome);
  if (uMode == 1) {
    float a = (1.0 - d) * 0.35;
    outColor = vec4(hue * a, a);
    return;
  }
  float energy = clamp(vState.x, 0.0, 1.5) / 1.5;
  float membrane = clamp(vState.y, 0.0, 1.0);
  float ring = smoothstep(0.62, 0.78, d) * (1.0 - smoothstep(0.9, 1.0, d));
  float core = 1.0 - smoothstep(0.0, 0.62, d);
  vec3 col = hue * (0.15 + 0.85 * energy) * core + hue * ring * membrane;
  float alpha = max(core * (0.35 + 0.65 * energy), ring * membrane);
  outColor = vec4(col, alpha);
}
`;

/** Trail feedback: previous trail times uDecay. Also used to composite the trail onto the screen. */
export const TRAIL_FRAG = `#version 300 es
precision highp float;
uniform sampler2D uTrail;
uniform float uDecay;
in vec2 vUv;
out vec4 outColor;

void main() {
  outColor = texture(uTrail, vUv) * uDecay;
}
`;
