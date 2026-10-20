/** Columns recorded per sample, in CSV order. */
export const METRIC_COLUMNS = [
  'tick',
  'timeS',
  'F',
  'k',
  'population',
  'lineages',
  'meanEnergy',
  'closureIndex',
  'orderParameter',
  'dissipation',
  'wavelength',
] as const;

export type MetricName = (typeof METRIC_COLUMNS)[number];
export type MetricSample = Record<MetricName, number>;

/** Rolling buffer size (SPEC.md section 6). */
export const LOG_CAPACITY = 20_000;

/** Rolling in-memory metrics buffer, one typed ring per column. */
export class MetricsLog {
  readonly capacity: number;
  private readonly columns: Record<MetricName, Float64Array>;
  private start = 0;
  length = 0;

  constructor(capacity = LOG_CAPACITY) {
    this.capacity = capacity;
    const cols = {} as Record<MetricName, Float64Array>;
    for (const name of METRIC_COLUMNS) cols[name] = new Float64Array(capacity);
    this.columns = cols;
  }

  push(sample: MetricSample): void {
    const slot = (this.start + this.length) % this.capacity;
    for (const name of METRIC_COLUMNS) (this.columns[name] as Float64Array)[slot] = sample[name];
    if (this.length < this.capacity) this.length++;
    else this.start = (this.start + 1) % this.capacity;
  }

  clear(): void {
    this.start = 0;
    this.length = 0;
  }

  /** The last `count` values of one column, oldest first. */
  series(name: MetricName, count = this.length): number[] {
    const n = Math.min(count, this.length);
    const col = this.columns[name];
    const out = new Array<number>(n);
    for (let i = 0; i < n; i++) out[i] = col[(this.start + this.length - n + i) % this.capacity] as number;
    return out;
  }

  latest(): MetricSample | undefined {
    if (this.length === 0) return undefined;
    const slot = (this.start + this.length - 1) % this.capacity;
    const out = {} as MetricSample;
    for (const name of METRIC_COLUMNS) out[name] = this.columns[name][slot] as number;
    return out;
  }

  toCsv(): string {
    const lines: string[] = [METRIC_COLUMNS.join(',')];
    for (let i = 0; i < this.length; i++) {
      const slot = (this.start + i) % this.capacity;
      lines.push(METRIC_COLUMNS.map((name) => String(this.columns[name][slot])).join(','));
    }
    return lines.join('\n') + '\n';
  }
}
