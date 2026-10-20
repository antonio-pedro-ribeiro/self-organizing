import { DISPLAY_FRAG } from '../field/shaders';
import { buildLut, type ColormapName } from './colormap';
import { createProgram, FULLSCREEN_VERT, uniform } from './gl';

export interface Viewport {
  x: number;
  y: number;
  size: number;
}

/** Draws the Gray-Scott field with a perceptual colormap and bicubic upsampling. */
export class FieldRenderer {
  private readonly gl: WebGL2RenderingContext;
  private readonly program: WebGLProgram;
  private readonly vao: WebGLVertexArrayObject;
  private readonly lutTexture: WebGLTexture;
  private readonly loc: Record<'state' | 'lut' | 'size' | 'vMax', WebGLUniformLocation>;

  constructor(gl: WebGL2RenderingContext, colormap: ColormapName) {
    this.gl = gl;
    this.program = createProgram(gl, FULLSCREEN_VERT, DISPLAY_FRAG);
    this.loc = {
      state: uniform(gl, this.program, 'uState'),
      lut: uniform(gl, this.program, 'uLut'),
      size: uniform(gl, this.program, 'uSize'),
      vMax: uniform(gl, this.program, 'uVMax'),
    };
    const vao = gl.createVertexArray();
    if (!vao) throw new Error('Could not create vertex array.');
    this.vao = vao;
    const lut = gl.createTexture();
    if (!lut) throw new Error('Could not create colormap texture.');
    this.lutTexture = lut;
    gl.bindTexture(gl.TEXTURE_2D, lut);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    this.setColormap(colormap);
  }

  setColormap(name: ColormapName): void {
    const { gl } = this;
    gl.bindTexture(gl.TEXTURE_2D, this.lutTexture);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA8, 256, 1, 0, gl.RGBA, gl.UNSIGNED_BYTE, buildLut(name, 256));
  }

  /** Clear the whole canvas to the background colour. */
  clear(canvasW: number, canvasH: number): void {
    const { gl } = this;
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    gl.viewport(0, 0, canvasW, canvasH);
    gl.clearColor(0.02, 0.024, 0.04, 1);
    gl.clear(gl.COLOR_BUFFER_BIT);
  }

  /** Clear the canvas and draw the field into a square viewport. */
  draw(state: WebGLTexture, fieldSize: number, vMax: number, canvasW: number, canvasH: number, view: Viewport): void {
    const { gl } = this;
    this.clear(canvasW, canvasH);
    gl.viewport(view.x, view.y, view.size, view.size);
    gl.useProgram(this.program);
    gl.bindVertexArray(this.vao);
    gl.uniform2i(this.loc.size, fieldSize, fieldSize);
    gl.uniform1f(this.loc.vMax, vMax);
    gl.uniform1i(this.loc.state, 0);
    gl.uniform1i(this.loc.lut, 1);
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, state);
    gl.activeTexture(gl.TEXTURE1);
    gl.bindTexture(gl.TEXTURE_2D, this.lutTexture);
    gl.drawArrays(gl.TRIANGLES, 0, 3);
    gl.activeTexture(gl.TEXTURE0);
  }
}
