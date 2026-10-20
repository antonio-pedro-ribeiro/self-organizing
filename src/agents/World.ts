import { CpuField } from '../field/CpuField';
import type { FieldParams } from '../field/presets';
import { mulberry32, type Rng } from '../util/prng';
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

/**
 * Headless simulation: the CPU reference field plus protocells. One tick
 * steps the field `fieldStepsPerTick` times, then every agent once, matching
 * the frame loop in SPEC.md section 3.
 */
export class World {
  readonly config: WorldConfig;
  readonly field: CpuField;
  readonly pop: Population;
  private readonly rng: Rng;
  private readonly scratch: AgentScratch;
  ticks = 0;

  constructor(config: WorldConfig) {
    this.config = config;
    this.field = CpuField.fromSeed(config.fieldSize, config.seed);
    this.pop = new Population(AGENT_CAP);
    // Separate stream from the field's initial state, still fixed by the seed.
    this.rng = mulberry32((config.seed ^ 0x9e3779b9) >>> 0);
    this.scratch = new AgentScratch(config.fieldSize, AGENT_CAP);
    seedPopulation(this.pop, config.initialAgents, config.fieldSize, this.rng);
  }

  tick(): void {
    this.field.step(this.config.fieldStepsPerTick, this.config.field);
    stepAgents(this.pop, this.field, this.config.agents, this.rng, this.scratch);
    this.ticks++;
  }

  run(ticks: number): void {
    for (let t = 0; t < ticks; t++) this.tick();
  }
}
