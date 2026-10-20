import { describe, expect, it } from 'vitest';
import { DEFAULT_PRESET, DT, DU, DV, FIELD_SIZE, PRESETS, PRESET_NAMES, RANGES } from '../src/field/presets';

describe('presets', () => {
  it('match the spec values', () => {
    expect(PRESETS.mitosis).toEqual({ F: 0.0367, k: 0.0649 });
    expect(PRESETS.coral).toEqual({ F: 0.0545, k: 0.062 });
    expect(PRESETS.worms).toEqual({ F: 0.078, k: 0.061 });
    expect(PRESETS.chaos).toEqual({ F: 0.026, k: 0.051 });
    expect(DEFAULT_PRESET).toBe('mitosis');
  });

  it('all sit inside the slider ranges', () => {
    for (const name of PRESET_NAMES) {
      const p = PRESETS[name];
      expect(p.F).toBeGreaterThanOrEqual(RANGES.F.min);
      expect(p.F).toBeLessThanOrEqual(RANGES.F.max);
      expect(p.k).toBeGreaterThanOrEqual(RANGES.k.min);
      expect(p.k).toBeLessThanOrEqual(RANGES.k.max);
    }
  });

  it('use the fixed constants from the spec', () => {
    expect(DU).toBe(0.16);
    expect(DV).toBe(0.08);
    expect(DT).toBe(1);
    expect(FIELD_SIZE).toBe(512);
  });
});
