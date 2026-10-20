import { gaussian, type Rng } from '../util/prng';
import { METABOLISM as K } from './params';
import type { Population } from './Population';

/**
 * Scatter `count` protocells uniformly over the torus. Each starts its own
 * lineage, with genes drawn around 0.5.
 */
export function seedPopulation(pop: Population, count: number, worldSize: number, rng: Rng): void {
  for (let n = 0; n < count; n++) {
    const added = pop.add({
      x: rng() * worldSize,
      y: rng() * worldSize,
      heading: rng() * Math.PI * 2,
      energy: K.initialEnergy,
      components: K.initialComponents,
      membrane: K.initialMembrane,
      lineage: n + 1,
      gain: initialGene(rng),
      motility: initialGene(rng),
      build: initialGene(rng),
    });
    if (added < 0) return;
  }
}

function initialGene(rng: Rng): number {
  const g = 0.5 + 0.15 * gaussian(rng);
  return g < 0 ? 0 : g > 1 ? 1 : g;
}
