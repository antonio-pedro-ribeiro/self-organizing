import type { Environment, Vec2 } from '../../src/agents/environment';

/** Uniform nutrient with a fixed gradient and unlimited supply; records everything exchanged. */
export class StubEnv implements Environment {
  readonly size = 64;
  consumed = 0;
  emitted = 0;
  u: number;
  constructor(
    u: number,
    private readonly gradient: Vec2 = { x: 0, y: 0 },
  ) {
    this.u = u;
  }
  nutrient(): number {
    return this.u;
  }
  nutrientGradient(_x: number, _y: number, out: Vec2): void {
    out.x = this.gradient.x;
    out.y = this.gradient.y;
  }
  consume(_x: number, _y: number, amount: number): number {
    this.consumed += amount;
    return amount;
  }
  emit(_x: number, _y: number, amount: number): void {
    this.emitted += amount;
  }
}
