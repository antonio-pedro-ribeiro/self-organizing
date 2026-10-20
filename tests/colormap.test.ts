import { describe, expect, it } from 'vitest';
import { buildLut, COLORMAP_NAMES } from '../src/render/colormap';

describe('buildLut', () => {
  it('returns size x 4 bytes with opaque alpha for every colormap', () => {
    for (const name of COLORMAP_NAMES) {
      const lut = buildLut(name, 256);
      expect(lut.length).toBe(256 * 4);
      for (let i = 0; i < 256; i++) expect(lut[i * 4 + 3]).toBe(255);
    }
  });

  it('hits the endpoint colors', () => {
    const magma = buildLut('magma', 256);
    expect(Array.from(magma.slice(0, 3))).toEqual([0, 0, 4]);
    expect(Array.from(magma.slice(255 * 4, 255 * 4 + 3))).toEqual([252, 253, 191]);
    const viridis = buildLut('viridis', 256);
    expect(Array.from(viridis.slice(0, 3))).toEqual([68, 1, 84]);
    expect(Array.from(viridis.slice(255 * 4, 255 * 4 + 3))).toEqual([253, 231, 37]);
  });

  it('magma gets brighter from dark to light', () => {
    const lut = buildLut('magma', 256);
    const lum = (i: number): number => (lut[i * 4] as number) + (lut[i * 4 + 1] as number) + (lut[i * 4 + 2] as number);
    expect(lum(255)).toBeGreaterThan(lum(128));
    expect(lum(128)).toBeGreaterThan(lum(0));
  });
});
