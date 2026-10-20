import { BLOCK_SIZE, BlockEnvironment } from './agents/BlockEnvironment';
import { AGENT_CAP, DEFAULT_AGENT_PARAMS, DEFAULT_INITIAL_AGENTS, METABOLISM } from './agents/params';
import { Population } from './agents/Population';
import { AgentScratch, stepAgents } from './agents/rules';
import { seedPopulation } from './agents/seed';
import { agentSeed } from './agents/World';
import { FieldCoupling } from './field/FieldCoupling';
import { GrayScott } from './field/GrayScott';
import { DEFAULT_PRESET, FIELD_SIZE, PRESETS, type FieldParams } from './field/presets';
import { AgentRenderer } from './render/AgentRenderer';
import { FieldRenderer } from './render/FieldRenderer';
import { createGl } from './render/gl';
import { Trails } from './render/Trails';
import { createControls, type UiState } from './ui/controls';
import { mulberry32, type Rng } from './util/prng';

/** Parameter changes ease in over about half a second; they never jump. */
const EASE_TIME_CONSTANT_S = 0.12;
/** At high speed, run at most this many ticks per frame. */
const MAX_TICKS_PER_FRAME = 4;
/** Discs are drawn larger than the physical radius so they read on screen. */
const DISC_DRAW_SCALE = 2;

function showError(message: string): void {
  const el = document.getElementById('error');
  if (el) {
    el.textContent = message;
    el.style.display = 'block';
  }
}

function main(): void {
  const canvas = document.getElementById('view') as HTMLCanvasElement | null;
  const hud = document.getElementById('hud');
  if (!canvas || !hud) throw new Error('Page is missing #view or #hud.');

  let gl: WebGL2RenderingContext;
  try {
    gl = createGl(canvas);
  } catch (e) {
    showError(e instanceof Error ? e.message : String(e));
    return;
  }

  const start = PRESETS[DEFAULT_PRESET];
  const state: UiState = {
    preset: DEFAULT_PRESET,
    F: start.F,
    k: start.k,
    cutFlux: false,
    stepsPerFrame: 8,
    speed: 1,
    vMax: 0.35,
    colormap: 'magma',
    seed: 1,
    paused: false,
    agents: { ...DEFAULT_AGENT_PARAMS },
    initialAgents: DEFAULT_INITIAL_AGENTS,
    view: 3,
    trails: true,
  };

  const field = new GrayScott(gl, FIELD_SIZE);
  const coupling = new FieldCoupling(gl, field, BLOCK_SIZE);
  const env = new BlockEnvironment(FIELD_SIZE, BLOCK_SIZE);
  const pop = new Population(AGENT_CAP);
  const scratch = new AgentScratch(FIELD_SIZE, AGENT_CAP);
  const update = new Float32Array(env.grid * env.grid * 2);
  const renderer = new FieldRenderer(gl, state.colormap);
  const agentRenderer = new AgentRenderer(gl, AGENT_CAP);
  const trails = new Trails(gl);
  const effective: FieldParams = { F: state.F, k: state.k };
  let rng: Rng = mulberry32(agentSeed(state.seed));
  let tickAccumulator = 0;
  let queuedTicks = 0;
  let hudVisible = true;

  const reset = (): void => {
    field.reset(state.seed);
    pop.clear();
    rng = mulberry32(agentSeed(state.seed));
    seedPopulation(pop, state.initialAgents, FIELD_SIZE, rng);
    trails.clear();
  };
  reset();

  /** One tick: SPEC.md section 3, steps 2 to 5. */
  const tick = (): void => {
    field.step(state.stepsPerFrame, effective);
    env.load(coupling.readBack(), 4, 0);
    stepAgents(pop, env, state.agents, rng, scratch);
    env.writeUpdate(update);
    coupling.write(update);
  };

  const controls = createControls(state, {
    reset,
    step: () => {
      queuedTicks += 1;
    },
    colormapChanged: () => renderer.setColormap(state.colormap),
  });

  const setUiVisible = (visible: boolean): void => {
    hudVisible = visible;
    controls.setVisible(visible);
    hud.style.display = visible ? '' : 'none';
  };

  window.addEventListener('keydown', (ev) => {
    if (ev.target instanceof HTMLInputElement) return;
    if (ev.key === 'h' || ev.key === 'H') setUiVisible(!hudVisible);
    if (ev.key === '1' || ev.key === '2' || ev.key === '3') {
      state.view = Number(ev.key) as 1 | 2 | 3;
      controls.refresh();
    }
    if (ev.key === ' ') {
      state.paused = !state.paused;
      controls.refresh();
      ev.preventDefault();
    }
  });

  const resize = (): void => {
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const w = Math.max(1, Math.floor(window.innerWidth * dpr));
    const h = Math.max(1, Math.floor(window.innerHeight * dpr));
    if (canvas.width !== w || canvas.height !== h) {
      canvas.width = w;
      canvas.height = h;
    }
  };
  window.addEventListener('resize', resize);
  resize();

  let last = performance.now();
  let fps = 60;
  let hudTimer = 0;

  const frame = (now: number): void => {
    const dt = Math.min((now - last) / 1000, 0.25);
    last = now;
    if (dt > 0) fps += (1 / dt - fps) * 0.05;

    const targetF = state.cutFlux ? 0 : state.F;
    const alpha = 1 - Math.exp(-dt / EASE_TIME_CONSTANT_S);
    effective.F += (targetF - effective.F) * alpha;
    effective.k += (state.k - effective.k) * alpha;

    let ticks = 0;
    if (queuedTicks > 0) {
      ticks = 1;
      queuedTicks -= 1;
    } else if (!state.paused) {
      tickAccumulator += state.speed;
      ticks = Math.min(Math.floor(tickAccumulator), MAX_TICKS_PER_FRAME);
      tickAccumulator -= Math.floor(tickAccumulator);
    }
    for (let t = 0; t < ticks; t++) tick();

    const side = Math.min(canvas.width, canvas.height);
    const view = {
      x: Math.floor((canvas.width - side) / 2),
      y: Math.floor((canvas.height - side) / 2),
      size: side,
    };
    const scale = side / FIELD_SIZE;
    const showAgents = state.view !== 1;
    agentRenderer.upload(pop);
    if (state.view === 2) renderer.clear(canvas.width, canvas.height);
    else renderer.draw(field.texture, field.size, state.vMax, canvas.width, canvas.height, view);
    if (showAgents && state.trails) {
      trails.update(side, () => agentRenderer.drawDots(FIELD_SIZE, Math.max(1, 1.5 / scale)));
      trails.composite(view);
    }
    if (showAgents) agentRenderer.drawDiscs(FIELD_SIZE, view, METABOLISM.radius * DISC_DRAW_SCALE);

    hudTimer += dt;
    if (hudVisible && hudTimer > 0.25) {
      hudTimer = 0;
      hud.textContent =
        `${fps.toFixed(0)} fps · ${pop.count} protocells · F ${effective.F.toFixed(4)} · k ${effective.k.toFixed(4)}` +
        ` · ${state.paused ? 'paused' : `${state.stepsPerFrame} steps/tick`}  ·  1/2/3 view · H hides UI`;
    }
    requestAnimationFrame(frame);
  };
  requestAnimationFrame(frame);
}

main();
