import { BLOCK_SIZE, BlockEnvironment } from '../agents/BlockEnvironment';
import { wipeAgents } from '../agents/damage';
import { AGENT_CAP, type AgentParams } from '../agents/params';
import { Population } from '../agents/Population';
import { AgentScratch, stepAgents } from '../agents/rules';
import { seedPopulation } from '../agents/seed';
import { agentSeed } from '../agents/World';
import { createFieldSample, fillFromRgba, type FieldSample } from '../metrics/fieldMetrics';
import { METRICS_GRID } from '../metrics/sample';
import { mulberry32, type Rng } from '../util/prng';
import { FieldCoupling } from './FieldCoupling';
import { GrayScott } from './GrayScott';
import type { Patch } from './initial';
import type { FieldParams } from './presets';

/** The browser simulation: GPU field coupled to CPU protocells, ticked by the frame loop. */
export class BrowserSim {
  readonly field: GrayScott;
  readonly env: BlockEnvironment;
  readonly pop: Population;
  /** Latest metrics readback (128×128 block means). */
  readonly sample: FieldSample;
  ticks = 0;
  /** Mean CPU time of the agent step, in ms. */
  agentMs = 0;
  private readonly coupling: FieldCoupling;
  private readonly metricsReader: FieldCoupling;
  private readonly scratch: AgentScratch;
  private readonly update: Float32Array;
  private rng: Rng = mulberry32(0);

  constructor(gl: WebGL2RenderingContext, fieldSize: number) {
    this.field = new GrayScott(gl, fieldSize);
    this.coupling = new FieldCoupling(gl, this.field, BLOCK_SIZE);
    this.metricsReader = new FieldCoupling(gl, this.field, fieldSize / METRICS_GRID);
    this.sample = createFieldSample(METRICS_GRID, fieldSize / METRICS_GRID);
    this.env = new BlockEnvironment(fieldSize, BLOCK_SIZE);
    this.pop = new Population(AGENT_CAP);
    this.scratch = new AgentScratch(fieldSize, AGENT_CAP);
    this.update = new Float32Array(this.env.grid * this.env.grid * 2);
  }

  reset(seed: number, initialAgents: number): void {
    this.field.reset(seed);
    this.pop.clear();
    this.rng = mulberry32(agentSeed(seed));
    seedPopulation(this.pop, initialAgents, this.field.size, this.rng);
    this.coupling.restart();
    this.metricsReader.restart();
    this.ticks = 0;
  }

  /**
   * One tick: SPEC.md section 3, steps 2 to 5. Agents sense the newest
   * finished readback (normally the previous frame's), so their CPU work
   * overlaps the GPU's field steps instead of waiting for them.
   */
  tick(fieldSteps: number, params: FieldParams, agents: AgentParams): void {
    this.field.step(fieldSteps, params);
    this.env.load(this.coupling.readBackAsync(), 4, 0);
    const start = performance.now();
    stepAgents(this.pop, this.env, agents, this.rng, this.scratch);
    this.agentMs += (performance.now() - start - this.agentMs) * 0.05;
    this.env.writeUpdate(this.update);
    this.coupling.write(this.update);
    this.ticks++;
  }

  /** Refresh `sample` from the newest finished metrics readback. */
  readSample(): FieldSample {
    fillFromRgba(this.sample, this.metricsReader.readBackAsync());
    return this.sample;
  }

  damage(x: number, y: number, r: number): void {
    this.coupling.wipe(x, y, r);
    wipeAgents(this.pop, x, y, r, this.field.size);
  }

  seedPatches(patches: Patch[]): void {
    this.coupling.seedPatches(patches);
  }

  brush(mode: 'noise' | 'nutrient', x: number, y: number, r: number, seed: number): void {
    this.coupling.brush(mode, x, y, r, seed);
  }
}
