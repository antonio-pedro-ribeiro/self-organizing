import type { Environment } from '../agents/environment';
import { METABOLISM } from '../agents/params';
import type { Population } from '../agents/Population';
import { AgentRenderer } from './AgentRenderer';
import { Bloom } from './Bloom';
import type { ColormapName } from './colormap';
import { FieldRenderer, type Viewport } from './FieldRenderer';
import { FlowOverlay } from './FlowOverlay';
import { NetworkRenderer } from './NetworkRenderer';
import { Ripples } from './Ripples';
import { Trails } from './Trails';

/** Discs are drawn larger than the physical radius so they read on screen. */
const DISC_DRAW_SCALE = 2;

/** What one frame needs to know to draw. */
export interface SceneInputs {
  fieldTexture: WebGLTexture;
  pop: Population;
  env: Environment;
  canvasW: number;
  canvasH: number;
  dpr: number;
  now: number;
  /** 1 field only, 2 agents only, 3 both, 4 both plus network overlay. */
  view: 1 | 2 | 3 | 4;
  vMax: number;
  trails: boolean;
  bloom: boolean;
  bloomStrength: number;
  flow: boolean;
}

/** Owns every renderer and draws one frame: field, overlays, agents, bloom (SPEC.md section 3, step 7). */
export class Scene {
  readonly ripples: Ripples;
  private readonly field: FieldRenderer;
  private readonly agents: AgentRenderer;
  private readonly trails: Trails;
  private readonly network: NetworkRenderer;
  private readonly flow: FlowOverlay;
  private readonly bloom: Bloom;
  private readonly fieldSize: number;

  constructor(gl: WebGL2RenderingContext, fieldSize: number, capacity: number, colormap: ColormapName) {
    this.fieldSize = fieldSize;
    this.field = new FieldRenderer(gl, colormap);
    this.agents = new AgentRenderer(gl, capacity);
    this.trails = new Trails(gl);
    this.network = new NetworkRenderer(gl, fieldSize, capacity);
    this.flow = new FlowOverlay(gl, fieldSize);
    this.ripples = new Ripples(gl);
    this.bloom = new Bloom(gl);
  }

  setColormap(name: ColormapName): void {
    this.field.setColormap(name);
  }

  clearTrails(): void {
    this.trails.clear();
  }

  /** The field's square viewport in canvas pixels. */
  viewport(canvasW: number, canvasH: number): Viewport {
    const side = Math.min(canvasW, canvasH);
    return { x: Math.floor((canvasW - side) / 2), y: Math.floor((canvasH - side) / 2), size: side };
  }

  draw(f: SceneInputs): void {
    const n = this.fieldSize;
    const view = this.viewport(f.canvasW, f.canvasH);
    const target = this.bloom.sceneTarget(f.canvasW, f.canvasH);
    const showAgents = f.view !== 1;

    if (f.view === 2) this.field.clear(target, f.canvasW, f.canvasH);
    else this.field.draw(target, f.fieldTexture, n, f.vMax, f.canvasW, f.canvasH, view);
    if (f.flow) {
      this.flow.update(f.env);
      this.flow.draw(target, n, view, f.dpr);
    }
    if (showAgents) {
      this.agents.upload(f.pop);
      if (f.trails) {
        this.trails.update(view.size, () => this.agents.drawDots(n, Math.max(1, (1.5 * n) / view.size)));
        this.trails.composite(target, view);
      }
      if (f.view === 4) {
        this.network.update(f.pop, n);
        this.network.draw(target, n, view);
      }
      this.agents.drawDiscs(target, n, view, METABOLISM.radius * DISC_DRAW_SCALE);
    }
    this.ripples.draw(target, n, view, f.now);
    this.bloom.finish(f.bloom ? f.bloomStrength : 0, 0.55);
  }
}
