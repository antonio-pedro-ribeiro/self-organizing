/** Network segment as an instanced quad, width scaled by coupling strength. Field space, 0..uFieldSize. */
export const SEGMENT_VERT = `#version 300 es
layout(location = 0) in vec4 aEnds;
layout(location = 1) in float aStrength;
uniform float uFieldSize;
uniform float uHalfWidth;
out float vStrength;
out float vSide;

void main() {
  float t = float(gl_VertexID & 1);
  float side = float((gl_VertexID >> 1) & 1) * 2.0 - 1.0;
  vec2 a = aEnds.xy;
  vec2 b = aEnds.zw;
  vec2 dir = normalize(b - a + vec2(1e-6, 0.0));
  vec2 normal = vec2(-dir.y, dir.x);
  vec2 p = mix(a, b, t) + normal * side * uHalfWidth * (0.3 + 0.7 * aStrength);
  vStrength = aStrength;
  vSide = side;
  gl_Position = vec4(p / uFieldSize * 2.0 - 1.0, 0.0, 1.0);
}
`;

export const SEGMENT_FRAG = `#version 300 es
precision highp float;
in float vStrength;
in float vSide;
out vec4 outColor;

void main() {
  float a = (1.0 - smoothstep(0.4, 1.0, abs(vSide))) * (0.25 + 0.75 * vStrength);
  outColor = vec4(vec3(0.6, 0.9, 1.0) * a, a);
}
`;

/** Points in field space with per-point alpha (flow particles). */
export const POINT_VERT = `#version 300 es
layout(location = 0) in vec3 aPoint;
uniform float uFieldSize;
uniform float uPointSize;
out float vAlpha;

void main() {
  vAlpha = aPoint.z;
  gl_PointSize = uPointSize;
  gl_Position = vec4(aPoint.xy / uFieldSize * 2.0 - 1.0, 0.0, 1.0);
}
`;

export const POINT_FRAG = `#version 300 es
precision highp float;
in float vAlpha;
out vec4 outColor;

void main() {
  float d = length(gl_PointCoord - 0.5) * 2.0;
  float a = vAlpha * (1.0 - smoothstep(0.4, 1.0, d));
  outColor = vec4(vec3(0.6, 0.8, 1.0) * a, a);
}
`;

/** Brush ripple: an expanding ring. Per instance: centre, radius, alpha. */
export const RIPPLE_VERT = `#version 300 es
layout(location = 0) in vec4 aRipple;
uniform float uFieldSize;
out vec2 vLocal;
out float vAlpha;

void main() {
  vec2 corner = vec2(float(gl_VertexID & 1), float((gl_VertexID >> 1) & 1)) * 2.0 - 1.0;
  vLocal = corner;
  vAlpha = aRipple.w;
  vec2 p = aRipple.xy + corner * aRipple.z;
  gl_Position = vec4(p / uFieldSize * 2.0 - 1.0, 0.0, 1.0);
}
`;

export const RIPPLE_FRAG = `#version 300 es
precision highp float;
in vec2 vLocal;
in float vAlpha;
out vec4 outColor;

void main() {
  float d = length(vLocal);
  float ring = smoothstep(0.86, 0.95, d) * (1.0 - smoothstep(0.95, 1.0, d));
  float a = ring * vAlpha;
  outColor = vec4(vec3(1.0, 0.95, 0.85) * a, a);
}
`;
