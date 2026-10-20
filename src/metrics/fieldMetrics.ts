import { powerSpectrum2d } from './fft';

/**
 * A downsampled view of the field: block means of u, v and u·v² on a
 * size×size grid (the 128×128 readback of SPEC.md section 6).
 */
export interface FieldSample {
  size: number;
  /** Field cells per sample cell, to report lengths in field cells. */
  cellScale: number;
  u: Float32Array;
  v: Float32Array;
  uvv: Float32Array;
}

export function createFieldSample(size: number, cellScale: number): FieldSample {
  const n = size * size;
  return { size, cellScale, u: new Float32Array(n), v: new Float32Array(n), uvv: new Float32Array(n) };
}

/** Fill a sample from an RGBA readback (R mean u, G mean v, B mean u·v²). */
export function fillFromRgba(sample: FieldSample, rgba: Float32Array): void {
  for (let i = 0; i < sample.size * sample.size; i++) {
    sample.u[i] = rgba[i * 4] as number;
    sample.v[i] = rgba[i * 4 + 1] as number;
    sample.uvv[i] = rgba[i * 4 + 2] as number;
  }
}

function mean(a: Float32Array): number {
  let s = 0;
  for (let i = 0; i < a.length; i++) s += a[i] as number;
  return s / a.length;
}

/** Standard deviation of v: about 0 when homogeneous, rising when patterns form. */
export function orderParameter(sample: FieldSample): number {
  const m = mean(sample.v);
  let s = 0;
  for (let i = 0; i < sample.v.length; i++) s += ((sample.v[i] as number) - m) ** 2;
  return Math.sqrt(s / sample.v.length);
}

/** Mean of u·v²: the irreversible reaction rate, standing in for entropy production. */
export function dissipation(sample: FieldSample): number {
  return mean(sample.uvv);
}

/**
 * Peak of the radially averaged power spectrum of v, as a wavelength in
 * field cells. Returns 0 when the field is flat.
 */
export function patternWavelength(sample: FieldSample): number {
  const n = sample.size;
  const m = mean(sample.v);
  const centred = new Float32Array(n * n);
  for (let i = 0; i < n * n; i++) centred[i] = (sample.v[i] as number) - m;
  const power = powerSpectrum2d(centred, n);
  const half = n / 2;
  const sum = new Float64Array(half + 1);
  const count = new Float64Array(half + 1);
  for (let y = 0; y < n; y++) {
    const ky = y <= half ? y : y - n;
    for (let x = 0; x < n; x++) {
      const kx = x <= half ? x : x - n;
      const k = Math.round(Math.hypot(kx, ky));
      if (k < 1 || k > half) continue;
      sum[k] = (sum[k] as number) + (power[y * n + x] as number);
      count[k] = (count[k] as number) + 1;
    }
  }
  let best = 0;
  let bestPower = 0;
  for (let k = 1; k <= half; k++) {
    const p = (sum[k] as number) / Math.max(1, count[k] as number);
    if (p > bestPower) {
      bestPower = p;
      best = k;
    }
  }
  return best === 0 ? 0 : (n / best) * sample.cellScale;
}
