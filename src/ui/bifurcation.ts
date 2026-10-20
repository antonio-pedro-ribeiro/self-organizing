import uPlot from 'uplot';
import type { HysteresisReport, SweepPoint } from '../metrics/sweep';

export interface BifurcationPanel {
  update: (points: SweepPoint[], currentF: number, status: string) => void;
  setVisible: (visible: boolean) => void;
}

/** Format a hysteresis report for display. */
export function describeHysteresis(r: HysteresisReport): string {
  const f = (x?: number): string => (x === undefined ? 'none' : x.toFixed(4));
  return `jump up at F ${f(r.upTransitionF)}, down at F ${f(r.downTransitionF)}; max gap ${r.maxGap.toFixed(4)} at F ${r.maxGapF.toFixed(4)}`;
}

/**
 * Bifurcation panel (SPEC.md section 5): order parameter against F for the
 * up and down sweeps, with the current F as a moving marker.
 */
export function createBifurcationPanel(container: HTMLElement): BifurcationPanel {
  const wrap = document.createElement('div');
  wrap.className = 'plot';
  const status = document.createElement('div');
  status.className = 'u-title';
  status.style.cssText = 'font-size:10px;max-width:300px;white-space:normal;text-align:center';
  container.appendChild(wrap);
  let markerF = 0;
  const axis = {
    stroke: 'rgba(255,255,255,0.55)',
    grid: { stroke: 'rgba(255,255,255,0.08)', width: 1 },
    ticks: { stroke: 'rgba(255,255,255,0.15)', width: 1 },
    font: '10px ui-monospace, monospace',
  };
  const chart = new uPlot(
    {
      title: 'Bifurcation: order parameter vs F (up, down)',
      width: 300,
      height: 120,
      legend: { show: false },
      cursor: { show: false },
      scales: { x: { time: false } },
      axes: [{ ...axis, size: 22 }, { ...axis, size: 44 }],
      series: [
        {},
        { stroke: '#ff8a65', width: 1.5, points: { show: true, size: 4 } },
        { stroke: '#64b5f6', width: 1.5, points: { show: true, size: 4 } },
      ],
      hooks: {
        draw: [
          (u: uPlot) => {
            if (!(u.data[0] as number[]).length) return;
            const x = u.valToPos(markerF, 'x', true);
            const ctx = u.ctx;
            ctx.save();
            ctx.strokeStyle = 'rgba(255,255,255,0.7)';
            ctx.setLineDash([3, 3]);
            ctx.beginPath();
            ctx.moveTo(x, u.bbox.top);
            ctx.lineTo(x, u.bbox.top + u.bbox.height);
            ctx.stroke();
            ctx.restore();
          },
        ],
      },
    },
    [[], [], []],
    wrap,
  );
  wrap.appendChild(status);
  wrap.style.display = 'none';

  return {
    update: (points, currentF, text) => {
      markerF = currentF;
      const fs = [...new Set(points.map((p) => Number(p.F.toFixed(6))))].sort((a, b) => a - b);
      const branch = (dir: 'up' | 'down'): (number | null)[] =>
        fs.map((F) => points.find((p) => p.dir === dir && Math.abs(p.F - F) < 1e-6)?.order ?? null);
      chart.setData([fs, branch('up'), branch('down')]);
      status.textContent = text;
    },
    setVisible: (visible) => {
      wrap.style.display = visible ? '' : 'none';
    },
  };
}
