import { AGENT_CAP } from '../agents/params';
import { PRESET_NAMES, RANGES } from '../field/presets';
import { COLORMAP_NAMES } from '../render/colormap';
import type { UiState } from './controls';

/** Saved-state format version. */
export const STATE_VERSION = 1;

type NumberRule = { kind: 'number'; min: number; max: number; integer?: boolean };
type BoolRule = { kind: 'boolean' };
type EnumRule = { kind: 'enum'; values: readonly (string | number)[] };
type Rule = NumberRule | BoolRule | EnumRule;

const num = (min: number, max: number, integer = false): NumberRule => ({ kind: 'number', min, max, integer });
const bool: BoolRule = { kind: 'boolean' };
const oneOf = (values: readonly (string | number)[]): EnumRule => ({ kind: 'enum', values });

/** Top-level fields that are saved, with the same ranges as their controls. */
const TOP: Record<string, Rule> = {
  seed: num(0, 0xffffffff, true),
  preset: oneOf(PRESET_NAMES),
  F: num(RANGES.F.min, RANGES.F.max),
  k: num(RANGES.k.min, RANGES.k.max),
  cutFlux: bool,
  stepsPerFrame: num(1, 16, true),
  speed: num(0.25, 4),
  initialAgents: num(0, AGENT_CAP, true),
  vMax: num(0.1, 0.6),
  colormap: oneOf(COLORMAP_NAMES),
  view: oneOf([1, 2, 3, 4]),
  trails: bool,
  bloom: bool,
  bloomStrength: num(0, 2),
  flow: bool,
  lineageView: bool,
};

const AGENTS: Record<string, Rule> = {
  membraneDecay: num(0, 0.05),
  divisionEnergy: num(0, 10),
  divisionMembrane: num(0, 1),
  mutationSigma: num(0, 0.1),
  sensingNoise: num(0, 1),
  productionCut: bool,
};

/** Parameters plus seed as JSON (SPEC.md section 6). */
export function stateToJson(state: UiState): string {
  const out: Record<string, unknown> = { version: STATE_VERSION };
  for (const key of Object.keys(TOP)) out[key] = state[key as keyof UiState];
  out.agents = { ...state.agents };
  return JSON.stringify(out, null, 2);
}

function check(rule: Rule, value: unknown, path: string, errors: string[]): void {
  if (rule.kind === 'boolean') {
    if (typeof value !== 'boolean') errors.push(`${path} must be true or false`);
  } else if (rule.kind === 'enum') {
    if (!rule.values.includes(value as string | number)) errors.push(`${path} must be one of ${rule.values.join(', ')}`);
  } else if (typeof value !== 'number' || !Number.isFinite(value) || value < rule.min || value > rule.max) {
    errors.push(`${path} must be a number from ${rule.min} to ${rule.max}`);
  } else if (rule.integer && !Number.isInteger(value)) {
    errors.push(`${path} must be a whole number`);
  }
}

/**
 * Parse saved state onto a copy of `current`. Missing fields keep their
 * current values and unknown fields are ignored. Throws an Error listing
 * every problem if anything is invalid, and changes nothing in that case.
 */
export function stateFromJson(text: string, current: UiState): UiState {
  let data: unknown;
  try {
    data = JSON.parse(text);
  } catch {
    throw new Error('The file is not valid JSON.');
  }
  if (typeof data !== 'object' || data === null || Array.isArray(data)) throw new Error('Expected a JSON object.');
  const obj = data as Record<string, unknown>;
  if (obj.version !== undefined && obj.version !== STATE_VERSION) {
    throw new Error(`Unsupported state version ${String(obj.version)} (expected ${STATE_VERSION}).`);
  }
  const errors: string[] = [];
  const next: UiState = { ...current, agents: { ...current.agents } };
  for (const [key, rule] of Object.entries(TOP)) {
    if (obj[key] === undefined) continue;
    const before = errors.length;
    check(rule, obj[key], key, errors);
    if (errors.length === before) (next as unknown as Record<string, unknown>)[key] = obj[key];
  }
  if (obj.agents !== undefined) {
    if (typeof obj.agents !== 'object' || obj.agents === null) errors.push('agents must be an object');
    else {
      const agents = obj.agents as Record<string, unknown>;
      for (const [key, rule] of Object.entries(AGENTS)) {
        if (agents[key] === undefined) continue;
        const before = errors.length;
        check(rule, agents[key], `agents.${key}`, errors);
        if (errors.length === before) (next.agents as unknown as Record<string, unknown>)[key] = agents[key];
      }
    }
  }
  if (errors.length > 0) throw new Error(`Invalid state:\n- ${errors.join('\n- ')}`);
  return next;
}
