# Spec: Self-Organizing Digital System Simulator

Oct 20, 2026

## 1. Purpose and scope

Build a browser-based, real-time simulator in which order emerges, persists and adapts with no central controller, and make that process visible and interactive. It demonstrates the ideas in Capra's account of self-organization: dissipative structures, autopoiesis and cognition.

**The system is a "digital protocell ecology"**: a chemical-like field driven far from equilibrium (Gray–Scott reaction-diffusion) populated by simple agents (protocells) that feed on the field, maintain a boundary, reproduce and die.

**In scope:** a single-page web app, local run, no backend, deterministic seeded runs, live controls, live metrics, screenshot and video capture.

**Out of scope:** multiplayer, persistence beyond JSON presets, mobile layout, claims of biological realism. It is an illustrative model, not a validated one.

## 2. Concept map

Every feature exists to make one of Capra's ideas observable. If a feature maps to nothing here, cut it.

| Capra concept | Simulation feature | Observable result |
| --- | --- | --- |
| Dissipative structure | Continuous feed of reactant into the field; waste drained | Spots, stripes and waves form; they vanish when the feed stops |
| Bifurcation | Feed and kill rates as control parameters | Sweeping a parameter flips the field between distinct patterns |
| Order through fluctuations | Seeded noise at critical parameter values | Same parameters, different seeds, different stable patterns |
| Autopoiesis | Protocells build their own membrane and components from field resources | A protocell with its production cut off disintegrates |
| Organizational closure and structural coupling | Environment changes protocell inputs but never sets its internal rules | Same perturbation, different responses per protocell |
| Emergence | Colonies, fronts and clusters nobody coded | Group-level patterns appear in metrics, not in the code |
| Cognition (sense and respond) | Protocells follow the nutrient gradient and avoid toxin | Chemotaxis trajectories curve toward food |
| Resilience | Regeneration after local damage | A wiped region is recolonized without any repair rule |

## 3. Stack and architecture

Use TypeScript, Vite and WebGL2 only. Keep the field on the GPU and the agents on the CPU; do not add frameworks beyond those listed.

| Concern | Choice |
| --- | --- |
| Language and build | TypeScript (strict), Vite |
| Field simulation | WebGL2 ping-pong float textures, fragment shaders |
| Agents | CPU, typed arrays (structure of arrays), spatial hash grid |
| Rendering | WebGL2: field pass, instanced agent pass, bloom post-process |
| UI | Tweakpane for controls, uPlot for time-series plots |
| Tests | Vitest for agent and metric logic, Playwright for one smoke test |
| Randomness | Seeded PRNG (mulberry32); all stochastic code takes the PRNG as input |

Code layout: `src/field/`, `src/agents/`, `src/render/`, `src/metrics/`, `src/ui/`, `src/main.ts`. The simulation core must not import rendering or UI code, so it can run headless in tests.

### Frame loop

1. Read UI parameters and apply queued user actions (brush, damage, reset).
2. Step the field N times (default 8) on the GPU.
3. Read back a downsampled field (64×64) for agent sensing, once per frame.
4. Step agents: sense, move, metabolize, build, reproduce, die.
5. Write agent consumption and waste back to the field as a small update texture.
6. Update metrics every 10 frames.
7. Render field, agents, overlays, bloom.

## 4. Simulation model

Two coupled layers: a field that self-organizes physically, and agents that self-organize biologically on top of it.

### Layer 1: field (dissipative structure)

Gray–Scott reaction-diffusion on a 512×512 torus. `u` is nutrient (fed in continuously), `v` is the autocatalytic species. Use dt = 1, Laplacian with the 9-point stencil, Du = 0.16, Dv = 0.08.

```latex
\begin{aligned}
\partial_t u &= D_u \nabla^2 u - u v^2 + F(1-u) \\
\partial_t v &= D_v \nabla^2 v + u v^2 - (F+k)\,v
\end{aligned}
```

`F` (feed) is the energy-flux control parameter and `k` (kill) the dissipation parameter. Default F = 0.0367, k = 0.0649, a regime where spots grow and split. Setting F = 0 must remove the energy source and let the patterns decay.

### Layer 2: protocell agents (autopoiesis)

Each protocell stores position, heading, energy `E`, components `C`, membrane integrity `M` (0–1), age, lineage id and a 3-gene genome (sensing gain, motility, build efficiency). The closed production loop is the core rule:

1. **Feed:** take nutrient `u` at the agent's position; the field loses what the agent gains.
2. **Produce:** convert energy into components at a rate set by build efficiency.
3. **Repair:** components rebuild the membrane against constant decay.
4. **Retain:** a healthy membrane keeps energy; leakage grows as `M` falls.
5. **Move:** steer up the `u` gradient with noise; motion costs energy.
6. **Signal:** emit a small amount of `v` into the field, so agents feed back on the pattern.
7. **Divide** when `E` and `M` pass thresholds: split resources, copy the genome with Gaussian mutation. **Die** when `M` reaches 0, returning a burst of `v` to the field.

No rule may reference colony, front or pattern. Group behavior must emerge.

### Parameters

| Parameter | Default | Range | Role |
| --- | --- | --- | --- |
| F (feed) | 0.0367 | 0 – 0.08 | Energy flux; main bifurcation control |
| k (kill) | 0.0649 | 0.04 – 0.07 | Dissipation rate |
| Membrane decay | 0.01 per tick | 0 – 0.05 | Entropy pressure on agents |
| Division threshold | E ≥ 1.0, M ≥ 0.8 | – | Reproduction gate |
| Mutation sigma | 0.02 | 0 – 0.1 | Genome variation |
| Sensing noise | 0.3 | 0 – 1 | Steering randomness |
| Initial agents | 200 | 0 – 2000 | Seed population |
| Agent cap | 5000 | fixed | Hard safety limit |

## 5. Visualization requirements

The look is a dark, full-screen canvas with a glowing organic aesthetic and a minimal, collapsible HUD (key `H` hides all UI). Build Must items first; each Should and Could item is a toggle that defaults to off if it costs more than 10% of frame time.

| Priority | Feature | Requirement |
| --- | --- | --- |
| Must | Field render | Map `v` through a perceptual colormap (magma default, viridis alternate); modulate brightness with `u`; bicubic upsampling so patterns look smooth |
| Must | Protocell render | Instanced discs; membrane ring opacity = `M`, core brightness = `E`, hue = lineage derived from genome |
| Must | Bloom | Threshold plus two-pass Gaussian blur, strength slider, toggle |
| Must | Motion trails | Feedback buffer with decay 0.92 so paths of chemotaxis are visible |
| Must | Live plots | Population, mean energy, order parameter, entropy-export proxy (Section 6) |
| Should | Flow overlay | Animated particles streaming along the nutrient flux (−∇u) so energy flow is visible |
| Should | Bifurcation panel | Automatic sweep of F at fixed k; plots order parameter against F with the current F as a moving marker; shows hysteresis when sweeping up then down |
| Should | Lineage view | Stacked-area chart of lineage shares over time, colors matching the canvas |
| Should | Perturbation brush | Click-drag to add noise, nutrient or damage; visible ripple at the click point |
| Should | Network overlay | Lines between agents within signal range; thickness = signal coupling strength |
| Could | Height-map mode | 3D terrain of `v` with orbit camera |
| Could | Phase portrait | Trajectory of (mean `u`, mean `v`) over the last 30 s |
| Could | Capture | PNG snapshot and 10-second WebM recording via MediaRecorder |

View modes on hotkeys: `1` field only, `2` agents only, `3` both (default), `4` both plus network overlay. Smooth transitions: parameter changes ease over 0.5 s, never jump.

## 6. Controls and metrics

### Controls

| Control | Behavior |
| --- | --- |
| Sliders | F, k, membrane decay, mutation sigma, sensing noise, field steps per frame (1–16) |
| Run | Pause, single step, speed multiplier (0.25×–4×) |
| Reset | Seed input (integer); same seed and parameters must reproduce the same run |
| Cut flux | One toggle sets F to 0 and back; the signature demo of a dissipative structure |
| Damage | Wipe a circular region of field and agents |
| Presets | Mitosis (F 0.0367, k 0.0649), Coral (0.0545, 0.062), Worms (0.078, 0.061), Chaos (0.026, 0.051). Starting points to tune visually |
| State | Export and import parameters plus seed as JSON |

### Metrics (computed every 10 frames)

| Metric | Definition | What it shows |
| --- | --- | --- |
| Order parameter | Standard deviation of `v` over a 128×128 readback | About 0 when homogeneous; rises when patterns form |
| Dissipation proxy | Mean of `u·v²` over the field | Irreversible reaction rate, standing in for entropy production |
| Pattern wavelength | Peak of the radially averaged power spectrum of `v` | Characteristic size of the structure |
| Closure index | Share of agents whose repair rate over the last 50 ticks is at least their membrane decay | Fraction of agents that are self-maintaining |
| Population | Count, and number of distinct lineages | Growth, collapse, diversification |
| Mean energy | Average `E` across agents | Resource pressure |

All metrics are written to a rolling in-memory buffer (last 20,000 samples) and downloadable as CSV.

## 7. Acceptance tests

Each test checks one Capra concept from Section 2. Automate tests 4–7 headlessly with a CPU reference implementation of the field; tests 1–3 and 8 run in the browser via Playwright.

| # | Concept | Procedure | Pass criterion |
| --- | --- | --- | --- |
| 1 | Dissipative structure | Mitosis preset, run until stable, then cut flux | Order parameter falls below 10% of its pre-cut value within 30 s |
| 2 | Bifurcation | Sweep F from 0.02 to 0.07 at fixed k, up then down | At least one abrupt change (>3× in one step) in the order parameter; both curves plotted. Hysteresis is reported, never tuned in |
| 3 | Order through fluctuations | Same parameters, 10 different seeds | Fields pairwise uncorrelated (\|r\| < 0.2) while pattern wavelength stays within 15% |
| 4 | Autopoiesis | Set build efficiency to 0 | All agents reach `M` = 0 and die within 200 ticks; control run with production on keeps at least 50% alive after 1000 ticks |
| 5 | Structural coupling | Identical nutrient pulse to 50 agents with different genomes | Coefficient of variation of the energy response across agents > 0.1 |
| 6 | Resilience | Damage 25% of the area at steady state | Population recovers to at least 80% of its pre-damage level within 60 s; the code contains no repair rule |
| 7 | Determinism | Same seed and parameters, 1000 ticks, headless | Identical agent-state hash on two runs |
| 8 | Performance | 1920×1080, 512² field, 5000 agents, bloom on | At least 60 fps on an M1-class or discrete GPU |

If a test fails, report the measured value and do not adjust the threshold without telling the user.

## 8. Build plan and working rules

Build in this order. Do not start a milestone until the previous gate passes.

| Milestone | Deliverable | Gate |
| --- | --- | --- |
| M1 Field | Vite and TypeScript scaffold, GPU Gray–Scott, colormap, F and k sliders, presets | Patterns form and change with F and k; frame rate above 60 fps with field only |
| M2 Agents (headless) | Protocell rules, spatial hash, seeded PRNG, CPU reference field, unit tests | Tests 4 and 7 pass |
| M3 Coupling | Field readback for sensing, consumption and signal write-back, instanced agent render, trails | Tests 5 and 6 pass |
| M4 Metrics | All metrics, live plots, cut-flux toggle, damage tool, CSV export | Test 1 passes |
| M5 Visual polish | Bloom, flow overlay, network overlay, lineage view, brush | Test 8 passes with all Must items on |
| M6 Analysis | Bifurcation panel, capture, JSON state, presets complete | Tests 2 and 3 pass |

### Non-functional requirements

- **Browsers:** current Chrome, Edge and Firefox. Requires WebGL2 with float render targets; if missing, show a plain error message and stop.
- **Offline:** no network calls at runtime, no external fonts or assets.
- **Code quality:** strict TypeScript, no `any`, simulation core free of DOM and WebGL imports, each module under 300 lines.
- **Docs:** a README with run instructions and one line per Section 2 row saying how to see that concept in the app.

### Rules for Claude Code

1. Read this whole spec before writing code, and keep a short `PROGRESS.md` updated at the end of each milestone.
2. Run the tests and commit after each milestone.
3. Do not add dependencies beyond those in Section 3 without asking.
4. If a requirement is unclear or physically impossible, state the assumption in `PROGRESS.md` and continue with the simplest reading.
5. Never tune a threshold to make a test pass; report the measured value instead.
