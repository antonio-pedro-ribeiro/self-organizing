import { describe, expect, it } from 'vitest';
import { BlockEnvironment } from '../src/agents/BlockEnvironment';
import { METABOLISM } from '../src/agents/params';
import { CpuField } from '../src/field/CpuField';

describe('BlockEnvironment', () => {
  it('interpolates nutrient between block centres and wraps', () => {
    const env = new BlockEnvironment(32, 8);
    const means = new Float32Array(16).fill(0.5);
    means[0] = 1;
    env.load(means);
    expect(env.nutrient(4, 4)).toBeCloseTo(1);
    expect(env.nutrient(8, 4)).toBeCloseTo(0.75);
    expect(env.nutrient(0, 4)).toBeCloseTo(0.75); // halfway to the wrapped neighbour
    const g = { x: 0, y: 0 };
    env.nutrientGradient(12, 4, g);
    expect(g.x).toBeLessThan(0);
  });

  it('caps grazing per block and conserves u mass through the update', () => {
    const size = 16;
    const field = new CpuField(size);
    field.u.fill(0.6);
    const env = new BlockEnvironment(size, 8);
    const means = new Float32Array(4);
    field.blockMeans(8, means);
    env.load(means);
    const blockMass = 0.6 * 64;
    const first = env.consume(1, 1, 10);
    const second = env.consume(2, 2, 1000);
    expect(first).toBe(10);
    expect(first + second).toBeCloseTo(METABOLISM.maxGrazeShare * blockMass, 4);
    env.emit(9, 9, 6.4);
    const update = new Float32Array(8);
    env.writeUpdate(update);
    field.applyBlockUpdate(8, update);
    let u0 = 0;
    for (let y = 0; y < 8; y++) for (let x = 0; x < 8; x++) u0 += field.u[y * size + x] as number;
    expect(u0).toBeCloseTo(blockMass - first - second, 3);
    expect(field.v[9 * size + 9]).toBeCloseTo(0.1);
  });

  it('starts every tick with clean deltas', () => {
    const env = new BlockEnvironment(16, 8);
    env.load(new Float32Array(4).fill(1));
    env.consume(0, 0, 5);
    env.load(new Float32Array(4).fill(1));
    const update = new Float32Array(8);
    env.writeUpdate(update);
    expect(update[0]).toBe(1);
  });
});
