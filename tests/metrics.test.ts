import { describe, expect, it } from 'vitest';
import { Population } from '../src/agents/Population';
import { agentMetrics } from '../src/metrics/agentMetrics';
import { fft } from '../src/metrics/fft';
import {
  createFieldSample,
  dissipation,
  orderParameter,
  patternWavelength,
} from '../src/metrics/fieldMetrics';
import { MetricsLog, METRIC_COLUMNS, type MetricSample } from '../src/metrics/MetricsLog';
import { mulberry32 } from '../src/util/prng';

describe('fft', () => {
  it('matches a direct DFT', () => {
    const n = 16;
    const rng = mulberry32(4);
    const x = Array.from({ length: n }, () => rng() - 0.5);
    const re = Float64Array.from(x);
    const im = new Float64Array(n);
    fft(re, im);
    for (let k = 0; k < n; k++) {
      let sr = 0;
      let si = 0;
      for (let t = 0; t < n; t++) {
        sr += (x[t] as number) * Math.cos((-2 * Math.PI * k * t) / n);
        si += (x[t] as number) * Math.sin((-2 * Math.PI * k * t) / n);
      }
      expect(re[k]).toBeCloseTo(sr, 10);
      expect(im[k]).toBeCloseTo(si, 10);
    }
  });
});

describe('field metrics', () => {
  it('order parameter is 0 for a flat field and the std of v otherwise', () => {
    const s = createFieldSample(8, 1);
    s.v.fill(0.3);
    expect(orderParameter(s)).toBeCloseTo(0);
    for (let i = 0; i < 64; i++) s.v[i] = i % 2 === 0 ? 0 : 0.2;
    expect(orderParameter(s)).toBeCloseTo(0.1);
  });

  it('dissipation is the mean of u·v²', () => {
    const s = createFieldSample(4, 1);
    s.uvv.fill(0.02);
    s.uvv[0] = 0.18;
    expect(dissipation(s)).toBeCloseTo(0.03);
  });

  it('finds the wavelength of a stripe pattern, in field cells', () => {
    const size = 128;
    const s = createFieldSample(size, 4);
    for (let y = 0; y < size; y++) {
      for (let x = 0; x < size; x++) s.v[y * size + x] = 0.2 + 0.1 * Math.sin((2 * Math.PI * 8 * x) / size);
    }
    expect(patternWavelength(s)).toBeCloseTo((size / 8) * 4);
    s.v.fill(0.1);
    expect(patternWavelength(s)).toBe(0);
  });
});

describe('agent metrics', () => {
  it('counts lineages, mean energy and the closure index', () => {
    const pop = new Population(4);
    const base = { x: 0, y: 0, heading: 0, components: 0, membrane: 1, gain: 0.5, motility: 0.5, build: 0.5 };
    pop.add({ ...base, energy: 1, lineage: 1, repairAvg: 0.01, decayAvg: 0.01 });
    pop.add({ ...base, energy: 0.5, lineage: 1, repairAvg: 0.002, decayAvg: 0.01 });
    pop.add({ ...base, energy: 0, lineage: 2, repairAvg: 0.02, decayAvg: 0.01 });
    const m = agentMetrics(pop);
    expect(m.population).toBe(3);
    expect(m.lineages).toBe(2);
    expect(m.meanEnergy).toBeCloseTo(0.5);
    expect(m.closureIndex).toBeCloseTo(2 / 3);
  });

  it('is all zeros for an empty population', () => {
    expect(agentMetrics(new Population(1))).toEqual({ population: 0, lineages: 0, meanEnergy: 0, closureIndex: 0 });
  });
});

describe('MetricsLog', () => {
  const row = (tick: number): MetricSample => {
    const r = {} as MetricSample;
    for (const c of METRIC_COLUMNS) r[c] = 0;
    r.tick = tick;
    r.population = tick * 2;
    return r;
  };

  it('keeps the newest samples in order when it wraps', () => {
    const log = new MetricsLog(3);
    for (let t = 1; t <= 5; t++) log.push(row(t));
    expect(log.length).toBe(3);
    expect(log.series('tick')).toEqual([3, 4, 5]);
    expect(log.series('population', 2)).toEqual([8, 10]);
    expect(log.latest()?.tick).toBe(5);
  });

  it('writes CSV with a header and one line per sample', () => {
    const log = new MetricsLog(10);
    log.push(row(1));
    log.push(row(2));
    const lines = log.toCsv().trim().split('\n');
    expect(lines[0]).toBe(METRIC_COLUMNS.join(','));
    expect(lines).toHaveLength(3);
    expect(lines[2]?.split(',')[0]).toBe('2');
  });
});
