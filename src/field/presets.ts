export interface FieldParams {
  /** Feed rate: the energy-flux control parameter. */
  F: number;
  /** Kill rate: the dissipation parameter. */
  k: number;
}

export type PresetName = 'mitosis' | 'coral' | 'worms' | 'chaos';

/** Starting points to tune visually (see SPEC.md section 6). */
export const PRESETS: Record<PresetName, FieldParams> = {
  mitosis: { F: 0.0367, k: 0.0649 },
  coral: { F: 0.0545, k: 0.062 },
  worms: { F: 0.078, k: 0.061 },
  chaos: { F: 0.026, k: 0.051 },
};

export const PRESET_NAMES = Object.keys(PRESETS) as PresetName[];
export const DEFAULT_PRESET: PresetName = 'mitosis';

/** Slider ranges (SPEC.md section 4). */
export const RANGES = {
  F: { min: 0, max: 0.08 },
  k: { min: 0.04, max: 0.07 },
} as const;

/** Fixed Gray-Scott constants (SPEC.md section 4). */
export const DU = 0.16;
export const DV = 0.08;
export const DT = 1;
export const FIELD_SIZE = 512;
