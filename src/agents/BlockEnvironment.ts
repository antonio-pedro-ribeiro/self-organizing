import type { Environment, Vec2 } from './environment';
import { METABOLISM as K } from './params';

/** Field cells per block side. A 512² field gives the 64×64 readback of SPEC.md section 3. */
export const BLOCK_SIZE = 8;

/**
 * The agents' view of the field, one tick at a time: block means of u from
 * a downsampled readback, plus the u taken and v added per block. The same
 * class serves the GPU readback and the headless CPU field, so both run the
 * same coupling.
 */
export class BlockEnvironment implements Environment {
  readonly size: number;
  readonly blockSize: number;
  /** Blocks per side. */
  readonly grid: number;
  readonly cellsPerBlock: number;
  readonly meanU: Float32Array;
  readonly takenU: Float32Array;
  readonly addedV: Float32Array;

  constructor(fieldSize: number, blockSize = BLOCK_SIZE) {
    if (fieldSize % blockSize !== 0) throw new Error('Field size must be a multiple of the block size.');
    this.size = fieldSize;
    this.blockSize = blockSize;
    this.grid = fieldSize / blockSize;
    this.cellsPerBlock = blockSize * blockSize;
    const n = this.grid * this.grid;
    this.meanU = new Float32Array(n);
    this.takenU = new Float32Array(n);
    this.addedV = new Float32Array(n);
  }

  /**
   * Start a tick: load block means of u and clear the deltas. `stride` and
   * `offset` let a GPU RGBA readback be passed directly.
   */
  load(means: ArrayLike<number>, stride = 1, offset = 0): void {
    for (let b = 0; b < this.meanU.length; b++) this.meanU[b] = means[b * stride + offset] as number;
    this.takenU.fill(0);
    this.addedV.fill(0);
  }

  /** Bilinear interpolation between block centres, wrapping on the torus. */
  nutrient(x: number, y: number): number {
    const g = this.grid;
    const fx = x / this.blockSize - 0.5;
    const fy = y / this.blockSize - 0.5;
    const x0 = Math.floor(fx);
    const y0 = Math.floor(fy);
    const tx = fx - x0;
    const ty = fy - y0;
    const c0 = mod(x0, g);
    const c1 = mod(x0 + 1, g);
    const r0 = mod(y0, g) * g;
    const r1 = mod(y0 + 1, g) * g;
    const m = this.meanU;
    const top = (m[r0 + c0] as number) * (1 - tx) + (m[r0 + c1] as number) * tx;
    const bottom = (m[r1 + c0] as number) * (1 - tx) + (m[r1 + c1] as number) * tx;
    return top * (1 - ty) + bottom * ty;
  }

  nutrientGradient(x: number, y: number, out: Vec2): void {
    const h = this.blockSize;
    out.x = (this.nutrient(x + h, y) - this.nutrient(x - h, y)) / (2 * h);
    out.y = (this.nutrient(x, y + h) - this.nutrient(x, y - h)) / (2 * h);
  }

  /** Graze the agent's block, never taking more than a set share of it per tick. */
  consume(x: number, y: number, amount: number): number {
    const b = this.block(x, y);
    const limit = K.maxGrazeShare * (this.meanU[b] as number) * this.cellsPerBlock;
    const taken = Math.min(Math.max(amount, 0), Math.max(0, limit - (this.takenU[b] as number)));
    this.takenU[b] = (this.takenU[b] as number) + taken;
    return taken;
  }

  emit(x: number, y: number, amount: number): void {
    const b = this.block(x, y);
    this.addedV[b] = (this.addedV[b] as number) + amount;
  }

  /**
   * Per-block field update as RG pairs: R multiplies u (the block loses the
   * mass taken), G is the v added per cell. The field interpolates both
   * between block centres, which keeps total v exact, and u exact wherever
   * a block's u is uniform.
   */
  writeUpdate(out: Float32Array): void {
    for (let b = 0; b < this.meanU.length; b++) {
      const mass = (this.meanU[b] as number) * this.cellsPerBlock;
      const taken = this.takenU[b] as number;
      out[b * 2] = mass > 0 ? Math.max(0, 1 - taken / mass) : 1;
      out[b * 2 + 1] = (this.addedV[b] as number) / this.cellsPerBlock;
    }
  }

  private block(x: number, y: number): number {
    const g = this.grid;
    return mod(Math.floor(y / this.blockSize), g) * g + mod(Math.floor(x / this.blockSize), g);
  }
}

function mod(a: number, n: number): number {
  const r = a % n;
  return r < 0 ? r + n : r;
}
