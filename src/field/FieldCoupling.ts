import { createProgram, FULLSCREEN_VERT, uniform } from '../render/gl';
import type { GrayScott } from './GrayScott';
import { APPLY_FRAG, DOWNSAMPLE_FRAG, WIPE_FRAG } from './shaders';

/**
 * The GPU side of coupling the field to the CPU (SPEC.md section 3, steps 3
 * and 5): read back block means (u, v, u·v²), apply the agents' per-block
 * update texture, and wipe a disc for the damage tool.
 */
export class FieldCoupling {
  readonly blockSize: number;
  readonly grid: number;
  /** Latest readback, RGBA per block: mean u, mean v, mean u·v², 1. */
  readonly means: Float32Array;
  private readonly gl: WebGL2RenderingContext;
  private readonly field: GrayScott;
  private readonly vao: WebGLVertexArrayObject;
  private readonly downsample: WebGLProgram;
  private readonly apply: WebGLProgram;
  private readonly wipeProgram: WebGLProgram;
  private readonly wipeLoc: Record<'state' | 'center' | 'radius' | 'size', WebGLUniformLocation>;
  private readonly meanTexture: WebGLTexture;
  private readonly meanFbo: WebGLFramebuffer;
  private readonly updateTexture: WebGLTexture;
  private readonly loc: Record<'dState' | 'dBlock' | 'aState' | 'aUpdate' | 'aBlock', WebGLUniformLocation>;

  constructor(gl: WebGL2RenderingContext, field: GrayScott, blockSize: number) {
    if (field.size % blockSize !== 0) throw new Error('Field size must be a multiple of the block size.');
    this.gl = gl;
    this.field = field;
    this.blockSize = blockSize;
    this.grid = field.size / blockSize;
    this.means = new Float32Array(this.grid * this.grid * 4);
    this.downsample = createProgram(gl, FULLSCREEN_VERT, DOWNSAMPLE_FRAG);
    this.apply = createProgram(gl, FULLSCREEN_VERT, APPLY_FRAG);
    this.loc = {
      dState: uniform(gl, this.downsample, 'uState'),
      dBlock: uniform(gl, this.downsample, 'uBlock'),
      aState: uniform(gl, this.apply, 'uState'),
      aUpdate: uniform(gl, this.apply, 'uUpdate'),
      aBlock: uniform(gl, this.apply, 'uBlock'),
    };
    this.wipeProgram = createProgram(gl, FULLSCREEN_VERT, WIPE_FRAG);
    this.wipeLoc = {
      state: uniform(gl, this.wipeProgram, 'uState'),
      center: uniform(gl, this.wipeProgram, 'uCenter'),
      radius: uniform(gl, this.wipeProgram, 'uRadius'),
      size: uniform(gl, this.wipeProgram, 'uSize'),
    };
    const vao = gl.createVertexArray();
    if (!vao) throw new Error('Could not create vertex array.');
    this.vao = vao;
    this.meanTexture = this.createTexture(gl.RGBA32F, gl.RGBA);
    const fbo = gl.createFramebuffer();
    if (!fbo) throw new Error('Could not create framebuffer.');
    this.meanFbo = fbo;
    gl.bindFramebuffer(gl.FRAMEBUFFER, fbo);
    gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, this.meanTexture, 0);
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    this.updateTexture = this.createTexture(gl.RG32F, gl.RG);
  }

  /** Downsample the field and read the block means into `means`. */
  readBack(): Float32Array {
    const { gl, grid } = this;
    gl.bindFramebuffer(gl.FRAMEBUFFER, this.meanFbo);
    gl.viewport(0, 0, grid, grid);
    gl.useProgram(this.downsample);
    gl.bindVertexArray(this.vao);
    gl.uniform1i(this.loc.dState, 0);
    gl.uniform1i(this.loc.dBlock, this.blockSize);
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, this.field.texture);
    gl.drawArrays(gl.TRIANGLES, 0, 3);
    gl.readPixels(0, 0, grid, grid, gl.RGBA, gl.FLOAT, this.means);
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    return this.means;
  }

  /** Upload a per-block update (RG pairs: u factor, v addition) and apply it to the field. */
  write(update: Float32Array): void {
    const { gl, grid } = this;
    gl.activeTexture(gl.TEXTURE1);
    gl.bindTexture(gl.TEXTURE_2D, this.updateTexture);
    gl.texSubImage2D(gl.TEXTURE_2D, 0, 0, 0, grid, grid, gl.RG, gl.FLOAT, update);
    gl.useProgram(this.apply);
    gl.bindVertexArray(this.vao);
    gl.uniform1i(this.loc.aState, 0);
    gl.uniform1i(this.loc.aUpdate, 1);
    gl.uniform1i(this.loc.aBlock, this.blockSize);
    this.field.pass(() => gl.drawArrays(gl.TRIANGLES, 0, 3));
    gl.activeTexture(gl.TEXTURE0);
  }

  /** Reset a disc of the field (centre and radius in field cells) to u = 1, v = 0. */
  wipe(cx: number, cy: number, radius: number): void {
    const { gl } = this;
    gl.useProgram(this.wipeProgram);
    gl.bindVertexArray(this.vao);
    gl.uniform1i(this.wipeLoc.state, 0);
    gl.uniform2f(this.wipeLoc.center, cx, cy);
    gl.uniform1f(this.wipeLoc.radius, radius);
    gl.uniform1f(this.wipeLoc.size, this.field.size);
    this.field.pass(() => gl.drawArrays(gl.TRIANGLES, 0, 3));
  }

  private createTexture(internal: number, format: number): WebGLTexture {
    const { gl, grid } = this;
    const tex = gl.createTexture();
    if (!tex) throw new Error('Could not create texture.');
    gl.bindTexture(gl.TEXTURE_2D, tex);
    gl.texImage2D(gl.TEXTURE_2D, 0, internal, grid, grid, 0, format, gl.FLOAT, null);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    return tex;
  }
}
