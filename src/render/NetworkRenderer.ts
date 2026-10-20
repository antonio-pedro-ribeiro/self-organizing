import type { Population } from '../agents/Population';
import { SpatialHash } from '../agents/SpatialHash';
import type { Viewport } from './FieldRenderer';
import { createProgram, uniform } from './gl';
import { SEGMENT_FRAG, SEGMENT_VERT } from './overlayShaders';

/**
 * Signal range in field cells: about 1.5 blocks, the scale over which an
 * agent's emitted v reaches others through the block write-back.
 */
export const SIGNAL_RANGE = 12;
const MAX_SEGMENTS = 40_000;
/** Floats per segment: x0, y0, x1, y1, strength. */
const STRIDE = 5;

/**
 * Network overlay (SPEC.md section 5): a line between every pair of agents
 * within signal range, thicker the closer they are (coupling falls off
 * linearly with distance).
 */
export class NetworkRenderer {
  private readonly gl: WebGL2RenderingContext;
  private readonly program: WebGLProgram;
  private readonly vao: WebGLVertexArrayObject;
  private readonly buffer: WebGLBuffer;
  private readonly data = new Float32Array(MAX_SEGMENTS * STRIDE);
  private readonly loc: Record<'fieldSize' | 'halfWidth', WebGLUniformLocation>;
  private readonly hash: SpatialHash;
  private readonly neighbors: Int32Array;
  private count = 0;

  constructor(gl: WebGL2RenderingContext, fieldSize: number, capacity: number) {
    this.gl = gl;
    this.program = createProgram(gl, SEGMENT_VERT, SEGMENT_FRAG);
    this.loc = { fieldSize: uniform(gl, this.program, 'uFieldSize'), halfWidth: uniform(gl, this.program, 'uHalfWidth') };
    this.hash = new SpatialHash(fieldSize, SIGNAL_RANGE, capacity);
    this.neighbors = new Int32Array(capacity);
    const vao = gl.createVertexArray();
    const buffer = gl.createBuffer();
    if (!vao || !buffer) throw new Error('Could not create network buffers.');
    this.vao = vao;
    this.buffer = buffer;
    gl.bindVertexArray(vao);
    gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
    gl.bufferData(gl.ARRAY_BUFFER, this.data.byteLength, gl.DYNAMIC_DRAW);
    gl.enableVertexAttribArray(0);
    gl.vertexAttribPointer(0, 4, gl.FLOAT, false, STRIDE * 4, 0);
    gl.vertexAttribDivisor(0, 1);
    gl.enableVertexAttribArray(1);
    gl.vertexAttribPointer(1, 1, gl.FLOAT, false, STRIDE * 4, 16);
    gl.vertexAttribDivisor(1, 1);
    gl.bindVertexArray(null);
  }

  /** Find pairs within signal range and upload them. */
  update(pop: Population, fieldSize: number): void {
    const n = pop.count;
    const half = fieldSize / 2;
    this.hash.build(pop.x, pop.y, n);
    let s = 0;
    const d = this.data;
    for (let i = 0; i < n && s < MAX_SEGMENTS; i++) {
      const xi = pop.x[i] as number;
      const yi = pop.y[i] as number;
      const found = this.hash.query(xi, yi, this.neighbors);
      for (let k = 0; k < found && s < MAX_SEGMENTS; k++) {
        const j = this.neighbors[k] as number;
        if (j <= i) continue;
        let dx = (pop.x[j] as number) - xi;
        let dy = (pop.y[j] as number) - yi;
        if (dx > half) dx -= fieldSize;
        else if (dx < -half) dx += fieldSize;
        if (dy > half) dy -= fieldSize;
        else if (dy < -half) dy += fieldSize;
        const dist = Math.hypot(dx, dy);
        if (dist >= SIGNAL_RANGE) continue;
        const o = s * STRIDE;
        d[o] = xi;
        d[o + 1] = yi;
        d[o + 2] = xi + dx;
        d[o + 3] = yi + dy;
        d[o + 4] = 1 - dist / SIGNAL_RANGE;
        s++;
      }
    }
    this.count = s;
    const { gl } = this;
    gl.bindBuffer(gl.ARRAY_BUFFER, this.buffer);
    gl.bufferSubData(gl.ARRAY_BUFFER, 0, d, 0, s * STRIDE);
  }

  draw(target: WebGLFramebuffer | null, fieldSize: number, view: Viewport): void {
    if (this.count === 0) return;
    const { gl } = this;
    gl.bindFramebuffer(gl.FRAMEBUFFER, target);
    gl.viewport(view.x, view.y, view.size, view.size);
    gl.enable(gl.BLEND);
    gl.blendFunc(gl.ONE, gl.ONE);
    gl.useProgram(this.program);
    gl.bindVertexArray(this.vao);
    gl.uniform1f(this.loc.fieldSize, fieldSize);
    // Half width up to 1.5 px at full coupling.
    gl.uniform1f(this.loc.halfWidth, (1.5 * fieldSize) / view.size);
    gl.drawArraysInstanced(gl.TRIANGLE_STRIP, 0, 4, this.count);
    gl.bindVertexArray(null);
    gl.disable(gl.BLEND);
  }
}
