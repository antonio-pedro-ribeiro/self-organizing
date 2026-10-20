import { describe, expect, it } from 'vitest';
import { initialFieldData } from '../src/field/initial';

describe('initialFieldData', () => {
  it('is deterministic for a given seed', () => {
    const a = initialFieldData(64, 5);
    const b = initialFieldData(64, 5);
    expect(a).toEqual(b);
  });

  it('differs between seeds', () => {
    expect(initialFieldData(64, 5)).not.toEqual(initialFieldData(64, 6));
  });

  it('has the right size and value ranges', () => {
    const size = 64;
    const data = initialFieldData(size, 3);
    expect(data.length).toBe(size * size * 4);
    let seeded = 0;
    for (let i = 0; i < size * size; i++) {
      const u = data[i * 4] as number;
      const v = data[i * 4 + 1] as number;
      expect(u).toBeGreaterThanOrEqual(0.5);
      expect(u).toBeLessThanOrEqual(1);
      expect(v).toBeGreaterThanOrEqual(0);
      expect(v).toBeLessThanOrEqual(0.27);
      expect(data[i * 4 + 3]).toBe(1);
      if (v > 0) seeded++;
    }
    expect(seeded).toBeGreaterThan(0);
    expect(seeded).toBeLessThan(size * size);
  });
});
