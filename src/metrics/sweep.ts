/** Automatic sweep of F at fixed k, up then down (SPEC.md sections 5 and 7, test 2). */
export interface SweepConfig {
  from: number;
  to: number;
  step: number;
  /** Ticks to hold each F value before moving on. */
  holdTicks: number;
  /** The order parameter is averaged over the last this many ticks of each hold. */
  measureTicks: number;
  /** Seeded perturbation patches added at the start of each step (0 for none). */
  perturbPatches: number;
}

export const DEFAULT_SWEEP: SweepConfig = {
  from: 0.02,
  to: 0.07,
  step: 0.0025,
  holdTicks: 300,
  measureTicks: 100,
  perturbPatches: 4,
};

export type SweepDirection = 'up' | 'down';

export interface SweepPoint {
  F: number;
  dir: SweepDirection;
  order: number;
}

/** F values for the sweep: from → to, then to → from. The top value is held once on each branch. */
export function sweepValues(cfg: SweepConfig): { F: number; dir: SweepDirection }[] {
  const n = Math.round((cfg.to - cfg.from) / cfg.step);
  const up = Array.from({ length: n + 1 }, (_, i) => cfg.from + i * cfg.step);
  return [...up.map((F) => ({ F, dir: 'up' as const })), ...[...up].reverse().map((F) => ({ F, dir: 'down' as const }))];
}

/** Drives a sweep from periodic measurements; works the same headless and in the browser. */
export class SweepRunner {
  readonly config: SweepConfig;
  readonly points: SweepPoint[] = [];
  private readonly schedule: { F: number; dir: SweepDirection }[];
  private index = 0;
  private stepStart: number;
  private sum = 0;
  private count = 0;

  constructor(config: SweepConfig, startTick: number) {
    this.config = config;
    this.schedule = sweepValues(config);
    this.stepStart = startTick;
  }

  get done(): boolean {
    return this.index >= this.schedule.length;
  }

  /** Target F right now (the last value once done). */
  get currentF(): number {
    const s = this.schedule[Math.min(this.index, this.schedule.length - 1)];
    return s ? s.F : this.config.from;
  }

  get progress(): number {
    return this.index / this.schedule.length;
  }

  /** Index of the current F step; it changes when a new step (and its perturbation) starts. */
  get step(): number {
    return this.index;
  }

  /** Record an order-parameter measurement taken at `tick`; moves to the next F when the hold is over. */
  observe(tick: number, order: number): void {
    if (this.done) return;
    const elapsed = tick - this.stepStart;
    if (elapsed > this.config.holdTicks - this.config.measureTicks) {
      this.sum += order;
      this.count++;
    }
    if (elapsed >= this.config.holdTicks) {
      const s = this.schedule[this.index] as { F: number; dir: SweepDirection };
      this.points.push({ F: s.F, dir: s.dir, order: this.count > 0 ? this.sum / this.count : order });
      this.index++;
      this.stepStart = tick;
      this.sum = 0;
      this.count = 0;
    }
  }
}

/**
 * Below this, the order parameter counts as zero when comparing steps, so
 * ratios between two near-homogeneous states are not reported as abrupt.
 */
export const ORDER_FLOOR = 1e-3;

/** Indices i where order changes by more than `factor`× between point i−1 and i. */
export function abruptSteps(orders: number[], factor = 3): number[] {
  const out: number[] = [];
  for (let i = 1; i < orders.length; i++) {
    const a = Math.max(orders[i - 1] as number, ORDER_FLOOR);
    const b = Math.max(orders[i] as number, ORDER_FLOOR);
    if (b / a > factor || a / b > factor) out.push(i);
  }
  return out;
}

export interface HysteresisReport {
  /** F at the largest jump on each branch (undefined if none above the factor). */
  upTransitionF?: number;
  downTransitionF?: number;
  /** Largest |up − down| order difference at the same F, and where. */
  maxGap: number;
  maxGapF: number;
}

/** Summarize the two branches. Hysteresis is reported, never tuned in. */
export function hysteresis(points: SweepPoint[], factor = 3): HysteresisReport {
  const up = points.filter((p) => p.dir === 'up');
  const down = points.filter((p) => p.dir === 'down');
  const transition = (branch: SweepPoint[]): number | undefined => {
    const steps = abruptSteps(branch.map((p) => p.order), factor);
    if (steps.length === 0) return undefined;
    const ratio = (i: number): number => {
      const a = Math.max(branch[i - 1]?.order ?? 0, ORDER_FLOOR);
      const b = Math.max(branch[i]?.order ?? 0, ORDER_FLOOR);
      return Math.max(a / b, b / a);
    };
    const best = steps.reduce((m, i) => (ratio(i) > ratio(m) ? i : m));
    return ((branch[best - 1]?.F ?? 0) + (branch[best]?.F ?? 0)) / 2;
  };
  let maxGap = 0;
  let maxGapF = 0;
  for (const u of up) {
    const d = down.find((p) => Math.abs(p.F - u.F) < 1e-9);
    if (d && Math.abs(u.order - d.order) > maxGap) {
      maxGap = Math.abs(u.order - d.order);
      maxGapF = u.F;
    }
  }
  return { upTransitionF: transition(up), downTransitionF: transition(down), maxGap, maxGapF };
}
