import uPlot from 'uplot';
import 'uplot/dist/uPlot.min.css';
import type { MetricName, MetricsLog } from '../metrics/MetricsLog';

/** Samples shown per plot: 600 samples at one per 10 frames is about 100 s. */
const WINDOW = 600;

const PLOTS: { metric: MetricName; title: string; color: string }[] = [
  { metric: 'population', title: 'Population', color: '#f4a261' },
  { metric: 'meanEnergy', title: 'Mean energy', color: '#e9c46a' },
  { metric: 'orderParameter', title: 'Order parameter (std v)', color: '#b388ff' },
  { metric: 'dissipation', title: 'Dissipation proxy (mean u·v²)', color: '#4dd0e1' },
];

export interface Plots {
  update: (log: MetricsLog) => void;
  setVisible: (visible: boolean) => void;
}

/** Live time-series plots of the main metrics (SPEC.md section 5). */
export function createPlots(container: HTMLElement): Plots {
  const axis = {
    stroke: 'rgba(255,255,255,0.55)',
    grid: { stroke: 'rgba(255,255,255,0.08)', width: 1 },
    ticks: { stroke: 'rgba(255,255,255,0.15)', width: 1 },
    font: '10px ui-monospace, monospace',
  };
  const charts = PLOTS.map(({ title, color }) => {
    const el = document.createElement('div');
    el.className = 'plot';
    container.appendChild(el);
    return new uPlot(
      {
        title,
        width: 300,
        height: 92,
        legend: { show: false },
        cursor: { show: false },
        scales: { x: { time: false } },
        axes: [{ ...axis, size: 22 }, { ...axis, size: 44 }],
        series: [{}, { stroke: color, width: 1.5 }],
      },
      [[], []],
      el,
    );
  });

  return {
    update: (log) => {
      const t = log.series('timeS', WINDOW);
      PLOTS.forEach(({ metric }, i) => charts[i]?.setData([t, log.series(metric, WINDOW)]));
    },
    setVisible: (visible) => {
      container.style.display = visible ? '' : 'none';
    },
  };
}
