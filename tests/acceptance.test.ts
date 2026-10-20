import { describe, expect, it } from 'vitest';
import { DEFAULT_AGENT_PARAMS, DEFAULT_INITIAL_AGENTS } from '../src/agents/params';
import { World, type WorldConfig } from '../src/agents/World';
import { PRESETS } from '../src/field/presets';

/**
 * Headless acceptance tests from SPEC.md section 7. The field is 128² rather
 * than 512² to keep the CPU reference fast; see PROGRESS.md.
 */
const base: WorldConfig = {
  fieldSize: 128,
  seed: 1,
  initialAgents: DEFAULT_INITIAL_AGENTS,
  fieldStepsPerTick: 8,
  field: PRESETS.mitosis,
  agents: DEFAULT_AGENT_PARAMS,
};

const TIMEOUT_MS = 120_000;

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
  }, TIMEOUT_MS);

  it('a different seed gives a different run', () => {
    const a = new World(base);
    const b = new World({ ...base, seed: 2 });
    a.run(50);
    b.run(50);
    expect(b.pop.hash()).not.toBe(a.pop.hash());
  });
});
