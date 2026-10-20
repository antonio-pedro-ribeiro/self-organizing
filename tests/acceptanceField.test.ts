import { describe, expect, it } from 'vitest';
import { CpuField } from '../src/field/CpuField';
import { perturbationPatches } from '../src/field/initial';
import { PRESETS } from '../src/field/presets';
import { createFieldSample, orderParameter, patternWavelength, pearson } from '../src/metrics/fieldMetrics';
import { abruptSteps, DEFAULT_SWEEP, hysteresis, SweepRunner } from '../src/metrics/sweep';
import { mulberry32 } from '../src/util/prng';

/**
 * Headless acceptance tests 2 and 3 (SPEC.md section 7) on the CPU reference
 * field, 128², field only (both concern the field). The browser versions
 * are in tests/e2e. One tick is 8 field steps; F eases as in the app.
 */
const SIZE = 128;
const STEPS_PER_TICK = 8;
const EASE = 1 - Math.exp(-1 / 60 / 0.12);
const LONG_MS = 600_000;

describe('test 2: bifurcation', () => {
  it('sweeping F up then down at fixed k shows at least one abrupt change (>3× in one step)', () => {
    const field = CpuField.fromSeed(SIZE, 1);
    const sample = createFieldSample(SIZE, 1);
    const rng = mulberry32(2);
    const runner = new SweepRunner(DEFAULT_SWEEP, 0);
    const params = { F: runner.currentF, k: PRESETS.mitosis.k };
    let step = -1;
    for (let t = 1; !runner.done; t++) {
      if (runner.step !== step) {
        step = runner.step;
        field.seedPatches(perturbationPatches(SIZE, rng, DEFAULT_SWEEP.perturbPatches));
      }
      params.F += (runner.currentF - params.F) * EASE;
      field.step(STEPS_PER_TICK, params);
      if (t % 10 === 0) {
        field.downsample(sample);
        runner.observe(t, orderParameter(sample));
      }
    }
    const up = runner.points.filter((p) => p.dir === 'up');
    const down = runner.points.filter((p) => p.dir === 'down');
    const jumpsUp = abruptSteps(up.map((p) => p.order));
    const jumpsDown = abruptSteps(down.map((p) => p.order));
    const fmt = (ps: typeof up): string => ps.map((p) => `${p.F.toFixed(4)}:${p.order.toFixed(3)}`).join(' ');
    console.info(`test 2 up:   ${fmt(up)}`);
    console.info(`test 2 down: ${fmt(down)}`);
    console.info(`test 2: ${jumpsUp.length} abrupt up, ${jumpsDown.length} abrupt down; hysteresis ${JSON.stringify(hysteresis(runner.points))}`);
    expect(up.length).toBe(down.length);
    expect(jumpsUp.length + jumpsDown.length).toBeGreaterThan(0);
  }, LONG_MS);
});

describe('test 3: order through fluctuations', () => {
  it('10 seeds give pairwise uncorrelated fields with wavelengths within 15%', () => {
    const ticks = 1500;
    const fields: Float32Array[] = [];
    const wavelengths: number[] = [];
    for (let seed = 1; seed <= 10; seed++) {
      const field = CpuField.fromSeed(SIZE, seed);
      for (let t = 0; t < ticks; t++) field.step(STEPS_PER_TICK, PRESETS.mitosis);
      const sample = createFieldSample(SIZE, 1);
      field.downsample(sample);
      fields.push(Float32Array.from(sample.v));
      wavelengths.push(patternWavelength(sample));
    }
    let maxR = 0;
    for (let i = 0; i < fields.length; i++) {
      for (let j = i + 1; j < fields.length; j++) {
        maxR = Math.max(maxR, Math.abs(pearson(fields[i] as Float32Array, fields[j] as Float32Array)));
      }
    }
    const median = [...wavelengths].sort((a, b) => a - b)[5] as number;
    const maxDev = Math.max(...wavelengths.map((w) => Math.abs(w / median - 1)));
    console.info(
      `test 3: max |r| ${maxR.toFixed(3)}; wavelengths ${wavelengths.map((w) => w.toFixed(1)).join(', ')} ` +
        `(median ${median.toFixed(1)}, max deviation ${(maxDev * 100).toFixed(1)}%)`,
    );
    expect(maxR).toBeLessThan(0.2);
    expect(maxDev).toBeLessThanOrEqual(0.15);
  }, LONG_MS);
});
