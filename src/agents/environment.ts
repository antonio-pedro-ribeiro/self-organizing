/** A 2D vector written by sensing calls, reused to avoid allocation. */
export interface Vec2 {
  x: number;
  y: number;
}

/**
 * What a protocell can sense and change in its surroundings. Positions are
 * in field cells on a torus of side `size`. Amounts exchanged are masses:
 * concentration summed over field cells.
 */
export interface Environment {
  readonly size: number;
  /** Nutrient u (concentration) at a position. */
  nutrient(x: number, y: number): number;
  /** Gradient of u per field cell at a position, written into `out`. */
  nutrientGradient(x: number, y: number, out: Vec2): void;
  /** Remove up to `amount` of u mass near a position; returns what was taken. */
  consume(x: number, y: number, amount: number): number;
  /** Add `amount` of v mass near a position. */
  emit(x: number, y: number, amount: number): void;
}
