import { AGENT_CAP } from './agents/params';
import { BrowserSim } from './field/BrowserSim';
import { perturbationPatches } from './field/initial';
import { FIELD_SIZE, type FieldParams } from './field/presets';
import { patternWavelength } from './metrics/fieldMetrics';
import { topLineages } from './metrics/lineages';
import { MetricsLog } from './metrics/MetricsLog';
import { METRICS_EVERY, takeSample } from './metrics/sample';
import { abruptSteps, DEFAULT_SWEEP, hysteresis, SweepRunner, type SweepConfig } from './metrics/sweep';
import { createGl } from './render/gl';
import { Scene } from './render/Scene';
import { createBifurcationPanel, describeHysteresis } from './ui/bifurcation';
import { recordWebm, snapshotPng } from './ui/capture';
import { mulberry32 } from './util/prng';
import { createControls, createDefaultState } from './ui/controls';
import { downloadBlob, pickTextFile } from './ui/download';
import { bindInput } from './ui/input';
import { createLineageChart } from './ui/lineageChart';
import { createPlots } from './ui/plots';
import { stateFromJson, stateToJson } from './ui/stateJson';
import './ui/testHook';

/** Parameter changes ease in over about half a second; they never jump. */
const EASE_TIME_CONSTANT_S = 0.12;
/** At high speed, run at most this many ticks per frame. */
const MAX_TICKS_PER_FRAME = 4;
/** While dragging, a new ripple every this many ms. */
const RIPPLE_EVERY_MS = 150;

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
  const state = createDefaultState();
  const sim = new BrowserSim(gl, FIELD_SIZE);
  const log = new MetricsLog();
  const scene = new Scene(gl, FIELD_SIZE, AGENT_CAP, state.colormap);
  const plots = createPlots(plotsEl);
  const lineages = createLineageChart(plotsEl);
  const bifurcation = createBifurcationPanel(plotsEl);
  const effective: FieldParams = { F: state.F, k: state.k };
  const damageQueue: { x: number; y: number; r: number }[] = [];
  const brush = { active: false, x: 0, y: 0, lastRipple: 0 };
  const perf = { frames: 0, workMs: 0, simMs: 0, agentMs: 0 };
  const sync = params.has('sync');
  let sweep: SweepRunner | null = null;
  let sweepStep = -1;
  let sweepRng = mulberry32(0);
  let snapshotRequested = false;
  let tickAccumulator = 0;
  let queuedTicks = 0;
  let runStart = performance.now();
  let hudVisible = true;

  const reset = (): void => {
    sim.reset(state.seed, state.initialAgents);
    scene.clearTrails();
    log.clear();
    lineages.clear();
    runStart = performance.now();
  };
  reset();

  const startSweep = (config: Partial<SweepConfig> = {}): void => {
    state.cutFlux = false;
    sweep = new SweepRunner({ ...DEFAULT_SWEEP, ...config }, sim.ticks);
    sweepStep = -1;
    sweepRng = mulberry32(state.seed + 1);
  };

  const stamp = (): string => `seed${state.seed}-${new Date().toISOString().replace(/[:.]/g, '-')}`;
  const controls = createControls(state, {
    reset,
    step: () => {
      queuedTicks += 1;
    },
    colormapChanged: () => scene.setColormap(state.colormap),
    damageQuarter: () => {
      damageQueue.push({ x: FIELD_SIZE / 2, y: FIELD_SIZE / 2, r: Math.sqrt((0.25 * FIELD_SIZE * FIELD_SIZE) / Math.PI) });
    },
    downloadCsv: () => downloadBlob(new Blob([log.toCsv()], { type: 'text/csv' }), `self-organizing-${stamp()}.csv`),
    toggleSweep: () => {
      if (sweep && !sweep.done) sweep = null;
      else startSweep();
    },
    snapshot: () => {
      snapshotRequested = true;
    },
    record: () => {
      recordWebm(canvas, 10, `self-organizing-${stamp()}.webm`).catch((e: Error) => window.alert(e.message));
    },
    exportState: () =>
      downloadBlob(new Blob([stateToJson(state)], { type: 'application/json' }), `self-organizing-${stamp()}.json`),
    importState: () => {
      pickTextFile('application/json,.json')
        .then((text) => {
          Object.assign(state, stateFromJson(text, state));
          scene.setColormap(state.colormap);
          controls.refresh();
          reset();
        })
        .catch((e: Error) => window.alert(e.message));
    },
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
      Object.assign(brush, { active: true, x, y });
      if (first) brush.lastRipple = 0;
    },
    brushEnd: () => {
      brush.active = false;
    },
  });

  if (params.has('test')) {
    window.__selforg = {
      state,
      log,
      reset,
      refresh: () => controls.refresh(),
      perf,
      population: () => sim.pop.count,
      ticks: () => sim.ticks,
      startSweep,
      sweep: () => (sweep ? { done: sweep.done, progress: sweep.progress, points: sweep.points } : null),
      fieldV: () => Array.from(sim.sample.v),
      wavelength: () => patternWavelength(sim.sample),
    };
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
    if (sweep && !sweep.done) {
      state.F = sweep.currentF;
      if (sweep.step !== sweepStep) {
        sweepStep = sweep.step;
        sim.seedPatches(perturbationPatches(FIELD_SIZE, sweepRng, sweep.config.perturbPatches));
      }
    }
    const targetF = state.cutFlux ? 0 : state.F;
    const alpha = 1 - Math.exp(-dt / EASE_TIME_CONSTANT_S);
    effective.F += (targetF - effective.F) * alpha;
    effective.k += (state.k - effective.k) * alpha;
    if (brush.active && state.brush !== 'off') {
      if (state.brush === 'damage') damageQueue.push({ x: brush.x, y: brush.y, r: state.brushRadius });
      else sim.brush(state.brush, brush.x, brush.y, state.brushRadius, now % 1000);
      if (now - brush.lastRipple > RIPPLE_EVERY_MS) {
        scene.ripples.add(brush.x, brush.y, state.brushRadius, now);
        brush.lastRipple = now;
      }
    }
    for (const d of damageQueue.splice(0)) sim.damage(d.x, d.y, d.r);

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
    for (let t = 0; t < n; t++) sim.tick(state.stepsPerFrame, effective, state.agents);
    if (sync) gl.finish();
    perf.simMs += (performance.now() - simStart - perf.simMs) * 0.05;
    perf.agentMs = sim.agentMs;

    // 6. Metrics every 10 frames, and the sweep that reads them.
    perf.frames++;
    if (perf.frames % METRICS_EVERY === 0) {
      const sample = takeSample(sim.ticks, (now - runStart) / 1000, effective, sim.readSample(), sim.pop);
      log.push(sample);
      sweep?.observe(sim.ticks, sample.orderParameter);
      if (hudVisible) plots.update(log);
      if (hudVisible && state.lineageView) lineages.push(topLineages(sim.pop, 8));
      if (sweep) {
        const orders = sweep.points.map((p) => p.order);
        const text = sweep.done
          ? `Done: ${abruptSteps(orders).length} jumps over 3×; ${describeHysteresis(hysteresis(sweep.points))}`
          : `Sweeping at k ${state.k.toFixed(4)}: ${Math.round(sweep.progress * 100)}%`;
        bifurcation.update(sweep.points, effective.F, text);
      }
    }
    lineages.setVisible(hudVisible && state.lineageView);
    bifurcation.setVisible(hudVisible && sweep !== null);

    // 7. Render.
    scene.draw({
      fieldTexture: sim.field.texture,
      pop: sim.pop,
      env: sim.env,
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
    if (snapshotRequested) {
      snapshotRequested = false;
      snapshotPng(canvas, `self-organizing-${stamp()}.png`);
    }
    if (sync) gl.finish();
    perf.workMs += (performance.now() - workStart - perf.workMs) * 0.05;

    hudTimer += dt;
    if (hudVisible && hudTimer > 0.25) {
      hudTimer = 0;
      hud.textContent =
        `${fps.toFixed(0)} fps · ${sim.pop.count} protocells · F ${effective.F.toFixed(4)} · k ${effective.k.toFixed(4)}` +
        ` · ${state.paused ? 'paused' : `${state.stepsPerFrame} steps/tick`}  ·  1–4 view · H hides UI`;
    }
    requestAnimationFrame(frame);
  };
  requestAnimationFrame(frame);
}

main();
