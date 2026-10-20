/** User-facing protocell parameters (SPEC.md section 4). */
export interface AgentParams {
  /** Membrane integrity lost per tick: the entropy pressure. */
  membraneDecay: number;
  /** Division needs E at or above this. */
  divisionEnergy: number;
  /** Division needs M at or above this. */
  divisionMembrane: number;
  /** Standard deviation of the Gaussian mutation applied to each gene. */
  mutationSigma: number;
  /** Standard deviation of heading noise per tick, in radians. */
  sensingNoise: number;
  /** Knockout: when true, no agent produces components whatever its genome. */
  productionCut: boolean;
}

export const DEFAULT_AGENT_PARAMS: AgentParams = {
  membraneDecay: 0.01,
  divisionEnergy: 1.0,
  divisionMembrane: 0.8,
  mutationSigma: 0.02,
  sensingNoise: 0.3,
  productionCut: false,
};

export const DEFAULT_INITIAL_AGENTS = 200;

/** Hard safety limit on population (SPEC.md section 4). */
export const AGENT_CAP = 5000;

/**
 * Fixed metabolic constants. Amounts of u and v are masses (concentration
 * summed over field cells; an 8×8 block at u = 1 holds 64). Starting values,
 * not tuned against any test; see PROGRESS.md.
 */
export const METABOLISM = {
  /** u mass an agent tries to graze per tick, per unit of local u, at sensing gain 0.5. Uptake scales with 0.5 + gain. */
  grazeRate: 20,
  /** Most of a block's u that its agents can take in one tick. */
  maxGrazeShare: 0.5,
  /** Energy gained per unit of u mass grazed. */
  energyYield: 0.002,
  /** Share of E turned into components per tick at build efficiency 1. */
  productionRate: 0.08,
  /** Age in ticks at which membrane decay has doubled. Ageing guarantees turnover. */
  agingTime: 2000,
  /** Components spent on repair per tick, per unit of missing membrane. */
  repairRate: 0.1,
  /** Share of E leaked per tick when the membrane is fully gone. */
  leakRate: 0.05,
  /** Energy spent per tick just to exist. */
  basalCost: 0.001,
  /** Energy spent per tick per unit of sensing gain: the upkeep of uptake machinery. */
  uptakeCost: 0.004,
  /** Energy spent per cell moved. */
  moveCost: 0.01,
  /** Distance moved per tick at motility 1, in cells. */
  maxSpeed: 0.6,
  /** Fraction of the heading error corrected per tick at sensing gain 1. */
  turnRate: 0.5,
  /** Gradient magnitude (u per cell) at which steering is about 76% of full strength. */
  gradientScale: 0.01,
  /** v mass emitted per tick as a signal. */
  signalRate: 0.1,
  /** v mass released when an agent dies: 0.25 across one 8×8 block, enough to seed a spot. */
  deathBurst: 16,
  /** Agent radius in cells; overlapping agents push apart. */
  radius: 1.5,
  /** Starting energy, components and membrane of a seeded agent. */
  initialEnergy: 0.5,
  initialComponents: 0.2,
  initialMembrane: 1,
} as const;
