import type { Population } from '../agents/Population';
import type { FieldParams } from '../field/presets';
import { agentMetrics } from './agentMetrics';
import { dissipation, orderParameter, patternWavelength, type FieldSample } from './fieldMetrics';
import type { MetricSample } from './MetricsLog';

/** Metrics are computed every this many frames (SPEC.md section 6). */
export const METRICS_EVERY = 10;
/** Side of the field readback used for metrics. */
export const METRICS_GRID = 128;

/** One row of the metrics log from a field readback and the population. */
export function takeSample(
  tick: number,
  timeS: number,
  params: FieldParams,
  field: FieldSample,
  pop: Population,
): MetricSample {
  return {
    tick,
    timeS,
    F: params.F,
    k: params.k,
    ...agentMetrics(pop),
    orderParameter: orderParameter(field),
    dissipation: dissipation(field),
    wavelength: patternWavelength(field),
  };
}
