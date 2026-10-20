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

  it('reads back block means', () => {
    const field = new CpuField(16);
    for (let i = 0; i < 256; i++) field.u[i] = (i % 16) < 8 ? 0.5 : 1;
    const means = new Float32Array(4);
    field.blockMeans(8, means);
    expect(Array.from(means)).toEqual([0.5, 1, 0.5, 1]);
  });

  it('applies block updates smoothly, with v mass exact', () => {
    const field = new CpuField(32);
    field.u.fill(0.5);
    const update = new Float32Array(32);
    for (let b = 0; b < 16; b++) update[b * 2] = 1;
    update[0] = 0.5; // block 0 loses half its u
    update[1] = 0.1; // and gains 0.1 v per cell
    field.applyBlockUpdate(8, update);
    const sum = (a: Float32Array): number => a.reduce((s, x) => s + x, 0);
    expect(sum(field.v)).toBeCloseTo(0.1 * 64, 3);
    expect(sum(field.u)).toBeCloseTo(0.5 * 1024 - 0.25 * 64, 3);
    // Cells nearest block 0's centre (which falls between cells) get almost all of it; far blocks nothing.
    expect(field.v[4 * 32 + 4]).toBeCloseTo(0.1 * (15 / 16) ** 2);
    expect(field.v[20 * 32 + 20]).toBe(0);
    // No square edge: v falls off across the block boundary.
    expect(field.v[4 * 32 + 8]).toBeGreaterThan(0);
    expect(field.v[4 * 32 + 8]).toBeLessThan(0.1);
  });

  it('wipes a disc back to the homogeneous state, across the seam', () => {
    const field = new CpuField(32);
    field.u.fill(0.3);
    field.v.fill(0.2);
    field.wipe(0, 0, 4);
    expect(field.u[0]).toBe(1);
    expect(field.v[31 * 32 + 31]).toBe(0);
    expect(field.u[16 * 32 + 16]).toBeCloseTo(0.3);
  });
});
