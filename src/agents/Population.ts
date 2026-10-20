/** Everything needed to create one protocell. */
export interface AgentInit {
  x: number;
  y: number;
  heading: number;
  energy: number;
  components: number;
  membrane: number;
  lineage: number;
  gain: number;
  motility: number;
  build: number;
  /** Rolling repair and decay rates (see `ROLLING_WINDOW`); daughters inherit them. */
  repairAvg?: number;
  decayAvg?: number;
}

/** Ticks covered by the rolling repair and decay averages (closure index, SPEC.md section 6). */
export const ROLLING_WINDOW = 50;

/**
 * Protocells stored as a structure of typed arrays. Entries 0..count-1 are
 * live. Removal is deferred: mark `alive` 0, then `compact()` keeps order.
 */
export class Population {
  readonly capacity: number;
  count = 0;
  readonly x: Float32Array;
  readonly y: Float32Array;
  readonly heading: Float32Array;
  /** Energy E. */
  readonly energy: Float32Array;
  /** Components C. */
  readonly components: Float32Array;
  /** Membrane integrity M, 0 to 1. */
  readonly membrane: Float32Array;
  /** Genome: sensing gain, motility, build efficiency, each 0 to 1. */
  readonly gain: Float32Array;
  readonly motility: Float32Array;
  readonly build: Float32Array;
  readonly age: Uint32Array;
  readonly lineage: Uint32Array;
  readonly alive: Uint8Array;
  /** Exponential moving averages of membrane repair and decay per tick. */
  readonly repairAvg: Float32Array;
  readonly decayAvg: Float32Array;

  constructor(capacity: number) {
    this.capacity = capacity;
    this.x = new Float32Array(capacity);
    this.y = new Float32Array(capacity);
    this.heading = new Float32Array(capacity);
    this.energy = new Float32Array(capacity);
    this.components = new Float32Array(capacity);
    this.membrane = new Float32Array(capacity);
    this.gain = new Float32Array(capacity);
    this.motility = new Float32Array(capacity);
    this.build = new Float32Array(capacity);
    this.age = new Uint32Array(capacity);
    this.lineage = new Uint32Array(capacity);
    this.alive = new Uint8Array(capacity);
    this.repairAvg = new Float32Array(capacity);
    this.decayAvg = new Float32Array(capacity);
  }

  /** Append an agent; returns its index, or -1 when at capacity. */
  add(a: AgentInit): number {
    if (this.count >= this.capacity) return -1;
    const i = this.count++;
    this.x[i] = a.x;
    this.y[i] = a.y;
    this.heading[i] = a.heading;
    this.energy[i] = a.energy;
    this.components[i] = a.components;
    this.membrane[i] = a.membrane;
    this.gain[i] = a.gain;
    this.motility[i] = a.motility;
    this.build[i] = a.build;
    this.age[i] = 0;
    this.lineage[i] = a.lineage;
    this.alive[i] = 1;
    this.repairAvg[i] = a.repairAvg ?? 0;
    this.decayAvg[i] = a.decayAvg ?? 0;
    return i;
  }

  /** Drop dead agents, keeping the order of the survivors. */
  compact(): void {
    let w = 0;
    for (let r = 0; r < this.count; r++) {
      if (!this.alive[r]) continue;
      if (w !== r) this.move(r, w);
      w++;
    }
    this.count = w;
  }

  clear(): void {
    this.count = 0;
  }

  /** FNV-1a hash over the bytes of every live agent's state. */
  hash(): string {
    let h = 0x811c9dc5;
    const n = this.count;
    const arrays = [
      this.x, this.y, this.heading, this.energy, this.components, this.membrane,
      this.gain, this.motility, this.build, this.age, this.lineage, this.repairAvg, this.decayAvg,
    ];
    h = fnvWord(h, n);
    for (const arr of arrays) {
      const bytes = new Uint8Array(arr.buffer, arr.byteOffset, n * arr.BYTES_PER_ELEMENT);
      for (let i = 0; i < bytes.length; i++) {
        h ^= bytes[i] as number;
        h = Math.imul(h, 0x01000193);
      }
    }
    return (h >>> 0).toString(16).padStart(8, '0');
  }

  private move(from: number, to: number): void {
    this.x[to] = this.x[from] as number;
    this.y[to] = this.y[from] as number;
    this.heading[to] = this.heading[from] as number;
    this.energy[to] = this.energy[from] as number;
    this.components[to] = this.components[from] as number;
    this.membrane[to] = this.membrane[from] as number;
    this.gain[to] = this.gain[from] as number;
    this.motility[to] = this.motility[from] as number;
    this.build[to] = this.build[from] as number;
    this.age[to] = this.age[from] as number;
    this.lineage[to] = this.lineage[from] as number;
    this.alive[to] = 1;
    this.repairAvg[to] = this.repairAvg[from] as number;
    this.decayAvg[to] = this.decayAvg[from] as number;
  }
}

function fnvWord(h: number, word: number): number {
  for (let b = 0; b < 4; b++) {
    h ^= (word >>> (b * 8)) & 0xff;
    h = Math.imul(h, 0x01000193);
  }
  return h;
}
