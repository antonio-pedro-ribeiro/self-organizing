import { describe, expect, it } from 'vitest';
import { createFieldSample, patternWavelength, pearson } from '../src/metrics/fieldMetrics';
import { abruptSteps, hysteresis, SweepRunner, sweepValues, type SweepPoint } from '../src/metrics/sweep';
import { createDefaultState } from '../src/ui/controls';
import { stateFromJson, stateToJson } from '../src/ui/stateJson';
import { mulberry32 } from '../src/util/prng';

describe('F sweep', () => {
  const cfg = { from: 0.02, to: 0.03, step: 0.005, holdTicks: 30, measureTicks: 10, perturbPatches: 0 };

  it('goes up then down, holding the top value once per branch', () => {
    const values = sweepValues(cfg);
    expect(values.map((v) => v.dir)).toEqual(['up', 'up', 'up', 'down', 'down', 'down']);
    expect(values.map((v) => Number(v.F.toFixed(4)))).toEqual([0.02, 0.025, 0.03, 0.03, 0.025, 0.02]);
  });

  it('averages the order parameter over the end of each hold', () => {
    const runner = new SweepRunner(cfg, 0);
    for (let t = 10; t <= 6 * 30; t += 10) runner.observe(t, runner.currentF * 100 + (t % 30 === 0 ? 1 : 0));
    expect(runner.done).toBe(true);
    expect(runner.points).toHaveLength(6);
    // Measurements at elapsed 30 only (the last 10 ticks of each 30-tick hold).
    expect(runner.points[0]?.order).toBeCloseTo(3);
  });

  it('flags steps that change more than 3× and ignores noise near zero', () => {
    expect(abruptSteps([0.05, 0.06, 0.01, 0.011])).toEqual([2]);
    expect(abruptSteps([1e-6, 5e-5, 2e-4])).toEqual([]);
  });

  it('reports transitions on each branch and the largest gap between them', () => {
    const points: SweepPoint[] = [
      { F: 0.02, dir: 'up', order: 0 },
      { F: 0.03, dir: 'up', order: 0 },
      { F: 0.04, dir: 'up', order: 0.05 },
      { F: 0.04, dir: 'down', order: 0.05 },
      { F: 0.03, dir: 'down', order: 0.05 },
      { F: 0.02, dir: 'down', order: 0 },
    ];
    const r = hysteresis(points);
    expect(r.upTransitionF).toBeCloseTo(0.035);
    expect(r.downTransitionF).toBeCloseTo(0.025);
    expect(r.maxGap).toBeCloseTo(0.05);
    expect(r.maxGapF).toBeCloseTo(0.03);
  });
});

describe('pattern statistics for test 3', () => {
  it('pearson is 1 for identical fields, -1 for inverted, near 0 for independent noise', () => {
    const rng = mulberry32(2);
    const a = Float32Array.from({ length: 4096 }, () => rng());
    const b = Float32Array.from({ length: 4096 }, () => rng());
    expect(pearson(a, a)).toBeCloseTo(1);
    expect(pearson(a, a.map((x) => 1 - x))).toBeCloseTo(-1);
    expect(Math.abs(pearson(a, b))).toBeLessThan(0.05);
  });

  it('refines the wavelength peak between frequency bins', () => {
    const size = 128;
    const s = createFieldSample(size, 1);
    for (let y = 0; y < size; y++) {
      for (let x = 0; x < size; x++) {
        s.v[y * size + x] = Math.sin((2 * Math.PI * 8 * x) / size) + 0.8 * Math.sin((2 * Math.PI * 9 * x) / size);
      }
    }
    const w = patternWavelength(s);
    expect(w).toBeLessThan(size / 8);
    expect(w).toBeGreaterThan(size / 9);
  });
});

describe('state JSON', () => {
  it('round-trips parameters and seed', () => {
    const a = createDefaultState();
    a.seed = 42;
    a.F = 0.05;
    a.agents.mutationSigma = 0.05;
    a.view = 4;
    const b = stateFromJson(stateToJson(a), createDefaultState());
    expect(b.seed).toBe(42);
    expect(b.F).toBe(0.05);
    expect(b.agents.mutationSigma).toBe(0.05);
    expect(b.view).toBe(4);
  });

  it('keeps missing fields, ignores unknown ones', () => {
    const base = createDefaultState();
    const b = stateFromJson('{"seed": 7, "somethingElse": 1}', base);
    expect(b.seed).toBe(7);
    expect(b.F).toBe(base.F);
  });

  it('rejects out-of-range or mistyped values and changes nothing', () => {
    const base = createDefaultState();
    expect(() => stateFromJson('{"F": 0.5, "view": 9, "agents": {"sensingNoise": "x"}}', base)).toThrow(
      /F must be.*\n.*view must be.*\n.*agents.sensingNoise/s,
    );
    expect(() => stateFromJson('not json', base)).toThrow(/not valid JSON/);
    expect(() => stateFromJson('{"version": 2}', base)).toThrow(/version/);
    expect(base.F).toBe(createDefaultState().F);
  });
});
