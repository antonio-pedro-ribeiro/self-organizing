/** In-place iterative radix-2 complex FFT. Length must be a power of two. */
export function fft(re: Float64Array, im: Float64Array): void {
  const n = re.length;
  if ((n & (n - 1)) !== 0) throw new Error('FFT length must be a power of two.');
  for (let i = 1, j = 0; i < n; i++) {
    let bit = n >> 1;
    for (; j & bit; bit >>= 1) j ^= bit;
    j ^= bit;
    if (i < j) {
      const tr = re[i] as number;
      re[i] = re[j] as number;
      re[j] = tr;
      const ti = im[i] as number;
      im[i] = im[j] as number;
      im[j] = ti;
    }
  }
  for (let len = 2; len <= n; len <<= 1) {
    const ang = (-2 * Math.PI) / len;
    const wr = Math.cos(ang);
    const wi = Math.sin(ang);
    for (let start = 0; start < n; start += len) {
      let cr = 1;
      let ci = 0;
      for (let k = 0; k < len / 2; k++) {
        const a = start + k;
        const b = a + len / 2;
        const xr = (re[b] as number) * cr - (im[b] as number) * ci;
        const xi = (re[b] as number) * ci + (im[b] as number) * cr;
        re[b] = (re[a] as number) - xr;
        im[b] = (im[a] as number) - xi;
        re[a] = (re[a] as number) + xr;
        im[a] = (im[a] as number) + xi;
        const nr = cr * wr - ci * wi;
        ci = cr * wi + ci * wr;
        cr = nr;
      }
    }
  }
}

/** Power spectrum |F|² of a real size×size image (row-major), as a new array. */
export function powerSpectrum2d(image: ArrayLike<number>, size: number): Float64Array {
  const re = new Float64Array(size * size);
  const im = new Float64Array(size * size);
  for (let i = 0; i < size * size; i++) re[i] = image[i] as number;
  const rowRe = new Float64Array(size);
  const rowIm = new Float64Array(size);
  for (let pass = 0; pass < 2; pass++) {
    for (let line = 0; line < size; line++) {
      for (let k = 0; k < size; k++) {
        const i = pass === 0 ? line * size + k : k * size + line;
        rowRe[k] = re[i] as number;
        rowIm[k] = im[i] as number;
      }
      fft(rowRe, rowIm);
      for (let k = 0; k < size; k++) {
        const i = pass === 0 ? line * size + k : k * size + line;
        re[i] = rowRe[k] as number;
        im[i] = rowIm[k] as number;
      }
    }
  }
  const power = new Float64Array(size * size);
  for (let i = 0; i < size * size; i++) power[i] = (re[i] as number) ** 2 + (im[i] as number) ** 2;
  return power;
}
