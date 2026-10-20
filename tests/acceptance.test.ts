import { describe, expect, it } from 'vitest';
import { DEFAULT_AGENT_PARAMS, type AgentParams } from '../src/agents/params';
import { Population } from '../src/agents/Population';
import { AgentScratch, stepAgents } from '../src/agents/rules';
import { seedPopulation } from '../src/agents/seed';
import { World, type WorldConfig } from '../src/agents/World';
import { PRESETS } from '../src/field/presets';
import { mulberry32 } from '../src/util/prng';
import { StubEnv } from './helpers/StubEnv';

/**
 * Headless acceptance tests from SPEC.md section 7, on the CPU reference
 * field. The field is 128² rather than 512² to keep runs short, so the
 * initial population is 50 rather than 200; see PROGRESS.md. One tick is
 * one frame, so 60 s is 3600 ticks.
 */
const base: WorldConfig = {
  fieldSize: 128,
  seed: 1,
  initialAgents: 50,
  fieldStepsPerTick: 8,
  field: PRESETS.mitosis,
  agents: DEFAULT_AGENT_PARAMS,
};

const TICKS_PER_SECOND = 60;
const LONG_MS = 300_000;

describe('test 4: autopoiesis', () => {
  it('with production cut, every agent dies within 200 ticks', () => {
    const world = new World({ ...base, agents: { ...DEFAULT_AGENT_PARAMS, productionCut: true } });
    let extinctAt = -1;
    for (let t = 1; t <= 200 && extinctAt < 0; t++) {
      world.tick();
      if (world.pop.count === 0) extinctAt = t;
    }
    console.info(`test 4 knockout: extinct at tick ${extinctAt}`);
    expect(extinctAt).toBeGreaterThan(0);
  });
});

describe('test 4 control and test 7: determinism', () => {
  it('a 1000-tick run keeps at least 50% alive and repeats exactly', () => {
    const a = new World(base);
    a.run(1000);
    console.info(`test 4 control: ${a.pop.count} agents at tick 1000 (started with ${base.initialAgents})`);
    expect(a.pop.count).toBeGreaterThanOrEqual(0.5 * base.initialAgents);

    const b = new World(base);
    b.run(1000);
    console.info(`test 7: hashes ${a.pop.hash()} and ${b.pop.hash()}`);
    expect(b.pop.hash()).toBe(a.pop.hash());
  }, LONG_MS);

  it('a different seed gives a different run', () => {
    const a = new World(base);
    const b = new World({ ...base, seed: 2 });
    a.run(50);
    b.run(50);
    expect(b.pop.hash()).not.toBe(a.pop.hash());
  });
});

describe('test 5: structural coupling', () => {
  it('the same nutrient pulse draws different energy responses from different genomes', () => {
    // Measuring setup: no division and no noise, so only the genome differs.
    const params: AgentParams = { ...DEFAULT_AGENT_PARAMS, sensingNoise: 0, divisionEnergy: Infinity };
    const genomes = new Population(50);
    seedPopulation(genomes, 50, 64, mulberry32(5));

    const energyAfter = (i: number, pulse: boolean): number => {
      const pop = new Population(1);
      pop.add({
        x: 32, y: 32, heading: 0, energy: 0.5, components: 0.2, membrane: 1, lineage: 1,
        gain: genomes.gain[i] as number,
        motility: genomes.motility[i] as number,
        build: genomes.build[i] as number,
      });
      const env = new StubEnv(0.5);
      const rng = mulberry32(1);
      const scratch = new AgentScratch(env.size, 1);
      for (let t = 0; t < 30; t++) {
        env.u = pulse && t >= 20 ? 1 : 0.5;
        stepAgents(pop, env, params, rng, scratch);
      }
      return pop.energy[0] as number;
    };

    const responses: number[] = [];
    for (let i = 0; i < 50; i++) responses.push(energyAfter(i, true) - energyAfter(i, false));
    const mean = responses.reduce((s, r) => s + r, 0) / responses.length;
    const sd = Math.sqrt(responses.reduce((s, r) => s + (r - mean) ** 2, 0) / responses.length);
    const cv = sd / Math.abs(mean);
    console.info(`test 5: energy response mean ${mean.toFixed(4)}, CV ${cv.toFixed(3)}`);
    expect(cv).toBeGreaterThan(0.1);
  });
});

describe('test 6: resilience', () => {
  it('after 25% of the area is wiped, the population recovers to 80% within 60 s', () => {
    const world = new World(base);
    const settle = 2000;
    const window = 200;
    let preSum = 0;
    for (let t = 1; t <= settle; t++) {
      world.tick();
      if (t > settle - window) preSum += world.pop.count;
    }
    const pre = preSum / window;

    const size = base.fieldSize;
    const radius = Math.sqrt((0.25 * size * size) / Math.PI);
    const removed = world.damage(size / 2, size / 2, radius);
    const after = world.pop.count;

    // Recovery is judged on a 100-tick moving mean, so noise alone cannot pass it.
    const recent: number[] = [];
    let recoveredAt = -1;
    let lowest = after;
    for (let t = 1; t <= 60 * TICKS_PER_SECOND && recoveredAt < 0; t++) {
      world.tick();
      lowest = Math.min(lowest, world.pop.count);
      recent.push(world.pop.count);
      if (recent.length > 100) recent.shift();
      const mean = recent.reduce((s, n) => s + n, 0) / recent.length;
      if (recent.length === 100 && mean >= 0.8 * pre) recoveredAt = t;
    }
    console.info(
      `test 6: pre-damage mean ${pre.toFixed(1)}, removed ${removed}, lowest ${lowest}, ` +
        (recoveredAt > 0 ? `recovered at tick ${recoveredAt} (${(recoveredAt / TICKS_PER_SECOND).toFixed(1)} s)` : 'did not recover'),
    );
    expect(removed).toBeGreaterThan(0);
    expect(recoveredAt).toBeGreaterThan(0);
  }, LONG_MS);
});
