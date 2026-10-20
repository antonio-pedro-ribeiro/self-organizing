import { createProgram, FULLSCREEN_VERT, uniform } from '../render/gl';
import type { GrayScott } from './GrayScott';
import type { Patch } from './initial';
import { APPLY_FRAG, BRUSH_FRAG, DOWNSAMPLE_FRAG, PATCH_FRAG, WIPE_FRAG } from './shaders';

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
  private readonly patchProgram: WebGLProgram;
  private readonly patchLoc: Record<'state' | 'patches' | 'count' | 'size', WebGLUniformLocation>;
  private readonly brushProgram: WebGLProgram;
  private readonly brushLoc: Record<'state' | 'center' | 'radius' | 'size' | 'mode' | 'seed', WebGLUniformLocation>;
  private readonly meanTexture: WebGLTexture;
  private readonly meanFbo: WebGLFramebuffer;
  private readonly updateTexture: WebGLTexture;
  /** Pixel buffer and fence for the asynchronous readback. */
  private readonly pbo: WebGLBuffer;
  private fence: WebGLSync | null = null;
  private readonly loc: Record<'dState' | 'dBlock' | 'aState' | 'aUpdate' | 'aBlock' | 'aGrid', WebGLUniformLocation>;

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
      aGrid: uniform(gl, this.apply, 'uGrid'),
    };
    this.wipeProgram = createProgram(gl, FULLSCREEN_VERT, WIPE_FRAG);
    this.wipeLoc = {
      state: uniform(gl, this.wipeProgram, 'uState'),
      center: uniform(gl, this.wipeProgram, 'uCenter'),
      radius: uniform(gl, this.wipeProgram, 'uRadius'),
      size: uniform(gl, this.wipeProgram, 'uSize'),
    };
    this.patchProgram = createProgram(gl, FULLSCREEN_VERT, PATCH_FRAG);
    this.patchLoc = {
      state: uniform(gl, this.patchProgram, 'uState'),
      patches: uniform(gl, this.patchProgram, 'uPatches'),
      count: uniform(gl, this.patchProgram, 'uCount'),
      size: uniform(gl, this.patchProgram, 'uSize'),
    };
    this.brushProgram = createProgram(gl, FULLSCREEN_VERT, BRUSH_FRAG);
    this.brushLoc = {
      state: uniform(gl, this.brushProgram, 'uState'),
      center: uniform(gl, this.brushProgram, 'uCenter'),
      radius: uniform(gl, this.brushProgram, 'uRadius'),
      size: uniform(gl, this.brushProgram, 'uSize'),
      mode: uniform(gl, this.brushProgram, 'uMode'),
      seed: uniform(gl, this.brushProgram, 'uSeed'),
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
    const pbo = gl.createBuffer();
    if (!pbo) throw new Error('Could not create readback buffer.');
    this.pbo = pbo;
    gl.bindBuffer(gl.PIXEL_PACK_BUFFER, pbo);
    gl.bufferData(gl.PIXEL_PACK_BUFFER, this.means.byteLength, gl.STREAM_READ);
    gl.bindBuffer(gl.PIXEL_PACK_BUFFER, null);
  }

  /** Downsample the field and read the block means into `means`, waiting for the GPU. */
  readBack(): Float32Array {
    const { gl, grid } = this;
    this.drawMeans();
    gl.readPixels(0, 0, grid, grid, gl.RGBA, gl.FLOAT, this.means);
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    return this.means;
  }

  /**
   * Asynchronous readback: returns the newest block means the GPU has
   * finished (normally from the previous frame) and starts a new readback of
   * the current field, so the CPU never waits for the GPU's field steps.
   * While a readback is still in flight, the previous means are returned
   * again. The first call after `restart` reads synchronously.
   */
  readBackAsync(): Float32Array {
    const { gl, grid } = this;
    if (this.fence) {
      // WebGL updates fence status only between frames, so this never spins.
      if (gl.getSyncParameter(this.fence, gl.SYNC_STATUS) !== gl.SIGNALED) return this.means;
      gl.bindBuffer(gl.PIXEL_PACK_BUFFER, this.pbo);
      gl.getBufferSubData(gl.PIXEL_PACK_BUFFER, 0, this.means);
      gl.bindBuffer(gl.PIXEL_PACK_BUFFER, null);
      gl.deleteSync(this.fence);
      this.fence = null;
    } else {
      this.readBack();
    }
    this.drawMeans();
    gl.bindBuffer(gl.PIXEL_PACK_BUFFER, this.pbo);
    gl.readPixels(0, 0, grid, grid, gl.RGBA, gl.FLOAT, 0);
    gl.bindBuffer(gl.PIXEL_PACK_BUFFER, null);
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    this.fence = gl.fenceSync(gl.SYNC_GPU_COMMANDS_COMPLETE, 0);
    gl.flush();
    return this.means;
  }

  /** Drop any readback in flight (after a reset, so stale means are not used). */
  restart(): void {
    if (this.fence) this.gl.deleteSync(this.fence);
    this.fence = null;
  }

  private drawMeans(): void {
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
    gl.uniform1i(this.loc.aGrid, grid);
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

  /** Brush stroke: add noise to v or nutrient to u in a soft disc (field cells). */
  brush(mode: 'noise' | 'nutrient', cx: number, cy: number, radius: number, seed: number): void {
    const { gl } = this;
    gl.useProgram(this.brushProgram);
    gl.bindVertexArray(this.vao);
    gl.uniform1i(this.brushLoc.state, 0);
    gl.uniform2f(this.brushLoc.center, cx, cy);
    gl.uniform1f(this.brushLoc.radius, radius);
    gl.uniform1f(this.brushLoc.size, this.field.size);
    gl.uniform1i(this.brushLoc.mode, mode === 'noise' ? 0 : 1);
    gl.uniform1f(this.brushLoc.seed, seed);
    this.field.pass(() => gl.drawArrays(gl.TRIANGLES, 0, 3));
  }

  /** Seed up to 8 patches of the autocatalytic species, as in the initial state. */
  seedPatches(patches: Patch[]): void {
    const { gl } = this;
    const list = patches.slice(0, 8);
    const data = new Float32Array(24);
    list.forEach((p, i) => data.set([p.cx, p.cy, p.half], i * 3));
    gl.useProgram(this.patchProgram);
    gl.bindVertexArray(this.vao);
    gl.uniform1i(this.patchLoc.state, 0);
    gl.uniform3fv(this.patchLoc.patches, data);
    gl.uniform1i(this.patchLoc.count, list.length);
    gl.uniform1f(this.patchLoc.size, this.field.size);
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
