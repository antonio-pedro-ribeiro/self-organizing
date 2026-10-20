import type { MetricsLog } from '../metrics/MetricsLog';
import type { SweepConfig, SweepPoint } from '../metrics/sweep';
import type { UiState } from './controls';

/** Test hook installed by main.ts only with `?test` in the URL, for the Playwright tests. */
export interface TestHook {
  state: UiState;
  log: MetricsLog;
  reset: () => void;
  refresh: () => void;
  /** Frames drawn since load; mean frame work and simulation time in ms (includes the GPU with `?sync`). */
  perf: { frames: number; workMs: number; simMs: number; agentMs: number };
  population: () => number;
  ticks: () => number;
  startSweep: (config?: Partial<SweepConfig>) => void;
  sweep: () => { done: boolean; progress: number; points: SweepPoint[] } | null;
  /** v of the latest 128×128 metrics readback, and its pattern wavelength in field cells. */
  fieldV: () => number[];
  wavelength: () => number;
}

declare global {
  interface Window {
    __selforg?: TestHook;
  }
}
