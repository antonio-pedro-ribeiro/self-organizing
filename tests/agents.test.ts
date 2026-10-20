import { describe, expect, it } from 'vitest';
import type { Environment } from '../src/agents/environment';
import { AGENT_CAP, DEFAULT_AGENT_PARAMS, METABOLISM, type AgentParams } from '../src/agents/params';
import { Population, type AgentInit } from '../src/agents/Population';
import { AgentScratch, mutate, stepAgents } from '../src/agents/rules';
import { mulberry32 } from '../src/util/prng';
import { StubEnv } from './helpers/StubEnv';

const quiet: AgentParams = { ...DEFAULT_AGENT_PARAMS, sensingNoise: 0, mutationSigma: 0 };

function one(overrides: Partial<AgentInit> = {}, capacity = 8): Population {
  const pop = new Population(capacity);
  pop.add({
    x: 32, y: 32, heading: 0, energy: 0.5, components: 0.2, membrane: 1, lineage: 7,
    gain: 0.5, motility: 0.5, build: 0.5, ...overrides,
  });
  return pop;
}

function run(pop: Population, env: Environment, params: AgentParams, ticks: number): void {
  const rng = mulberry32(1);
  const scratch = new AgentScratch(env.size, pop.capacity);
  for (let t = 0; t < ticks; t++) stepAgents(pop, env, params, rng, scratch);
}

describe('protocell rules', () => {
  it('grazes in proportion to local nutrient and gains energy at the yield', () => {
    const pop = one({ build: 0, motility: 0 });
    const env = new StubEnv(0.8);
    run(pop, env, quiet, 1);
    expect(env.consumed).toBeCloseTo(METABOLISM.grazeRate * (0.5 + 0.5) * 0.8);
    const leak = METABOLISM.leakRate * (1 - (pop.membrane[0] as number));
    const expected =
      (0.5 + METABOLISM.energyYield * env.consumed) * (1 - leak) - METABOLISM.basalCost - METABOLISM.uptakeCost * 0.5;
    expect(pop.energy[0]).toBeCloseTo(expected, 5);
  });

  it('without production, the membrane decays until the cell dies and spills v', () => {
    const pop = one({ components: 0, energy: 0.1 });
    const env = new StubEnv(0);
    // A decay of 1/16 is exact in float32, so the death tick is exact too.
    const params = { ...quiet, productionCut: true, membraneDecay: 1 / 16 };
    const lifetime = Math.ceil(1 / params.membraneDecay);
    run(pop, env, params, lifetime - 1);
    expect(pop.count).toBe(1);
    run(pop, env, params, 1);
    expect(pop.count).toBe(0);
    const signals = (lifetime - 1) * METABOLISM.signalRate;
    expect(env.emitted).toBeCloseTo(signals + METABOLISM.deathBurst, 6);
  });

  it('with production, components hold the membrane above the division gate', () => {
    const pop = one({ motility: 0 });
    run(pop, new StubEnv(1), { ...quiet, divisionEnergy: Infinity }, 300);
    expect(pop.count).toBe(1);
    expect(pop.membrane[0]).toBeGreaterThan(DEFAULT_AGENT_PARAMS.divisionMembrane);
  });

  it('takes up more nutrient with higher sensing gain', () => {
    const low = new StubEnv(0.6);
    const high = new StubEnv(0.6);
    run(one({ gain: 0.2, motility: 0 }), low, quiet, 1);
    run(one({ gain: 0.8, motility: 0 }), high, quiet, 1);
    expect(high.consumed / low.consumed).toBeCloseTo(1.3 / 0.7);
  });

  it('ages: with ample food and components, an agent still dies of old age', () => {
    const pop = one({ motility: 0, components: 10 });
    const env = new StubEnv(1);
    const params = { ...quiet, divisionEnergy: Infinity };
    run(pop, env, params, 1000);
    expect(pop.count).toBe(1);
    // Repair is capped at repairRate × (1 − M), so death comes once decay passes repairRate.
    run(pop, env, params, 24000);
    expect(pop.count).toBe(0);
  });

  it('steers up the nutrient gradient', () => {
    const pop = one({ heading: Math.PI / 2, gain: 1 });
    run(pop, new StubEnv(1, { x: 0.05, y: 0 }), { ...quiet, divisionEnergy: Infinity }, 20);
    expect(Math.abs(pop.heading[0] as number)).toBeLessThan(0.01);
    expect(pop.x[0]).toBeGreaterThan(32);
  });

  it('divides when energy and membrane pass the gates, splitting resources', () => {
    const pop = one({ energy: 2, components: 0.4, motility: 0 });
    run(pop, new StubEnv(0), quiet, 1);
    expect(pop.count).toBe(2);
    expect(pop.energy[0]).toBeCloseTo(pop.energy[1] as number);
    expect(pop.energy[0]).toBeLessThan(1);
    expect(pop.lineage[1]).toBe(7);
    expect(pop.build[1]).toBe(pop.build[0]);
  });

  it('never grows past the agent cap', () => {
    const pop = new Population(AGENT_CAP);
    const rng = mulberry32(2);
    for (let i = 0; i < AGENT_CAP; i++) {
      pop.add({
        x: rng() * 64, y: rng() * 64, heading: 0, energy: 5, components: 1, membrane: 1, lineage: 1,
        gain: 0.5, motility: 0.5, build: 0.5,
      });
    }
    run(pop, new StubEnv(1), quiet, 1);
    expect(pop.count).toBe(AGENT_CAP);
  });

  it('keeps mutated genes in [0, 1]', () => {
    const rng = mulberry32(3);
    for (let i = 0; i < 1000; i++) {
      const g = mutate(i % 2, 0.5, rng);
      expect(g).toBeGreaterThanOrEqual(0);
      expect(g).toBeLessThanOrEqual(1);
    }
    expect(mutate(0.4, 0, rng)).toBeCloseTo(0.4);
  });
});
