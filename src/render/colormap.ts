export type ColormapName = 'magma' | 'viridis';

type Rgb = readonly [number, number, number];

// Evenly spaced samples (0-255) of the matplotlib perceptual colormaps.
const STOPS: Record<ColormapName, readonly Rgb[]> = {
  magma: [
    [0, 0, 4],
    [28, 16, 68],
    [79, 18, 123],
    [129, 37, 129],
    [181, 54, 122],
    [229, 80, 100],
    [251, 135, 97],
    [254, 194, 135],
    [252, 253, 191],
  ],
  viridis: [
    [68, 1, 84],
    [72, 40, 120],
    [62, 74, 137],
    [49, 104, 142],
    [38, 130, 142],
    [31, 158, 137],
    [53, 183, 121],
    [109, 205, 89],
    [180, 222, 44],
    [253, 231, 37],
  ],
};

export const COLORMAP_NAMES: readonly ColormapName[] = ['magma', 'viridis'];

/** Build a size x 1 RGBA8 lookup table by linear interpolation between stops. */
export function buildLut(name: ColormapName, size = 256): Uint8Array {
  const stops = STOPS[name];
  const out = new Uint8Array(size * 4);
  const last = stops.length - 1;
  for (let i = 0; i < size; i++) {
    const x = (i / (size - 1)) * last;
    const lo = Math.min(Math.floor(x), last - 1);
    const f = x - lo;
    const a = stops[lo] as Rgb;
    const b = stops[lo + 1] as Rgb;
    for (let c = 0; c < 3; c++) {
      out[i * 4 + c] = Math.round((a[c] as number) * (1 - f) + (b[c] as number) * f);
    }
    out[i * 4 + 3] = 255;
  }
  return out;
}
