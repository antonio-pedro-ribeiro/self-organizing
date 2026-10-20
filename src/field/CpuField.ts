import type { Environment, Vec2 } from '../agents/environment';
import { initialFieldData } from './initial';
import { DT, DU, DV, LAPLACIAN, type FieldParams } from './presets';

/**
 * CPU reference Gray-Scott on a torus, with the same 9-point Laplacian,
 * explicit Euler step and clamping as the GPU shader. Used for headless runs.
 */
export class CpuField implements Environment {
  readonly size: number;
  u: Float32Array;
  v: Float32Array;
  private nextU: Float32Array;
  private nextV: Float32Array;

  constructor(size: number) {
    this.size = size;
    const n = size * size;
    this.u = new Float32Array(n).fill(1);
    this.v = new Float32Array(n);
    this.nextU = new Float32Array(n);
    this.nextV = new Float32Array(n);
  }

  /** Field with the same seeded initial state as the GPU field. */
  static fromSeed(size: number, seed: number): CpuField {
    const field = new CpuField(size);
    const data = initialFieldData(size, seed);
    for (let i = 0; i < size * size; i++) {
      field.u[i] = data[i * 4] as number;
      field.v[i] = data[i * 4 + 1] as number;
    }
    return field;
  }

  step(steps: number, params: FieldParams): void {
    const s = this.size;
    const { F, k } = params;
    const { edge, corner, centre } = LAPLACIAN;
    for (let n = 0; n < steps; n++) {
      const u = this.u;
      const v = this.v;
      const nu = this.nextU;
      const nv = this.nextV;
      for (let y = 0; y < s; y++) {
        const row = y * s;
        const up = (y === 0 ? s - 1 : y - 1) * s;
        const dn = (y === s - 1 ? 0 : y + 1) * s;
        for (let x = 0; x < s; x++) {
          const l = x === 0 ? s - 1 : x - 1;
          const r = x === s - 1 ? 0 : x + 1;
          const i = row + x;
          const cu = u[i] as number;
          const cv = v[i] as number;
          const lapU =
            centre * cu +
            edge * ((u[row + l] as number) + (u[row + r] as number) + (u[up + x] as number) + (u[dn + x] as number)) +
            corner * ((u[up + l] as number) + (u[up + r] as number) + (u[dn + l] as number) + (u[dn + r] as number));
          const lapV =
            centre * cv +
            edge * ((v[row + l] as number) + (v[row + r] as number) + (v[up + x] as number) + (v[dn + x] as number)) +
            corner * ((v[up + l] as number) + (v[up + r] as number) + (v[dn + l] as number) + (v[dn + r] as number));
          const uvv = cu * cv * cv;
          nu[i] = clamp01(cu + DT * (DU * lapU - uvv + F * (1 - cu)));
          nv[i] = clamp01(cv + DT * (DV * lapV + uvv - (F + k) * cv));
        }
      }
      this.u = nu;
      this.v = nv;
      this.nextU = u;
      this.nextV = v;
    }
  }

  nutrient(x: number, y: number): number {
    return this.u[this.index(x, y)] as number;
  }

  nutrientGradient(x: number, y: number, out: Vec2): void {
    const s = this.size;
    const cx = wrapCell(x, s);
    const cy = wrapCell(y, s);
    const u = this.u;
    const l = cx === 0 ? s - 1 : cx - 1;
    const r = cx === s - 1 ? 0 : cx + 1;
    const up = cy === 0 ? s - 1 : cy - 1;
    const dn = cy === s - 1 ? 0 : cy + 1;
    out.x = 0.5 * ((u[cy * s + r] as number) - (u[cy * s + l] as number));
    out.y = 0.5 * ((u[dn * s + cx] as number) - (u[up * s + cx] as number));
  }

  consume(x: number, y: number, amount: number): number {
    const i = this.index(x, y);
    const taken = Math.min(Math.max(amount, 0), this.u[i] as number);
    this.u[i] = (this.u[i] as number) - taken;
    return taken;
  }

  emit(x: number, y: number, amount: number): void {
    const i = this.index(x, y);
    this.v[i] = clamp01((this.v[i] as number) + amount);
  }

  private index(x: number, y: number): number {
    return wrapCell(y, this.size) * this.size + wrapCell(x, this.size);
  }
}

function wrapCell(p: number, size: number): number {
  const c = Math.floor(p) % size;
  return c < 0 ? c + size : c;
}

function clamp01(x: number): number {
  return x < 0 ? 0 : x > 1 ? 1 : x;
}
