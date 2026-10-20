import { torusDistance } from '../util/torus';
import type { Population } from './Population';

/** Remove every agent inside a disc, with no death burst; returns how many. */
export function wipeAgents(pop: Population, cx: number, cy: number, radius: number, worldSize: number): number {
  let removed = 0;
  for (let i = 0; i < pop.count; i++) {
    if (torusDistance(pop.x[i] as number, pop.y[i] as number, cx, cy, worldSize) < radius) {
      pop.alive[i] = 0;
      removed++;
    }
  }
  pop.compact();
  return removed;
}
