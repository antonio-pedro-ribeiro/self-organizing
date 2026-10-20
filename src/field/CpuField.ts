import type { FieldSample } from '../metrics/fieldMetrics';
import { torusDistance } from '../util/torus';
import { initialFieldData } from './initial';
import { DT, DU, DV, LAPLACIAN, type FieldParams } from './presets';

/**
 * CPU reference Gray-Scott on a torus, with the same 9-point Laplacian,
 * explicit Euler step and clamping as the GPU shader, plus the same block
 * readback and update the GPU path uses. Used for headless runs.
 */
export class CpuField {
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

  /** Mean u per block of `blockSize`² cells, row-major, like the GPU readback. */
  blockMeans(blockSize: number, out: Float32Array): void {
    const s = this.size;
    const g = s / blockSize;
    const u = this.u;
    out.fill(0, 0, g * g);
    for (let y = 0; y < s; y++) {
      const brow = Math.floor(y / blockSize) * g;
      let i = y * s;
      for (let bx = 0; bx < g; bx++) {
        let sum = 0;
        for (let k = 0; k < blockSize; k++) sum += u[i++] as number;
        out[brow + bx] = (out[brow + bx] as number) + sum;
      }
    }
    const inv = 1 / (blockSize * blockSize);
    for (let b = 0; b < g * g; b++) out[b] = (out[b] as number) * inv;
  }

  /** Apply a per-block update of RG pairs: u *= R, v += G (clamped), as the GPU apply pass does. */
  applyBlockUpdate(blockSize: number, update: Float32Array): void {
    const s = this.size;
    const g = s / blockSize;
    const { u, v } = this;
    for (let y = 0; y < s; y++) {
      const brow = Math.floor(y / blockSize) * g;
      let i = y * s;
      for (let bx = 0; bx < g; bx++) {
        const factor = update[(brow + bx) * 2] as number;
        const add = update[(brow + bx) * 2 + 1] as number;
        for (let k = 0; k < blockSize; k++, i++) {
          u[i] = clamp01((u[i] as number) * factor);
          v[i] = clamp01((v[i] as number) + add);
        }
      }
    }
  }

  /** Block means of u, v and u·v² into a metrics sample, like the GPU metrics readback. */
  downsample(sample: FieldSample): void {
    const s = this.size;
    const block = s / sample.size;
    const g = sample.size;
    sample.u.fill(0);
    sample.v.fill(0);
    sample.uvv.fill(0);
    for (let y = 0; y < s; y++) {
      const brow = Math.floor(y / block) * g;
      for (let x = 0; x < s; x++) {
        const b = brow + Math.floor(x / block);
        const u = this.u[y * s + x] as number;
        const v = this.v[y * s + x] as number;
        sample.u[b] = (sample.u[b] as number) + u;
        sample.v[b] = (sample.v[b] as number) + v;
        sample.uvv[b] = (sample.uvv[b] as number) + u * v * v;
      }
    }
    const inv = 1 / (block * block);
    for (let b = 0; b < g * g; b++) {
      sample.u[b] = (sample.u[b] as number) * inv;
      sample.v[b] = (sample.v[b] as number) * inv;
      sample.uvv[b] = (sample.uvv[b] as number) * inv;
    }
  }

  /** Reset a disc to the homogeneous state (u = 1, v = 0), wrapping on the torus. */
  wipe(cx: number, cy: number, radius: number): void {
    const s = this.size;
    for (let y = 0; y < s; y++) {
      for (let x = 0; x < s; x++) {
        if (torusDistance(x + 0.5, y + 0.5, cx, cy, s) < radius) {
          this.u[y * s + x] = 1;
          this.v[y * s + x] = 0;
        }
      }
    }
  }
}

function clamp01(x: number): number {
  return x < 0 ? 0 : x > 1 ? 1 : x;
}
