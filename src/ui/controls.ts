import { Pane } from 'tweakpane';
import { COLORMAP_NAMES, type ColormapName } from '../render/colormap';
import type { AgentParams } from '../agents/params';
import { PRESETS, PRESET_NAMES, RANGES, type PresetName } from '../field/presets';

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
  /** 1 field only, 2 agents only, 3 both (SPEC.md section 5). */
  view: ViewMode;
  trails: boolean;
  /** When on, clicking the field wipes a disc of field and agents. */
  damageOnClick: boolean;
  /** Damage radius in field cells. */
  damageRadius: number;
}

export type ViewMode = 1 | 2 | 3;

export interface UiActions {
  reset: () => void;
  step: () => void;
  colormapChanged: () => void;
  /** Wipe 25% of the area, centred (the test 6 perturbation). */
  damageQuarter: () => void;
  downloadCsv: () => void;
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
  perturb.addBinding(state, 'damageOnClick', { label: 'click to damage' });
  perturb.addBinding(state, 'damageRadius', { min: 8, max: 200, step: 1, label: 'damage radius' });
  perturb.addButton({ title: 'Wipe 25% of the area' }).on('click', actions.damageQuarter);
  perturb.addButton({ title: 'Download metrics CSV' }).on('click', actions.downloadCsv);

  const look = pane.addFolder({ title: 'Look' });
  look.addBinding(state, 'view', { options: { 'Field only (1)': 1, 'Agents only (2)': 2, 'Both (3)': 3 }, label: 'view' });
  look.addBinding(state, 'trails', { label: 'trails' });
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
