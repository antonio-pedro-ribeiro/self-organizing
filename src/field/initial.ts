import { mulberry32 } from '../util/prng';

/**
 * Initial Gray-Scott state as RGBA float data (u in R, v in G).
 * Uniform nutrient (u = 1, v = 0) plus seeded square patches of the
 * autocatalytic species. The same seed always gives the same field.
 */
export function initialFieldData(size: number, seed: number, patches = 24): Float32Array {
  const rng = mulberry32(seed);
  const data = new Float32Array(size * size * 4);
  for (let i = 0; i < size * size; i++) {
    data[i * 4] = 1;
    data[i * 4 + 3] = 1;
  }
  const half = Math.max(2, Math.round(size / 85));
  for (let n = 0; n < patches; n++) {
    const cx = Math.floor(rng() * size);
    const cy = Math.floor(rng() * size);
    for (let dy = -half; dy <= half; dy++) {
      for (let dx = -half; dx <= half; dx++) {
        const x = (cx + dx + size) % size;
        const y = (cy + dy + size) % size;
        const i = (y * size + x) * 4;
        data[i] = 0.5;
        data[i + 1] = 0.25 + 0.02 * (rng() - 0.5);
      }
    }
  }
  return data;
}
