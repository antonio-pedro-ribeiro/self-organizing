import type { Population } from '../agents/Population';
import { AGENT_FRAG, AGENT_VERT } from './agentShaders';
import type { Viewport } from './FieldRenderer';
import { createProgram, uniform } from './gl';

/** Floats per instance: x, y, energy, membrane, gain, motility, build. */
const STRIDE = 7;

/** Draws protocells as instanced discs, or as soft dots into the trail buffer. */
export class AgentRenderer {
  private readonly gl: WebGL2RenderingContext;
  private readonly program: WebGLProgram;
  private readonly vao: WebGLVertexArrayObject;
  private readonly buffer: WebGLBuffer;
  private readonly data: Float32Array;
  private readonly loc: Record<'fieldSize' | 'radius' | 'mode', WebGLUniformLocation>;
  private count = 0;

  constructor(gl: WebGL2RenderingContext, capacity: number) {
    this.gl = gl;
    this.program = createProgram(gl, AGENT_VERT, AGENT_FRAG);
    this.loc = {
      fieldSize: uniform(gl, this.program, 'uFieldSize'),
      radius: uniform(gl, this.program, 'uRadius'),
      mode: uniform(gl, this.program, 'uMode'),
    };
    this.data = new Float32Array(capacity * STRIDE);
    const vao = gl.createVertexArray();
    const buffer = gl.createBuffer();
    if (!vao || !buffer) throw new Error('Could not create agent buffers.');
    this.vao = vao;
    this.buffer = buffer;
    gl.bindVertexArray(vao);
    gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
    gl.bufferData(gl.ARRAY_BUFFER, this.data.byteLength, gl.DYNAMIC_DRAW);
    const bytes = STRIDE * 4;
    const attrs: [number, number, number][] = [
      [0, 2, 0],
      [1, 2, 2],
      [2, 3, 4],
    ];
    for (const [location, size, offset] of attrs) {
      gl.enableVertexAttribArray(location);
      gl.vertexAttribPointer(location, size, gl.FLOAT, false, bytes, offset * 4);
      gl.vertexAttribDivisor(location, 1);
    }
    gl.bindVertexArray(null);
  }

  /** Copy the live population into the instance buffer. Call once per frame. */
  upload(pop: Population): void {
    const d = this.data;
    const n = pop.count;
    for (let i = 0; i < n; i++) {
      const o = i * STRIDE;
      d[o] = pop.x[i] as number;
      d[o + 1] = pop.y[i] as number;
      d[o + 2] = pop.energy[i] as number;
      d[o + 3] = pop.membrane[i] as number;
      d[o + 4] = pop.gain[i] as number;
      d[o + 5] = pop.motility[i] as number;
      d[o + 6] = pop.build[i] as number;
    }
    const { gl } = this;
    gl.bindBuffer(gl.ARRAY_BUFFER, this.buffer);
    gl.bufferSubData(gl.ARRAY_BUFFER, 0, d, 0, n * STRIDE);
    this.count = n;
  }

  /** Discs alpha-blended over whatever is in the viewport of `target`. */
  drawDiscs(target: WebGLFramebuffer | null, fieldSize: number, view: Viewport, radiusCells: number): void {
    const { gl } = this;
    gl.bindFramebuffer(gl.FRAMEBUFFER, target);
    gl.viewport(view.x, view.y, view.size, view.size);
    gl.enable(gl.BLEND);
    gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
    this.draw(fieldSize, radiusCells, 0);
    gl.disable(gl.BLEND);
  }

  /** Soft additive dots into the currently bound framebuffer (the trail buffer). */
  drawDots(fieldSize: number, radiusCells: number): void {
    const { gl } = this;
    gl.enable(gl.BLEND);
    gl.blendFunc(gl.ONE, gl.ONE);
    this.draw(fieldSize, radiusCells, 1);
    gl.disable(gl.BLEND);
  }

  private draw(fieldSize: number, radiusCells: number, mode: number): void {
    if (this.count === 0) return;
    const { gl } = this;
    gl.useProgram(this.program);
    gl.bindVertexArray(this.vao);
    gl.uniform1f(this.loc.fieldSize, fieldSize);
    gl.uniform1f(this.loc.radius, radiusCells);
    gl.uniform1i(this.loc.mode, mode);
    gl.drawArraysInstanced(gl.TRIANGLE_STRIP, 0, 4, this.count);
    gl.bindVertexArray(null);
  }
}
