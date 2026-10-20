import type { Viewport } from '../render/FieldRenderer';

export interface InputHandlers {
  toggleUi: () => void;
  togglePause: () => void;
  setView: (view: 1 | 2 | 3) => void;
  /** Click on the field, in field cells (y up, like the field texture). */
  fieldClick: (x: number, y: number) => void;
}

/** Keyboard shortcuts and canvas clicks. `view()` gives the field's square viewport in canvas pixels. */
export function bindInput(canvas: HTMLCanvasElement, fieldSize: number, view: () => Viewport, h: InputHandlers): void {
  window.addEventListener('keydown', (ev) => {
    if (ev.target instanceof HTMLInputElement) return;
    if (ev.key === 'h' || ev.key === 'H') h.toggleUi();
    if (ev.key === '1' || ev.key === '2' || ev.key === '3') h.setView(Number(ev.key) as 1 | 2 | 3);
    if (ev.key === ' ') {
      h.togglePause();
      ev.preventDefault();
    }
  });

  canvas.addEventListener('click', (ev) => {
    const rect = canvas.getBoundingClientRect();
    const px = ((ev.clientX - rect.left) / rect.width) * canvas.width;
    const py = canvas.height - ((ev.clientY - rect.top) / rect.height) * canvas.height;
    const v = view();
    const x = ((px - v.x) / v.size) * fieldSize;
    const y = ((py - v.y) / v.size) * fieldSize;
    if (x >= 0 && y >= 0 && x < fieldSize && y < fieldSize) h.fieldClick(x, y);
  });
}
