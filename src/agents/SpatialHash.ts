/**
 * Uniform grid over a torus for neighbor queries, rebuilt each tick with a
 * counting sort. Items within a cell keep index order, so queries are
 * deterministic.
 */
export class SpatialHash {
  readonly worldSize: number;
  readonly dim: number;
  readonly cellSize: number;
  private readonly cellStart: Int32Array;
  private readonly cellOf: Int32Array;
  private readonly items: Int32Array;

  /** `minCellSize` must be at least the largest query radius. */
  constructor(worldSize: number, minCellSize: number, capacity: number) {
    this.worldSize = worldSize;
    this.dim = Math.max(3, Math.floor(worldSize / minCellSize));
    if (worldSize / this.dim < minCellSize) {
      throw new Error('World is too small for this cell size: need at least 3 cells per side.');
    }
    this.cellSize = worldSize / this.dim;
    this.cellStart = new Int32Array(this.dim * this.dim + 1);
    this.cellOf = new Int32Array(capacity);
    this.items = new Int32Array(capacity);
  }

  build(xs: Float32Array, ys: Float32Array, count: number): void {
    const start = this.cellStart;
    start.fill(0);
    for (let i = 0; i < count; i++) {
      const c = this.cell(xs[i] as number, ys[i] as number);
      this.cellOf[i] = c;
      start[c + 1] = (start[c + 1] as number) + 1;
    }
    for (let c = 0; c < this.dim * this.dim; c++) {
      start[c + 1] = (start[c + 1] as number) + (start[c] as number);
    }
    const fill = start.slice(0, this.dim * this.dim);
    for (let i = 0; i < count; i++) {
      const c = this.cellOf[i] as number;
      this.items[fill[c] as number] = i;
      fill[c] = (fill[c] as number) + 1;
    }
  }

  /**
   * Write indices of all items in the 3×3 block of cells around (x, y) into
   * `out`; returns how many were written (at most `out.length`). Callers
   * filter by exact distance.
   */
  query(x: number, y: number, out: Int32Array): number {
    const d = this.dim;
    const cx = this.coord(x);
    const cy = this.coord(y);
    let n = 0;
    for (let dy = -1; dy <= 1; dy++) {
      const row = ((cy + dy + d) % d) * d;
      for (let dx = -1; dx <= 1; dx++) {
        const c = row + ((cx + dx + d) % d);
        const end = this.cellStart[c + 1] as number;
        for (let k = this.cellStart[c] as number; k < end && n < out.length; k++) {
          out[n++] = this.items[k] as number;
        }
      }
    }
    return n;
  }

  private cell(x: number, y: number): number {
    return this.coord(y) * this.dim + this.coord(x);
  }

  private coord(p: number): number {
    const c = Math.floor(p / this.cellSize) % this.dim;
    return c < 0 ? c + this.dim : c;
  }
}
