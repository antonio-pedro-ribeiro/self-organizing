import type { Viewport } from './FieldRenderer';
import { createProgram, uniform } from './gl';
import { RIPPLE_FRAG, RIPPLE_VERT } from './overlayShaders';

const MAX_RIPPLES = 32;
const DURATION_S = 0.7;

interface Ripple {
  x: number;
  y: number;
  radius: number;
  born: number;
}

/** Expanding rings where the brush touches the field (SPEC.md section 5). */
export class Ripples {
  private readonly gl: WebGL2RenderingContext;
  private readonly program: WebGLProgram;
  private readonly vao: WebGLVertexArrayObject;
  private readonly buffer: WebGLBuffer;
  private readonly loc: WebGLUniformLocation;
  private readonly data = new Float32Array(MAX_RIPPLES * 4);
  private ripples: Ripple[] = [];

  constructor(gl: WebGL2RenderingContext) {
    this.gl = gl;
    this.program = createProgram(gl, RIPPLE_VERT, RIPPLE_FRAG);
    this.loc = uniform(gl, this.program, 'uFieldSize');
    const vao = gl.createVertexArray();
    const buffer = gl.createBuffer();
    if (!vao || !buffer) throw new Error('Could not create ripple buffers.');
    this.vao = vao;
    this.buffer = buffer;
    gl.bindVertexArray(vao);
    gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
    gl.bufferData(gl.ARRAY_BUFFER, this.data.byteLength, gl.DYNAMIC_DRAW);
    gl.enableVertexAttribArray(0);
    gl.vertexAttribPointer(0, 4, gl.FLOAT, false, 16, 0);
    gl.vertexAttribDivisor(0, 1);
    gl.bindVertexArray(null);
  }

  add(x: number, y: number, radius: number, now: number): void {
    this.ripples.push({ x, y, radius, born: now });
    if (this.ripples.length > MAX_RIPPLES) this.ripples.shift();
  }

  draw(target: WebGLFramebuffer | null, fieldSize: number, view: Viewport, now: number): void {
    this.ripples = this.ripples.filter((r) => (now - r.born) / 1000 < DURATION_S);
    if (this.ripples.length === 0) return;
    this.ripples.forEach((r, i) => {
      const t = (now - r.born) / 1000 / DURATION_S;
      this.data[i * 4] = r.x;
      this.data[i * 4 + 1] = r.y;
      this.data[i * 4 + 2] = r.radius * (0.3 + 0.9 * t);
      this.data[i * 4 + 3] = 1 - t;
    });
    const { gl } = this;
    gl.bindFramebuffer(gl.FRAMEBUFFER, target);
    gl.viewport(view.x, view.y, view.size, view.size);
    gl.enable(gl.BLEND);
    gl.blendFunc(gl.ONE, gl.ONE);
    gl.useProgram(this.program);
    gl.bindVertexArray(this.vao);
    gl.bindBuffer(gl.ARRAY_BUFFER, this.buffer);
    gl.bufferSubData(gl.ARRAY_BUFFER, 0, this.data, 0, this.ripples.length * 4);
    gl.uniform1f(this.loc, fieldSize);
    gl.drawArraysInstanced(gl.TRIANGLE_STRIP, 0, 4, this.ripples.length);
    gl.bindVertexArray(null);
    gl.disable(gl.BLEND);
  }
}
