import type { LineageShare } from '../metrics/lineages';
import { genomeColor } from '../render/genomeColor';

const WIDTH = 300;
const HEIGHT = 92;
const HISTORY = 300;

export interface LineageChart {
  push: (shares: LineageShare[]) => void;
  clear: () => void;
  setVisible: (visible: boolean) => void;
}

/**
 * Lineage view (SPEC.md section 5): stacked shares of the largest lineages
 * over time, each coloured like its members on the canvas; grey is the rest.
 */
export function createLineageChart(container: HTMLElement): LineageChart {
  const wrap = document.createElement('div');
  wrap.className = 'plot';
  const title = document.createElement('div');
  title.className = 'u-title';
  title.textContent = 'Lineage shares (top 8)';
  title.style.textAlign = 'center';
  const canvas = document.createElement('canvas');
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  canvas.width = WIDTH * dpr;
  canvas.height = HEIGHT * dpr;
  canvas.style.width = `${WIDTH}px`;
  canvas.style.height = `${HEIGHT}px`;
  wrap.append(title, canvas);
  container.appendChild(wrap);
  const ctx = canvas.getContext('2d');
  const history: LineageShare[][] = [];

  const draw = (): void => {
    if (!ctx) return;
    const w = canvas.width;
    const h = canvas.height;
    ctx.clearRect(0, 0, w, h);
    const col = w / HISTORY;
    history.forEach((shares, i) => {
      if (shares.length === 0) return; // no population: nothing to stack
      const x = w - (history.length - i) * col;
      // Sorted by lineage id so each band keeps its place over time.
      const sorted = [...shares].sort((a, b) => a.lineage - b.lineage);
      let y = h;
      for (const s of sorted) {
        const [r, g, b] = genomeColor(s.gain, s.motility, s.build);
        const bh = s.share * h;
        ctx.fillStyle = `rgb(${Math.round(r * 255)},${Math.round(g * 255)},${Math.round(b * 255)})`;
        ctx.fillRect(x, y - bh, col + 0.5, bh);
        y -= bh;
      }
      ctx.fillStyle = 'rgba(255,255,255,0.12)';
      ctx.fillRect(x, 0, col + 0.5, y);
    });
  };

  return {
    push: (shares) => {
      history.push(shares);
      if (history.length > HISTORY) history.shift();
      draw();
    },
    clear: () => {
      history.length = 0;
      draw();
    },
    setVisible: (visible) => {
      wrap.style.display = visible ? '' : 'none';
    },
  };
}
