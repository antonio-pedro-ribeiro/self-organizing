import type { Population } from '../agents/Population';

export interface LineageShare {
  lineage: number;
  share: number;
  /** Mean genome of the lineage's members. */
  gain: number;
  motility: number;
  build: number;
}

/** The `top` largest lineages by share of the population, largest first; the rest are left out. */
export function topLineages(pop: Population, top: number): LineageShare[] {
  const n = pop.count;
  if (n === 0) return [];
  const acc = new Map<number, { count: number; gain: number; motility: number; build: number }>();
  for (let i = 0; i < n; i++) {
    const id = pop.lineage[i] as number;
    const a = acc.get(id) ?? { count: 0, gain: 0, motility: 0, build: 0 };
    a.count++;
    a.gain += pop.gain[i] as number;
    a.motility += pop.motility[i] as number;
    a.build += pop.build[i] as number;
    acc.set(id, a);
  }
  return [...acc.entries()]
    .sort((a, b) => b[1].count - a[1].count || a[0] - b[0])
    .slice(0, top)
    .map(([lineage, a]) => ({
      lineage,
      share: a.count / n,
      gain: a.gain / a.count,
      motility: a.motility / a.count,
      build: a.build / a.count,
    }));
}
