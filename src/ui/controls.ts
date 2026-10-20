import { Pane } from 'tweakpane';
import { COLORMAP_NAMES, type ColormapName } from '../render/colormap';
import { DEFAULT_AGENT_PARAMS, DEFAULT_INITIAL_AGENTS, type AgentParams } from '../agents/params';
import { DEFAULT_PRESET, PRESETS, PRESET_NAMES, RANGES, type PresetName } from '../field/presets';

/** Everything the UI can change. main.ts owns one instance and reads it every frame. */
export interface UiState {
  preset: PresetName;
  /** Target feed rate; the simulation eases toward it. */
  F: number;
  /** Target kill rate; the simulation eases toward it. */
  k: number;
  cutFlux: boolean;
  stepsPerFrame: number;
  speed: number;
  vMax: number;
  colormap: ColormapName;
  seed: number;
  paused: boolean;
  /** Protocell rules read these every tick. */
  agents: AgentParams;
  /** Population seeded on reset. */
  initialAgents: number;
  /** 1 field only, 2 agents only, 3 both, 4 both plus network (SPEC.md section 5). */
  view: ViewMode;
  trails: boolean;
  bloom: boolean;
  bloomStrength: number;
  flow: boolean;
  lineageView: boolean;
  /** What click-drag on the field does. */
  brush: BrushMode;
  /** Brush radius in field cells. */
  brushRadius: number;
}

export type ViewMode = 1 | 2 | 3 | 4;

/** The state the app starts with. */
export function createDefaultState(): UiState {
  const start = PRESETS[DEFAULT_PRESET];
  return {
    preset: DEFAULT_PRESET,
    F: start.F,
    k: start.k,
    cutFlux: false,
    stepsPerFrame: 8,
    speed: 1,
    vMax: 0.35,
    colormap: 'magma',
    seed: 1,
    paused: false,
    agents: { ...DEFAULT_AGENT_PARAMS },
    initialAgents: DEFAULT_INITIAL_AGENTS,
    view: 3,
    trails: true,
    bloom: true,
    bloomStrength: 0.8,
    flow: false,
    lineageView: true,
    brush: 'off',
    brushRadius: 24,
  };
}
export type BrushMode = 'off' | 'noise' | 'nutrient' | 'damage';

export interface UiActions {
  reset: () => void;
  step: () => void;
  colormapChanged: () => void;
  /** Wipe 25% of the area, centred (the test 6 perturbation). */
  damageQuarter: () => void;
  downloadCsv: () => void;
  /** Start or stop the automatic F sweep at the current k. */
  toggleSweep: () => void;
  snapshot: () => void;
  record: () => void;
  exportState: () => void;
  importState: () => void;
}

export interface Controls {
  refresh: () => void;
  setVisible: (visible: boolean) => void;
}

function toOptions<T extends string>(names: readonly T[]): Record<string, T> {
  const out: Record<string, T> = {};
  for (const n of names) out[n.charAt(0).toUpperCase() + n.slice(1)] = n;
  return out;
}

export function createControls(state: UiState, actions: UiActions): Controls {
  const pane = new Pane({ title: 'Self-organizing field' });

  const chem = pane.addFolder({ title: 'Chemistry' });
  chem
    .addBinding(state, 'preset', { options: toOptions(PRESET_NAMES), label: 'preset' })
    .on('change', (ev) => {
      const p = PRESETS[ev.value];
      state.F = p.F;
      state.k = p.k;
      state.cutFlux = false;
      pane.refresh();
    });
  chem.addBinding(state, 'F', { min: RANGES.F.min, max: RANGES.F.max, step: 0.0001, label: 'F (feed)' });
  chem.addBinding(state, 'k', { min: RANGES.k.min, max: RANGES.k.max, step: 0.0001, label: 'k (kill)' });
  chem.addBinding(state, 'cutFlux', { label: 'cut flux' });

  const run = pane.addFolder({ title: 'Run' });
  run.addBinding(state, 'paused', { label: 'paused' });
  run.addButton({ title: 'Step one tick' }).on('click', actions.step);
  run.addBinding(state, 'stepsPerFrame', { min: 1, max: 16, step: 1, label: 'field steps/tick' });
  run.addBinding(state, 'speed', { min: 0.25, max: 4, step: 0.25, label: 'speed' });
  run.addBinding(state, 'seed', { min: 0, max: 99999, step: 1, label: 'seed' });
  run.addButton({ title: 'Reset with seed' }).on('click', actions.reset);

  const life = pane.addFolder({ title: 'Protocells' });
  life.addBinding(state.agents, 'membraneDecay', { min: 0, max: 0.05, step: 0.001, label: 'membrane decay' });
  life.addBinding(state.agents, 'mutationSigma', { min: 0, max: 0.1, step: 0.001, label: 'mutation sigma' });
  life.addBinding(state.agents, 'sensingNoise', { min: 0, max: 1, step: 0.01, label: 'sensing noise' });
  life.addBinding(state.agents, 'productionCut', { label: 'cut production' });
  life.addBinding(state, 'initialAgents', { min: 0, max: 2000, step: 10, label: 'initial (on reset)' });

  const perturb = pane.addFolder({ title: 'Perturb and record' });
  perturb.addBinding(state, 'brush', {
    options: { Off: 'off', 'Add noise': 'noise', 'Add nutrient': 'nutrient', Damage: 'damage' },
    label: 'drag brush',
  });
  perturb.addBinding(state, 'brushRadius', { min: 4, max: 200, step: 1, label: 'brush radius' });
  perturb.addButton({ title: 'Wipe 25% of the area' }).on('click', actions.damageQuarter);
  perturb.addButton({ title: 'Download metrics CSV' }).on('click', actions.downloadCsv);

  const analysis = pane.addFolder({ title: 'Analysis and capture' });
  analysis.addButton({ title: 'Run / stop F sweep (k fixed)' }).on('click', actions.toggleSweep);
  analysis.addButton({ title: 'Snapshot PNG' }).on('click', actions.snapshot);
  analysis.addButton({ title: 'Record 10 s WebM' }).on('click', actions.record);
  analysis.addButton({ title: 'Export state JSON' }).on('click', actions.exportState);
  analysis.addButton({ title: 'Import state JSON' }).on('click', actions.importState);

  const look = pane.addFolder({ title: 'Look' });
  look.addBinding(state, 'view', {
    options: { 'Field only (1)': 1, 'Agents only (2)': 2, 'Both (3)': 3, 'Both + network (4)': 4 },
    label: 'view',
  });
  look.addBinding(state, 'trails', { label: 'trails' });
  look.addBinding(state, 'bloom', { label: 'bloom' });
  look.addBinding(state, 'bloomStrength', { min: 0, max: 2, step: 0.05, label: 'bloom strength' });
  look.addBinding(state, 'flow', { label: 'flow overlay' });
  look.addBinding(state, 'lineageView', { label: 'lineage view' });
  look
    .addBinding(state, 'colormap', { options: toOptions(COLORMAP_NAMES), label: 'colormap' })
    .on('change', actions.colormapChanged);
  look.addBinding(state, 'vMax', { min: 0.1, max: 0.6, step: 0.01, label: 'v scale' });

  return {
    refresh: () => pane.refresh(),
    setVisible: (visible) => {
      pane.element.style.display = visible ? '' : 'none';
    },
  };
}
