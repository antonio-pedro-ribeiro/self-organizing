import { BLOCK_SIZE, BlockEnvironment } from './agents/BlockEnvironment';
import { wipeAgents } from './agents/damage';
import { AGENT_CAP, DEFAULT_AGENT_PARAMS, DEFAULT_INITIAL_AGENTS } from './agents/params';
import { Population } from './agents/Population';
import { AgentScratch, stepAgents } from './agents/rules';
import { seedPopulation } from './agents/seed';
import { agentSeed } from './agents/World';
import { FieldCoupling } from './field/FieldCoupling';
import { GrayScott } from './field/GrayScott';
import { DEFAULT_PRESET, FIELD_SIZE, PRESETS, type FieldParams } from './field/presets';
import { createFieldSample, fillFromRgba } from './metrics/fieldMetrics';
import { topLineages } from './metrics/lineages';
import { MetricsLog } from './metrics/MetricsLog';
import { METRICS_EVERY, METRICS_GRID, takeSample } from './metrics/sample';
import { createGl } from './render/gl';
import { Scene } from './render/Scene';
import { createControls, type UiState } from './ui/controls';
import { bindInput } from './ui/input';
import { createLineageChart } from './ui/lineageChart';
import { createPlots } from './ui/plots';
import { mulberry32, type Rng } from './util/prng';

/** Parameter changes ease in over about half a second; they never jump. */
const EASE_TIME_CONSTANT_S = 0.12;
/** At high speed, run at most this many ticks per frame. */
const MAX_TICKS_PER_FRAME = 4;
/** While dragging, a new ripple every this many ms. */
const RIPPLE_EVERY_MS = 150;

declare global {
  interface Window {
    /** Present only with `?test` in the URL, for the Playwright tests. */
    __selforg?: {
      state: UiState;
      log: MetricsLog;
      reset: () => void;
      refresh: () => void;
      /** Frames drawn since load; mean frame work and simulation time in ms (includes the GPU with `?sync`). */
      perf: { frames: number; workMs: number; simMs: number; agentMs: number };
      population: () => number;
    };
  }
}

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
  const plotsEl = document.getElementById('plots');
  if (!canvas || !hud || !plotsEl) throw new Error('Page is missing #view, #hud or #plots.');

  let gl: WebGL2RenderingContext;
  try {
    gl = createGl(canvas);
  } catch (e) {
    showError(e instanceof Error ? e.message : String(e));
    return;
  }

  const params = new URLSearchParams(window.location.search);
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
    bloom: true,
    bloomStrength: 0.8,
    flow: false,
    lineageView: true,
    brush: 'off',
    brushRadius: 24,
  };

  const field = new GrayScott(gl, FIELD_SIZE);
  const coupling = new FieldCoupling(gl, field, BLOCK_SIZE);
  const metricsReader = new FieldCoupling(gl, field, FIELD_SIZE / METRICS_GRID);
  const fieldSample = createFieldSample(METRICS_GRID, FIELD_SIZE / METRICS_GRID);
  const log = new MetricsLog();
  const env = new BlockEnvironment(FIELD_SIZE, BLOCK_SIZE);
  const pop = new Population(AGENT_CAP);
  const scratch = new AgentScratch(FIELD_SIZE, AGENT_CAP);
  const update = new Float32Array(env.grid * env.grid * 2);
  const scene = new Scene(gl, FIELD_SIZE, AGENT_CAP, state.colormap);
  const plots = createPlots(plotsEl);
  const lineages = createLineageChart(plotsEl);
  const effective: FieldParams = { F: state.F, k: state.k };
  const damageQueue: { x: number; y: number; r: number }[] = [];
  const brush = { active: false, x: 0, y: 0, lastRipple: 0 };
  const perf = { frames: 0, workMs: 0, simMs: 0, agentMs: 0 };
  const sync = params.has('sync');
  let rng: Rng = mulberry32(agentSeed(state.seed));
  let tickAccumulator = 0;
  let queuedTicks = 0;
  let ticks = 0;
  let runStart = performance.now();
  let hudVisible = true;

  const reset = (): void => {
    field.reset(state.seed);
    pop.clear();
    rng = mulberry32(agentSeed(state.seed));
    seedPopulation(pop, state.initialAgents, FIELD_SIZE, rng);
    coupling.restart();
    metricsReader.restart();
    scene.clearTrails();
    log.clear();
    lineages.clear();
    ticks = 0;
    runStart = performance.now();
  };
  reset();

  /**
   * One tick: SPEC.md section 3, steps 2 to 5. Agents sense the newest
   * finished readback (normally the previous frame's), so their CPU work
   * overlaps the GPU's field steps instead of waiting for them.
   */
  const tick = (): void => {
    field.step(state.stepsPerFrame, effective);
    env.load(coupling.readBackAsync(), 4, 0);
    const agentStart = performance.now();
    stepAgents(pop, env, state.agents, rng, scratch);
    perf.agentMs += (performance.now() - agentStart - perf.agentMs) * 0.05;
    env.writeUpdate(update);
    coupling.write(update);
    ticks++;
  };

  const downloadCsv = (): void => {
    const url = URL.createObjectURL(new Blob([log.toCsv()], { type: 'text/csv' }));
    const a = document.createElement('a');
    a.href = url;
    a.download = `self-organizing-seed${state.seed}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const controls = createControls(state, {
    reset,
    step: () => {
      queuedTicks += 1;
    },
    colormapChanged: () => scene.setColormap(state.colormap),
    damageQuarter: () => {
      damageQueue.push({ x: FIELD_SIZE / 2, y: FIELD_SIZE / 2, r: Math.sqrt((0.25 * FIELD_SIZE * FIELD_SIZE) / Math.PI) });
    },
    downloadCsv,
  });

  bindInput(canvas, FIELD_SIZE, () => scene.viewport(canvas.width, canvas.height), {
    toggleUi: () => {
      hudVisible = !hudVisible;
      controls.setVisible(hudVisible);
      plots.setVisible(hudVisible);
      hud.style.display = hudVisible ? '' : 'none';
    },
    togglePause: () => {
      state.paused = !state.paused;
      controls.refresh();
    },
    setView: (v) => {
      state.view = v;
      controls.refresh();
    },
    brushAt: (x, y, first) => {
      if (state.brush === 'off') return;
      brush.active = true;
      brush.x = x;
      brush.y = y;
      if (first) brush.lastRipple = 0;
    },
    brushEnd: () => {
      brush.active = false;
    },
  });

  if (params.has('test')) {
    window.__selforg = { state, log, reset, refresh: () => controls.refresh(), perf, population: () => pop.count };
  }

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
    const workStart = performance.now();
    const dt = Math.min((now - last) / 1000, 0.25);
    last = now;
    if (dt > 0) fps += (1 / dt - fps) * 0.05;

    // 1. Parameters and queued user actions.
    const targetF = state.cutFlux ? 0 : state.F;
    const alpha = 1 - Math.exp(-dt / EASE_TIME_CONSTANT_S);
    effective.F += (targetF - effective.F) * alpha;
    effective.k += (state.k - effective.k) * alpha;
    if (brush.active && state.brush !== 'off') {
      if (state.brush === 'damage') damageQueue.push({ x: brush.x, y: brush.y, r: state.brushRadius });
      else coupling.brush(state.brush, brush.x, brush.y, state.brushRadius, now % 1000);
      if (now - brush.lastRipple > RIPPLE_EVERY_MS) {
        scene.ripples.add(brush.x, brush.y, state.brushRadius, now);
        brush.lastRipple = now;
      }
    }
    for (const d of damageQueue.splice(0)) {
      coupling.wipe(d.x, d.y, d.r);
      wipeAgents(pop, d.x, d.y, d.r, FIELD_SIZE);
    }

    // 2–5. Simulation ticks.
    let n = 0;
    if (queuedTicks > 0) {
      n = 1;
      queuedTicks -= 1;
    } else if (!state.paused) {
      tickAccumulator += state.speed;
      n = Math.min(Math.floor(tickAccumulator), MAX_TICKS_PER_FRAME);
      tickAccumulator -= Math.floor(tickAccumulator);
    }
    const simStart = performance.now();
    for (let t = 0; t < n; t++) tick();
    if (sync) gl.finish();
    perf.simMs += (performance.now() - simStart - perf.simMs) * 0.05;

    // 6. Metrics every 10 frames.
    perf.frames++;
    if (perf.frames % METRICS_EVERY === 0) {
      fillFromRgba(fieldSample, metricsReader.readBackAsync());
      log.push(takeSample(ticks, (now - runStart) / 1000, effective, fieldSample, pop));
      if (hudVisible) plots.update(log);
      if (hudVisible && state.lineageView) lineages.push(topLineages(pop, 8));
    }
    lineages.setVisible(hudVisible && state.lineageView);

    // 7. Render.
    scene.draw({
      fieldTexture: field.texture,
      pop,
      env,
      canvasW: canvas.width,
      canvasH: canvas.height,
      dpr: Math.min(window.devicePixelRatio || 1, 2),
      now,
      view: state.view,
      vMax: state.vMax,
      trails: state.trails,
      bloom: state.bloom,
      bloomStrength: state.bloomStrength,
      flow: state.flow,
    });
    if (sync) gl.finish();
    perf.workMs += (performance.now() - workStart - perf.workMs) * 0.05;

    hudTimer += dt;
    if (hudVisible && hudTimer > 0.25) {
      hudTimer = 0;
      hud.textContent =
        `${fps.toFixed(0)} fps · ${pop.count} protocells · F ${effective.F.toFixed(4)} · k ${effective.k.toFixed(4)}` +
        ` · ${state.paused ? 'paused' : `${state.stepsPerFrame} steps/tick`}  ·  1–4 view · H hides UI`;
    }
    requestAnimationFrame(frame);
  };
  requestAnimationFrame(frame);
}

main();
