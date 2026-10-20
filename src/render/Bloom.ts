import { createProgram, FULLSCREEN_VERT, uniform } from './gl';
import { BLUR_FRAG, BRIGHT_FRAG, COMPOSITE_FRAG } from './postShaders';

interface Target {
  tex: WebGLTexture;
  fbo: WebGLFramebuffer;
}

/**
 * Bloom post-process (SPEC.md section 5): the scene is drawn into a
 * half-float target; a bright pass and a two-pass Gaussian blur run at half
 * resolution; the composite adds the blur back at the chosen strength.
 */
export class Bloom {
  private readonly gl: WebGL2RenderingContext;
  private readonly vao: WebGLVertexArrayObject;
  private readonly bright: WebGLProgram;
  private readonly blur: WebGLProgram;
  private readonly composite: WebGLProgram;
  private readonly loc: Record<
    'bScene' | 'bThreshold' | 'blSource' | 'blDir' | 'cScene' | 'cBloom' | 'cStrength',
    WebGLUniformLocation
  >;
  private scene: Target | null = null;
  private half: [Target, Target] | null = null;
  private width = 0;
  private height = 0;

  constructor(gl: WebGL2RenderingContext) {
    this.gl = gl;
    this.bright = createProgram(gl, FULLSCREEN_VERT, BRIGHT_FRAG);
    this.blur = createProgram(gl, FULLSCREEN_VERT, BLUR_FRAG);
    this.composite = createProgram(gl, FULLSCREEN_VERT, COMPOSITE_FRAG);
    this.loc = {
      bScene: uniform(gl, this.bright, 'uScene'),
      bThreshold: uniform(gl, this.bright, 'uThreshold'),
      blSource: uniform(gl, this.blur, 'uSource'),
      blDir: uniform(gl, this.blur, 'uDir'),
      cScene: uniform(gl, this.composite, 'uScene'),
      cBloom: uniform(gl, this.composite, 'uBloom'),
      cStrength: uniform(gl, this.composite, 'uStrength'),
    };
    const vao = gl.createVertexArray();
    if (!vao) throw new Error('Could not create vertex array.');
    this.vao = vao;
  }

  /** The framebuffer to draw the scene into this frame, sized to the canvas. */
  sceneTarget(width: number, height: number): WebGLFramebuffer {
    if (width !== this.width || height !== this.height) this.resize(width, height);
    return (this.scene as Target).fbo;
  }

  /** Run bloom (if strength > 0) and composite the scene onto the canvas. */
  finish(strength: number, threshold: number): void {
    const { gl } = this;
    const scene = this.scene as Target;
    const [a, b] = this.half as [Target, Target];
    gl.bindVertexArray(this.vao);
    gl.activeTexture(gl.TEXTURE0);
    const hw = Math.max(1, this.width >> 1);
    const hh = Math.max(1, this.height >> 1);
    if (strength > 0) {
      gl.viewport(0, 0, hw, hh);
      gl.useProgram(this.bright);
      gl.uniform1i(this.loc.bScene, 0);
      gl.uniform1f(this.loc.bThreshold, threshold);
      this.pass(scene.tex, a.fbo);
      gl.useProgram(this.blur);
      gl.uniform1i(this.loc.blSource, 0);
      for (let i = 0; i < 2; i++) {
        gl.uniform2f(this.loc.blDir, 1 / hw, 0);
        this.pass(a.tex, b.fbo);
        gl.uniform2f(this.loc.blDir, 0, 1 / hh);
        this.pass(b.tex, a.fbo);
      }
    }
    gl.viewport(0, 0, this.width, this.height);
    gl.useProgram(this.composite);
    gl.uniform1i(this.loc.cScene, 0);
    gl.uniform1i(this.loc.cBloom, 1);
    gl.uniform1f(this.loc.cStrength, strength);
    gl.activeTexture(gl.TEXTURE1);
    gl.bindTexture(gl.TEXTURE_2D, a.tex);
    gl.activeTexture(gl.TEXTURE0);
    this.pass(scene.tex, null);
  }

  private pass(source: WebGLTexture, target: WebGLFramebuffer | null): void {
    const { gl } = this;
    gl.bindFramebuffer(gl.FRAMEBUFFER, target);
    gl.bindTexture(gl.TEXTURE_2D, source);
    gl.drawArrays(gl.TRIANGLES, 0, 3);
  }

  private resize(width: number, height: number): void {
    const { gl } = this;
    for (const t of [this.scene, ...(this.half ?? [])]) {
      if (!t) continue;
      gl.deleteTexture(t.tex);
      gl.deleteFramebuffer(t.fbo);
    }
    this.width = width;
    this.height = height;
    this.scene = this.createTarget(width, height);
    const hw = Math.max(1, width >> 1);
    const hh = Math.max(1, height >> 1);
    this.half = [this.createTarget(hw, hh), this.createTarget(hw, hh)];
  }

  private createTarget(width: number, height: number): Target {
    const { gl } = this;
    const tex = gl.createTexture();
    const fbo = gl.createFramebuffer();
    if (!tex || !fbo) throw new Error('Could not create bloom targets.');
    gl.bindTexture(gl.TEXTURE_2D, tex);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA16F, width, height, 0, gl.RGBA, gl.HALF_FLOAT, null);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    gl.bindFramebuffer(gl.FRAMEBUFFER, fbo);
    gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, tex, 0);
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    return { tex, fbo };
  }
}
