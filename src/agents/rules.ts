import { gaussian, type Rng } from '../util/prng';
import type { Environment, Vec2 } from './environment';
import { AGENT_CAP, METABOLISM as K, type AgentParams } from './params';
import type { Population } from './Population';
import { SpatialHash } from './SpatialHash';

const TAU = Math.PI * 2;

/** Scratch buffers for one population; reuse across ticks. */
export class AgentScratch {
  readonly hash: SpatialHash;
  readonly neighbors: Int32Array;
  readonly pushX: Float32Array;
  readonly pushY: Float32Array;
  readonly grad: Vec2 = { x: 0, y: 0 };

  constructor(worldSize: number, capacity: number) {
    this.hash = new SpatialHash(worldSize, 2 * K.radius, capacity);
    this.neighbors = new Int32Array(capacity);
    this.pushX = new Float32Array(capacity);
    this.pushY = new Float32Array(capacity);
  }
}

/**
 * One tick of every protocell: feed, produce, repair, retain, move, signal,
 * divide or die (SPEC.md section 4). Each rule reads only the agent's own
 * state and its immediate surroundings; none refers to groups.
 */
export function stepAgents(
  pop: Population,
  env: Environment,
  params: AgentParams,
  rng: Rng,
  scratch: AgentScratch,
): void {
  const size = env.size;
  const grad = scratch.grad;
  const n = pop.count;

  for (let i = 0; i < n; i++) {
    let x = pop.x[i] as number;
    let y = pop.y[i] as number;
    let h = pop.heading[i] as number;
    let e = pop.energy[i] as number;
    let c = pop.components[i] as number;
    let m = pop.membrane[i] as number;

    // 1. Feed: what the agent gains, the field loses. Sensing gain sets how
    // strongly this agent takes up nutrient, at an upkeep cost.
    const gain = pop.gain[i] as number;
    e += K.energyYield * env.consume(x, y, K.grazeRate * (0.5 + gain) * env.nutrient(x, y));

    // 2. Produce: energy becomes components.
    const build = params.productionCut ? 0 : (pop.build[i] as number);
    const made = K.productionRate * build * e;
    e -= made;
    c += made;

    // 3. Repair: components rebuild the membrane against decay, which grows
    // with age, so no agent is immortal at break-even.
    const repair = Math.min(c, K.repairRate * (1 - m));
    c -= repair;
    const decay = params.membraneDecay * (1 + (pop.age[i] as number) / K.agingTime);
    m = Math.min(1, m + repair) - decay;

    if (m <= 0) {
      // Die: the membrane is gone and the contents spill into the field.
      env.emit(x, y, K.deathBurst);
      pop.alive[i] = 0;
      continue;
    }

    // 4. Retain: leakage grows as the membrane fails.
    e -= e * K.leakRate * (1 - m);

    // 5. Move: steer up the nutrient gradient, with noise; motion costs energy.
    env.nutrientGradient(x, y, grad);
    const g = Math.hypot(grad.x, grad.y);
    if (g > 0) {
      const err = wrapAngle(Math.atan2(grad.y, grad.x) - h);
      h += K.turnRate * gain * Math.tanh(g / K.gradientScale) * err;
    }
    h = wrapAngle(h + params.sensingNoise * gaussian(rng));
    const speed = K.maxSpeed * (pop.motility[i] as number);
    x = wrap(x + Math.cos(h) * speed, size);
    y = wrap(y + Math.sin(h) * speed, size);
    e = Math.max(0, e - K.basalCost - K.uptakeCost * gain - K.moveCost * speed);

    // 6. Signal: a little v, so agents feed back on the pattern.
    env.emit(x, y, K.signalRate);

    // 7. Divide: split resources, copy the genome with mutation.
    if (e >= params.divisionEnergy && m >= params.divisionMembrane && pop.count < AGENT_CAP) {
      e *= 0.5;
      c *= 0.5;
      const a = rng() * TAU;
      const ox = Math.cos(a) * K.radius * 0.5;
      const oy = Math.sin(a) * K.radius * 0.5;
      pop.add({
        x: wrap(x + ox, size),
        y: wrap(y + oy, size),
        heading: a,
        energy: e,
        components: c,
        membrane: m,
        lineage: pop.lineage[i] as number,
        gain: mutate(pop.gain[i] as number, params.mutationSigma, rng),
        motility: mutate(pop.motility[i] as number, params.mutationSigma, rng),
        build: mutate(pop.build[i] as number, params.mutationSigma, rng),
      });
      x = wrap(x - ox, size);
      y = wrap(y - oy, size);
    }

    pop.x[i] = x;
    pop.y[i] = y;
    pop.heading[i] = h;
    pop.energy[i] = e;
    pop.components[i] = c;
    pop.membrane[i] = m;
    pop.age[i] = (pop.age[i] as number) + 1;
  }

  pop.compact();
  separate(pop, size, scratch);
}

/** Overlapping membranes push each other apart (local physics only). */
function separate(pop: Population, size: number, scratch: AgentScratch): void {
  const n = pop.count;
  const { hash, neighbors, pushX, pushY } = scratch;
  const minDist = 2 * K.radius;
  const half = size / 2;
  hash.build(pop.x, pop.y, n);
  pushX.fill(0, 0, n);
  pushY.fill(0, 0, n);
  for (let i = 0; i < n; i++) {
    const xi = pop.x[i] as number;
    const yi = pop.y[i] as number;
    const found = hash.query(xi, yi, neighbors);
    for (let k = 0; k < found; k++) {
      const j = neighbors[k] as number;
      if (j <= i) continue;
      let dx = (pop.x[j] as number) - xi;
      let dy = (pop.y[j] as number) - yi;
      if (dx > half) dx -= size;
      else if (dx < -half) dx += size;
      if (dy > half) dy -= size;
      else if (dy < -half) dy += size;
      const d = Math.hypot(dx, dy);
      if (d >= minDist || d === 0) continue;
      const push = (0.25 * (minDist - d)) / d;
      pushX[i] = (pushX[i] as number) - dx * push;
      pushY[i] = (pushY[i] as number) - dy * push;
      pushX[j] = (pushX[j] as number) + dx * push;
      pushY[j] = (pushY[j] as number) + dy * push;
    }
  }
  for (let i = 0; i < n; i++) {
    pop.x[i] = wrap((pop.x[i] as number) + (pushX[i] as number), size);
    pop.y[i] = wrap((pop.y[i] as number) + (pushY[i] as number), size);
  }
}

export function mutate(gene: number, sigma: number, rng: Rng): number {
  const g = gene + sigma * gaussian(rng);
  return g < 0 ? 0 : g > 1 ? 1 : g;
}

function wrap(p: number, size: number): number {
  const w = p % size;
  return w < 0 ? w + size : w;
}

function wrapAngle(a: number): number {
  return a - TAU * Math.floor((a + Math.PI) / TAU);
}
