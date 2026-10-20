import type { Viewport } from '../render/FieldRenderer';
import type { ViewMode } from './controls';

export interface InputHandlers {
  toggleUi: () => void;
  togglePause: () => void;
  setView: (view: ViewMode) => void;
  /** Pointer pressed or dragged over the field, in field cells (y up, like the field texture). */
  brushAt: (x: number, y: number, first: boolean) => void;
  brushEnd: () => void;
}

/** Keyboard shortcuts and click-drag on the canvas. `view()` gives the field's square viewport in canvas pixels. */
export function bindInput(canvas: HTMLCanvasElement, fieldSize: number, view: () => Viewport, h: InputHandlers): void {
  window.addEventListener('keydown', (ev) => {
    if (ev.target instanceof HTMLInputElement) return;
    if (ev.key === 'h' || ev.key === 'H') h.toggleUi();
    if (ev.key >= '1' && ev.key <= '4') h.setView(Number(ev.key) as ViewMode);
    if (ev.key === ' ') {
      h.togglePause();
      ev.preventDefault();
    }
  });

  const toField = (ev: PointerEvent): [number, number] | null => {
    const rect = canvas.getBoundingClientRect();
    const px = ((ev.clientX - rect.left) / rect.width) * canvas.width;
    const py = canvas.height - ((ev.clientY - rect.top) / rect.height) * canvas.height;
    const v = view();
    const x = ((px - v.x) / v.size) * fieldSize;
    const y = ((py - v.y) / v.size) * fieldSize;
    return x >= 0 && y >= 0 && x < fieldSize && y < fieldSize ? [x, y] : null;
  };

  let down = false;
  canvas.addEventListener('pointerdown', (ev) => {
    const p = toField(ev);
    if (!p) return;
    down = true;
    canvas.setPointerCapture(ev.pointerId);
    h.brushAt(p[0], p[1], true);
  });
  canvas.addEventListener('pointermove', (ev) => {
    if (!down) return;
    const p = toField(ev);
    if (p) h.brushAt(p[0], p[1], false);
  });
  const end = (): void => {
    if (!down) return;
    down = false;
    h.brushEnd();
  };
  canvas.addEventListener('pointerup', end);
  canvas.addEventListener('pointercancel', end);
}
