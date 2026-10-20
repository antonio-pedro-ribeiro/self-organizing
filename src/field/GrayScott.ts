import { createProgram, FULLSCREEN_VERT, uniform } from '../render/gl';
import { DT, DU, DV, type FieldParams } from './presets';
import { initialFieldData } from './initial';
import { STEP_FRAG } from './shaders';

/** GPU Gray-Scott reaction-diffusion on a torus, using ping-pong float textures. */
export class GrayScott {
  readonly size: number;
  private readonly gl: WebGL2RenderingContext;
  private readonly program: WebGLProgram;
  private readonly vao: WebGLVertexArrayObject;
  private readonly textures: [WebGLTexture, WebGLTexture];
  private readonly fbos: [WebGLFramebuffer, WebGLFramebuffer];
  private readonly loc: Record<'state' | 'size' | 'F' | 'k' | 'du' | 'dv' | 'dt', WebGLUniformLocation>;
  private current = 0;

  constructor(gl: WebGL2RenderingContext, size: number) {
    this.gl = gl;
    this.size = size;
    this.program = createProgram(gl, FULLSCREEN_VERT, STEP_FRAG);
    this.loc = {
      state: uniform(gl, this.program, 'uState'),
      size: uniform(gl, this.program, 'uSize'),
      F: uniform(gl, this.program, 'uF'),
      k: uniform(gl, this.program, 'uK'),
      du: uniform(gl, this.program, 'uDu'),
      dv: uniform(gl, this.program, 'uDv'),
      dt: uniform(gl, this.program, 'uDt'),
    };
    const vao = gl.createVertexArray();
    if (!vao) throw new Error('Could not create vertex array.');
    this.vao = vao;
    this.textures = [this.createTexture(), this.createTexture()];
    this.fbos = [this.createFbo(this.textures[0]), this.createFbo(this.textures[1])];
    this.reset(1);
  }

  /** The texture holding the latest state (u in R, v in G). */
  get texture(): WebGLTexture {
    return this.textures[this.current] as WebGLTexture;
  }

  /** Re-seed the field. The same seed always gives the same initial state. */
  reset(seed: number): void {
    const { gl, size } = this;
    gl.bindTexture(gl.TEXTURE_2D, this.textures[0]);
    gl.texSubImage2D(gl.TEXTURE_2D, 0, 0, 0, size, size, gl.RGBA, gl.FLOAT, initialFieldData(size, seed));
    this.current = 0;
  }

  /** Advance the field by n explicit Euler steps with the given parameters. */
  step(n: number, params: FieldParams): void {
    if (n <= 0) return;
    const { gl, size } = this;
    gl.useProgram(this.program);
    gl.bindVertexArray(this.vao);
    gl.viewport(0, 0, size, size);
    gl.uniform2i(this.loc.size, size, size);
    gl.uniform1f(this.loc.F, params.F);
    gl.uniform1f(this.loc.k, params.k);
    gl.uniform1f(this.loc.du, DU);
    gl.uniform1f(this.loc.dv, DV);
    gl.uniform1f(this.loc.dt, DT);
    gl.uniform1i(this.loc.state, 0);
    gl.activeTexture(gl.TEXTURE0);
    for (let i = 0; i < n; i++) {
      const next = 1 - this.current;
      gl.bindFramebuffer(gl.FRAMEBUFFER, this.fbos[next] as WebGLFramebuffer);
      gl.bindTexture(gl.TEXTURE_2D, this.textures[this.current] as WebGLTexture);
      gl.drawArrays(gl.TRIANGLES, 0, 3);
      this.current = next;
    }
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
  }

  /**
   * Run one extra pass over the field: the current state is bound to texture
   * unit 0, `draw` issues the draw call, and its output becomes the new state.
   */
  pass(draw: () => void): void {
    const { gl, size } = this;
    const next = 1 - this.current;
    gl.bindFramebuffer(gl.FRAMEBUFFER, this.fbos[next] as WebGLFramebuffer);
    gl.viewport(0, 0, size, size);
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, this.textures[this.current] as WebGLTexture);
    draw();
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    this.current = next;
  }

  private createTexture(): WebGLTexture {
    const { gl, size } = this;
    const tex = gl.createTexture();
    if (!tex) throw new Error('Could not create texture.');
    gl.bindTexture(gl.TEXTURE_2D, tex);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA32F, size, size, 0, gl.RGBA, gl.FLOAT, null);
    // NEAREST: linear filtering of float textures is not universally supported.
    // Wrapping is done in the shaders with texelFetch.
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    return tex;
  }

  private createFbo(tex: WebGLTexture): WebGLFramebuffer {
    const { gl } = this;
    const fbo = gl.createFramebuffer();
    if (!fbo) throw new Error('Could not create framebuffer.');
    gl.bindFramebuffer(gl.FRAMEBUFFER, fbo);
    gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, tex, 0);
    if (gl.checkFramebufferStatus(gl.FRAMEBUFFER) !== gl.FRAMEBUFFER_COMPLETE) {
      throw new Error('Float framebuffer is not complete on this GPU.');
    }
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    return fbo;
  }
}
