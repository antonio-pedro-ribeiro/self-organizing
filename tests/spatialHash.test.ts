import { describe, expect, it } from 'vitest';
import { SpatialHash } from '../src/agents/SpatialHash';
import { mulberry32 } from '../src/util/prng';

function torusDist(ax: number, ay: number, bx: number, by: number, size: number): number {
  const dx = Math.min(Math.abs(ax - bx), size - Math.abs(ax - bx));
  const dy = Math.min(Math.abs(ay - by), size - Math.abs(ay - by));
  return Math.hypot(dx, dy);
}

describe('SpatialHash', () => {
  it('finds every neighbor within the cell size, across the torus seam', () => {
    const size = 50;
    const radius = 3;
    const n = 400;
    const rng = mulberry32(9);
    const xs = new Float32Array(n);
    const ys = new Float32Array(n);
    for (let i = 0; i < n; i++) {
      xs[i] = rng() * size;
      ys[i] = rng() * size;
    }
    const hash = new SpatialHash(size, radius, n);
    hash.build(xs, ys, n);
    const out = new Int32Array(n);
    for (let i = 0; i < n; i++) {
      const xi = xs[i] as number;
      const yi = ys[i] as number;
      const found = new Set(Array.from(out.subarray(0, hash.query(xi, yi, out))));
      for (let j = 0; j < n; j++) {
        if (torusDist(xi, yi, xs[j] as number, ys[j] as number, size) < radius) expect(found.has(j)).toBe(true);
      }
    }
  });

  it('returns items in a deterministic order', () => {
    const xs = Float32Array.from([1, 1.5, 9.9, 0.2]);
    const ys = Float32Array.from([1, 1.2, 9.9, 0.1]);
    const hash = new SpatialHash(10, 2, 4);
    hash.build(xs, ys, 4);
    const out = new Int32Array(4);
    const n = hash.query(1, 1, out);
    expect(Array.from(out.subarray(0, n))).toEqual([2, 0, 1, 3]);
  });

  it('rejects worlds with fewer than 3 cells per side', () => {
    expect(() => new SpatialHash(5, 2, 10)).toThrow();
  });
});
