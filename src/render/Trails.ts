import { TRAIL_FRAG } from './agentShaders';
import type { Viewport } from './FieldRenderer';
import { createProgram, FULLSCREEN_VERT, uniform } from './gl';

/** Trail fade per frame (SPEC.md section 5). */
export const TRAIL_DECAY = 0.92;

/**
 * Motion trails: a half-float feedback buffer the size of the field
 * viewport. Each frame fades the previous trail, then adds new dots.
 * Half floats let faint trails decay to zero instead of sticking at 1/255.
 */
export class Trails {
  private readonly gl: WebGL2RenderingContext;
  private readonly program: WebGLProgram;
  private readonly vao: WebGLVertexArrayObject;
  private readonly loc: Record<'trail' | 'decay', WebGLUniformLocation>;
  private textures: WebGLTexture[] = [];
  private fbos: WebGLFramebuffer[] = [];
  private current = 0;
  private size = 0;

  constructor(gl: WebGL2RenderingContext) {
    this.gl = gl;
    this.program = createProgram(gl, FULLSCREEN_VERT, TRAIL_FRAG);
    this.loc = { trail: uniform(gl, this.program, 'uTrail'), decay: uniform(gl, this.program, 'uDecay') };
    const vao = gl.createVertexArray();
    if (!vao) throw new Error('Could not create vertex array.');
    this.vao = vao;
  }

  /** Fade the trail and add new marks drawn by `drawDots` (into the bound framebuffer). */
  update(size: number, drawDots: () => void): void {
    this.ensureSize(size);
    const { gl } = this;
    const next = 1 - this.current;
    gl.bindFramebuffer(gl.FRAMEBUFFER, this.fbos[next] as WebGLFramebuffer);
    gl.viewport(0, 0, size, size);
    this.drawTexture(this.textures[this.current] as WebGLTexture, TRAIL_DECAY);
    drawDots();
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    this.current = next;
  }

  /** Add the trail onto `target` inside the field viewport. */
  composite(target: WebGLFramebuffer | null, view: Viewport): void {
    if (this.size === 0) return;
    const { gl } = this;
    gl.bindFramebuffer(gl.FRAMEBUFFER, target);
    gl.viewport(view.x, view.y, view.size, view.size);
    gl.enable(gl.BLEND);
    gl.blendFunc(gl.ONE, gl.ONE);
    this.drawTexture(this.textures[this.current] as WebGLTexture, 1);
    gl.disable(gl.BLEND);
  }

  clear(): void {
    const { gl } = this;
    for (const fbo of this.fbos) {
      gl.bindFramebuffer(gl.FRAMEBUFFER, fbo);
      gl.clearColor(0, 0, 0, 0);
      gl.clear(gl.COLOR_BUFFER_BIT);
    }
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
  }

  private drawTexture(tex: WebGLTexture, decay: number): void {
    const { gl } = this;
    gl.useProgram(this.program);
    gl.bindVertexArray(this.vao);
    gl.uniform1i(this.loc.trail, 0);
    gl.uniform1f(this.loc.decay, decay);
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, tex);
    gl.drawArrays(gl.TRIANGLES, 0, 3);
  }

  private ensureSize(size: number): void {
    if (size === this.size) return;
    const { gl } = this;
    for (const t of this.textures) gl.deleteTexture(t);
    for (const f of this.fbos) gl.deleteFramebuffer(f);
    this.textures = [];
    this.fbos = [];
    for (let i = 0; i < 2; i++) {
      const tex = gl.createTexture();
      const fbo = gl.createFramebuffer();
      if (!tex || !fbo) throw new Error('Could not create trail buffers.');
      gl.bindTexture(gl.TEXTURE_2D, tex);
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA16F, size, size, 0, gl.RGBA, gl.HALF_FLOAT, null);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
      gl.bindFramebuffer(gl.FRAMEBUFFER, fbo);
      gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, tex, 0);
      this.textures.push(tex);
      this.fbos.push(fbo);
    }
    this.size = size;
    this.current = 0;
    this.clear();
  }
}
