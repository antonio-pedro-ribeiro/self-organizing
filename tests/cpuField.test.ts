import { describe, expect, it } from 'vitest';
import { CpuField } from '../src/field/CpuField';
import { DU, PRESETS } from '../src/field/presets';

function hotShare(field: CpuField): number {
  let hot = 0;
  for (let i = 0; i < field.v.length; i++) if ((field.v[i] as number) > 0.1) hot++;
  return hot / field.v.length;
}

describe('CpuField', () => {
  it('diffuses a sine mode at the rate of the true Laplacian', () => {
    // With v = 0 and F = 0 the reaction vanishes and u' = Du ∇²u.
    const size = 64;
    const field = new CpuField(size);
    const amp = 0.1;
    for (let y = 0; y < size; y++) {
      for (let x = 0; x < size; x++) field.u[y * size + x] = 0.5 + amp * Math.sin((2 * Math.PI * x) / size);
    }
    const steps = 100;
    field.step(steps, { F: 0, k: 0 });
    const kk = (2 * Math.PI) / size;
    const expected = amp * Math.exp(-DU * kk * kk * steps);
    const measured = (field.u[16] as number) - 0.5; // sin peak at x = size / 4
    expect(Math.abs(measured / expected - 1)).toBeLessThan(0.02);
  });

  it('conserves u under pure diffusion', () => {
    const field = CpuField.fromSeed(32, 3);
    field.v.fill(0);
    const sum = (a: Float32Array): number => a.reduce((s, x) => s + x, 0);
    const before = sum(field.u);
    field.step(50, { F: 0, k: 0 });
    expect(sum(field.u)).toBeCloseTo(before, 1);
  });

  it('lets patterns decay when the feed is cut', () => {
    const field = CpuField.fromSeed(64, 1);
    field.step(2000, { F: 0, k: PRESETS.mitosis.k });
    expect(Math.max(...field.v)).toBeLessThan(1e-3);
  });

  it('grows Mitosis spots well beyond the seeded patches', () => {
    const field = CpuField.fromSeed(128, 1);
    const start = hotShare(field);
    field.step(4000, PRESETS.mitosis);
    expect(hotShare(field)).toBeGreaterThan(3 * start);
  });

  it('consumes no more than is there and wraps coordinates', () => {
    const field = new CpuField(8);
    field.u[0] = 0.3;
    expect(field.consume(8.5, 16.2, 1)).toBeCloseTo(0.3);
    expect(field.u[0]).toBe(0);
    expect(field.consume(-0.5, 0, 0.25)).toBeCloseTo(0.25);
    expect(field.u[7]).toBeCloseTo(0.75);
    field.emit(3, 3, 0.4);
    field.emit(3, 3, 0.9);
    expect(field.v[3 * 8 + 3]).toBe(1);
  });

  it('reports the nutrient gradient by central differences', () => {
    const field = new CpuField(8);
    for (let x = 0; x < 8; x++) for (let y = 0; y < 8; y++) field.u[y * 8 + x] = x / 10;
    const g = { x: 0, y: 0 };
    field.nutrientGradient(3, 3, g);
    expect(g.x).toBeCloseTo(0.1);
    expect(g.y).toBeCloseTo(0);
  });
});
