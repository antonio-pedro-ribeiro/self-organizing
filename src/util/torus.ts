/** Distance between two points on a torus of side `size`. */
export function torusDistance(ax: number, ay: number, bx: number, by: number, size: number): number {
  let dx = Math.abs(ax - bx) % size;
  let dy = Math.abs(ay - by) % size;
  if (dx > size / 2) dx = size - dx;
  if (dy > size / 2) dy = size - dy;
  return Math.hypot(dx, dy);
}
