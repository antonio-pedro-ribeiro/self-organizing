import { CpuField } from '../field/CpuField';
import type { FieldParams } from '../field/presets';
import { mulberry32, type Rng } from '../util/prng';
import { BlockEnvironment } from './BlockEnvironment';
import { wipeAgents } from './damage';
import { AGENT_CAP, type AgentParams } from './params';
import { Population } from './Population';
import { AgentScratch, stepAgents } from './rules';
import { seedPopulation } from './seed';

export interface WorldConfig {
  fieldSize: number;
  seed: number;
  initialAgents: number;
  fieldStepsPerTick: number;
  field: FieldParams;
  agents: AgentParams;
}

/** Agent RNG seed derived from the run seed: a separate stream from the field's initial state. */
export function agentSeed(seed: number): number {
  return (seed ^ 0x9e3779b9) >>> 0;
}

/**
 * Headless simulation: the CPU reference field plus protocells, coupled the
 * same way as the browser. One tick steps the field `fieldStepsPerTick`
 * times, reads back block means, steps every agent once, then writes the
 * agents' grazing and emissions back (SPEC.md section 3, steps 2 to 5).
 */
export class World {
  readonly config: WorldConfig;
  readonly field: CpuField;
  readonly env: BlockEnvironment;
  readonly pop: Population;
  private readonly rng: Rng;
  private readonly scratch: AgentScratch;
  private readonly means: Float32Array;
  private readonly update: Float32Array;
  ticks = 0;

  constructor(config: WorldConfig) {
    this.config = config;
    this.field = CpuField.fromSeed(config.fieldSize, config.seed);
    this.env = new BlockEnvironment(config.fieldSize);
    this.pop = new Population(AGENT_CAP);
    this.rng = mulberry32(agentSeed(config.seed));
    this.scratch = new AgentScratch(config.fieldSize, AGENT_CAP);
    this.means = new Float32Array(this.env.grid * this.env.grid);
    this.update = new Float32Array(this.env.grid * this.env.grid * 2);
    seedPopulation(this.pop, config.initialAgents, config.fieldSize, this.rng);
  }

  tick(): void {
    const { field, env } = this;
    field.step(this.config.fieldStepsPerTick, this.config.field);
    field.blockMeans(env.blockSize, this.means);
    env.load(this.means);
    stepAgents(this.pop, env, this.config.agents, this.rng, this.scratch);
    env.writeUpdate(this.update);
    field.applyBlockUpdate(env.blockSize, this.update);
    this.ticks++;
  }

  run(ticks: number): void {
    for (let t = 0; t < ticks; t++) this.tick();
  }

  /** Wipe a disc of field and agents. No repair rule exists anywhere. */
  damage(cx: number, cy: number, radius: number): number {
    this.field.wipe(cx, cy, radius);
    return wipeAgents(this.pop, cx, cy, radius, this.config.fieldSize);
  }
}
