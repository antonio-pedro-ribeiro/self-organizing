import type { Environment, Vec2 } from '../agents/environment';
import { mulberry32, type Rng } from '../util/prng';
import type { Viewport } from './FieldRenderer';
import { createProgram, uniform } from './gl';
import { POINT_FRAG, POINT_VERT } from './overlayShaders';

const PARTICLES = 3000;
/** Cells moved per frame per unit of gradient (u per cell). */
const SPEED_GAIN = 60;
const MAX_SPEED = 1.5;

/**
 * Flow overlay (SPEC.md section 5): particles drift along the nutrient flux
 * −∇u, from where nutrient is plentiful toward where it is being consumed.
 * Visual only; it does not touch the simulation or its random stream.
 */
export class FlowOverlay {
  private readonly gl: WebGL2RenderingContext;
  private readonly program: WebGLProgram;
  private readonly vao: WebGLVertexArrayObject;
  private readonly buffer: WebGLBuffer;
  private readonly loc: Record<'fieldSize' | 'pointSize', WebGLUniformLocation>;
  private readonly x = new Float32Array(PARTICLES);
  private readonly y = new Float32Array(PARTICLES);
  private readonly age = new Float32Array(PARTICLES);
  private readonly life = new Float32Array(PARTICLES);
  private readonly points = new Float32Array(PARTICLES * 3);
  private readonly grad: Vec2 = { x: 0, y: 0 };
  private readonly rng: Rng = mulberry32(12345);

  constructor(gl: WebGL2RenderingContext, fieldSize: number) {
    this.gl = gl;
    this.program = createProgram(gl, POINT_VERT, POINT_FRAG);
    this.loc = { fieldSize: uniform(gl, this.program, 'uFieldSize'), pointSize: uniform(gl, this.program, 'uPointSize') };
    const vao = gl.createVertexArray();
    const buffer = gl.createBuffer();
    if (!vao || !buffer) throw new Error('Could not create flow buffers.');
    this.vao = vao;
    this.buffer = buffer;
    gl.bindVertexArray(vao);
    gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
    gl.bufferData(gl.ARRAY_BUFFER, this.points.byteLength, gl.DYNAMIC_DRAW);
    gl.enableVertexAttribArray(0);
    gl.vertexAttribPointer(0, 3, gl.FLOAT, false, 12, 0);
    gl.bindVertexArray(null);
    for (let i = 0; i < PARTICLES; i++) {
      this.spawn(i, fieldSize);
      this.age[i] = this.rng() * (this.life[i] as number);
    }
  }

  /** Advance particles one frame through the latest sensed field. */
  update(env: Environment): void {
    const size = env.size;
    const g = this.grad;
    for (let i = 0; i < PARTICLES; i++) {
      env.nutrientGradient(this.x[i] as number, this.y[i] as number, g);
      let vx = -g.x * SPEED_GAIN;
      let vy = -g.y * SPEED_GAIN;
      const speed = Math.hypot(vx, vy);
      if (speed > MAX_SPEED) {
        vx *= MAX_SPEED / speed;
        vy *= MAX_SPEED / speed;
      }
      this.x[i] = (((this.x[i] as number) + vx) % size + size) % size;
      this.y[i] = (((this.y[i] as number) + vy) % size + size) % size;
      this.age[i] = (this.age[i] as number) + 1;
      if ((this.age[i] as number) > (this.life[i] as number)) this.spawn(i, size);
      const t = (this.age[i] as number) / (this.life[i] as number);
      const o = i * 3;
      this.points[o] = this.x[i] as number;
      this.points[o + 1] = this.y[i] as number;
      // Fade in and out over the lifetime; brighter where the flux is stronger.
      this.points[o + 2] = Math.sin(Math.PI * t) * Math.min(1, 0.35 + speed / MAX_SPEED);
    }
    const { gl } = this;
    gl.bindBuffer(gl.ARRAY_BUFFER, this.buffer);
    gl.bufferSubData(gl.ARRAY_BUFFER, 0, this.points);
  }

  draw(target: WebGLFramebuffer | null, fieldSize: number, view: Viewport, dpr: number): void {
    const { gl } = this;
    gl.bindFramebuffer(gl.FRAMEBUFFER, target);
    gl.viewport(view.x, view.y, view.size, view.size);
    gl.enable(gl.BLEND);
    gl.blendFunc(gl.ONE, gl.ONE);
    gl.useProgram(this.program);
    gl.bindVertexArray(this.vao);
    gl.uniform1f(this.loc.fieldSize, fieldSize);
    gl.uniform1f(this.loc.pointSize, 3.5 * dpr);
    gl.drawArrays(gl.POINTS, 0, PARTICLES);
    gl.bindVertexArray(null);
    gl.disable(gl.BLEND);
  }

  private spawn(i: number, size: number): void {
    this.x[i] = this.rng() * size;
    this.y[i] = this.rng() * size;
    this.age[i] = 0;
    this.life[i] = 60 + this.rng() * 90;
  }
}
