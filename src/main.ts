import { GrayScott } from './field/GrayScott';
import { DEFAULT_PRESET, FIELD_SIZE, PRESETS, type FieldParams } from './field/presets';
import { FieldRenderer } from './render/FieldRenderer';
import { createGl } from './render/gl';
import { createControls, type UiState } from './ui/controls';

/** Parameter changes ease in over about half a second; they never jump. */
const EASE_TIME_CONSTANT_S = 0.12;

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
  };

  const field = new GrayScott(gl, FIELD_SIZE);
  const renderer = new FieldRenderer(gl, state.colormap);
  const effective: FieldParams = { F: state.F, k: state.k };
  let stepAccumulator = 0;
  let queuedFrames = 0;
  let hudVisible = true;

  field.reset(state.seed);

  const controls = createControls(state, {
    reset: () => field.reset(state.seed),
    step: () => {
      queuedFrames += 1;
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

    let steps = 0;
    if (queuedFrames > 0) {
      steps = state.stepsPerFrame;
      queuedFrames -= 1;
    } else if (!state.paused) {
      stepAccumulator += state.stepsPerFrame * state.speed;
      steps = Math.floor(stepAccumulator);
      stepAccumulator -= steps;
    }
    field.step(steps, effective);

    const side = Math.min(canvas.width, canvas.height);
    renderer.draw(field.texture, field.size, state.vMax, canvas.width, canvas.height, {
      x: Math.floor((canvas.width - side) / 2),
      y: Math.floor((canvas.height - side) / 2),
      size: side,
    });

    hudTimer += dt;
    if (hudVisible && hudTimer > 0.25) {
      hudTimer = 0;
      hud.textContent =
        `${fps.toFixed(0)} fps · F ${effective.F.toFixed(4)} · k ${effective.k.toFixed(4)}` +
        ` · ${state.paused ? 'paused' : `${state.stepsPerFrame} steps/frame`}  ·  H hides UI`;
    }
    requestAnimationFrame(frame);
  };
  requestAnimationFrame(frame);
}

main();
