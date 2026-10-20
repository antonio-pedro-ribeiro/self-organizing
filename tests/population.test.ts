import { describe, expect, it } from 'vitest';
import { Population, type AgentInit } from '../src/agents/Population';

const agent = (x: number): AgentInit => ({
  x,
  y: 0,
  heading: 0,
  energy: 0.5,
  components: 0.2,
  membrane: 1,
  lineage: x,
  gain: 0.5,
  motility: 0.5,
  build: 0.5,
});

describe('Population', () => {
  it('compacts dead agents and keeps survivor order', () => {
    const pop = new Population(10);
    for (let i = 0; i < 5; i++) pop.add(agent(i));
    pop.alive[1] = 0;
    pop.alive[3] = 0;
    pop.compact();
    expect(pop.count).toBe(3);
    expect(Array.from(pop.x.subarray(0, 3))).toEqual([0, 2, 4]);
    expect(Array.from(pop.lineage.subarray(0, 3))).toEqual([0, 2, 4]);
  });

  it('refuses agents beyond capacity', () => {
    const pop = new Population(2);
    expect(pop.add(agent(0))).toBe(0);
    expect(pop.add(agent(1))).toBe(1);
    expect(pop.add(agent(2))).toBe(-1);
    expect(pop.count).toBe(2);
  });

  it('hashes equal states equally and detects any change', () => {
    const a = new Population(4);
    const b = new Population(4);
    a.add(agent(1));
    b.add(agent(1));
    expect(a.hash()).toBe(b.hash());
    b.energy[0] = 0.5000001;
    expect(a.hash()).not.toBe(b.hash());
  });
});
