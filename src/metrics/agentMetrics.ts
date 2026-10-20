import type { Population } from '../agents/Population';

/** Repair counts as keeping up with decay at or above this share; see PROGRESS.md. */
export const CLOSURE_TOLERANCE = 0.95;

export interface AgentMetrics {
  population: number;
  lineages: number;
  meanEnergy: number;
  /** Share of agents whose rolling repair rate keeps up with their rolling decay. */
  closureIndex: number;
}

export function agentMetrics(pop: Population): AgentMetrics {
  const n = pop.count;
  if (n === 0) return { population: 0, lineages: 0, meanEnergy: 0, closureIndex: 0 };
  const lineages = new Set<number>();
  let energy = 0;
  let closed = 0;
  for (let i = 0; i < n; i++) {
    lineages.add(pop.lineage[i] as number);
    energy += pop.energy[i] as number;
    if ((pop.repairAvg[i] as number) >= CLOSURE_TOLERANCE * (pop.decayAvg[i] as number)) closed++;
  }
  return { population: n, lineages: lineages.size, meanEnergy: energy / n, closureIndex: closed / n };
}
