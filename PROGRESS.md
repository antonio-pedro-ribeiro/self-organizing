# Progress

## M1 Field: gate passed

Built: Vite and strict TypeScript scaffold, GPU Gray–Scott (RGBA32F ping-pong, 9-point Laplacian, torus), Catmull-Rom bicubic display with magma and viridis colormaps, Tweakpane controls (preset, F, k, cut flux, pause, single step, steps per frame, speed, seed, reset, colormap, v scale), eased parameter changes (about 0.5 s), FPS readout, `H` to hide UI.

**Gate:** the user confirmed the browser check on 2026-10-20 (shaders compile, Mitosis spots form, 60 fps, patterns change with F and k).

**Fixed during M2:** the Laplacian used weights (−1, 0.2, 0.05), which approximate 0.3·∇², so effective diffusion was about 0.3× the spec's Du and Dv. On the CPU mirror, Mitosis spots never grew: about 4% coverage after 16,000 steps. The stencil is now normalised (−10/3, 2/3, 1/6). With it, spots spread to about 34% coverage. The weights live in `LAPLACIAN` in `src/field/presets.ts`, shared by the shader and the CPU field. 

## M2 Agents (headless): gate passed

Built:
- `src/field/CpuField.ts`: CPU reference Gray–Scott, the same math as the shader. (In M3 its per-cell sensing was replaced by the block coupling.)
- `src/agents/`: `Population` (structure of typed arrays, stable compaction, FNV-1a state hash), `SpatialHash` (counting-sort grid on a torus), `rules.ts` (feed, produce, repair, retain, move, signal, divide or die, then membrane separation), `seed.ts`, `params.ts`, and `World` (headless field plus agents).
- `gaussian()` in `src/util/prng.ts`.

Gate results at the time (`npm test`, 34 tests; M3 changed the numbers, see below):
- **Test 4, knockout:** with production cut, the last agent died at tick 118 (limit 200).
- **Test 4, control:** 5000 agents alive at tick 1000, from 200 at the start (needs at least 100).
- **Test 7:** two 1000-tick runs gave the identical hash `f00b851a`, and a different seed gives a different hash.

### Assumptions and deviations

- **Test field size:** headless tests use a 128² field, not 512². The CPU reference takes about 7 ms per tick at 128² and 4× that at 512². Rules are size-independent.
- **One tick:** 8 field steps followed by one agent step, matching the frame loop.
- **"Set build efficiency to 0" (test 4)** is a knockout flag, `productionCut`, that applies to every agent including offspring. Zeroing only the gene would let mutation restore production in daughters.
- **"Keeps at least 50% alive" (test 4 control)** is read as the population count being at least 50% of the initial count.
- **Division:** E and C are split in half, and both daughters keep the parent's M. A daughter starts half a radius away. The genome mutates per gene with Gaussian sigma, clamped to [0, 1]. Daughters inherit lineage id; each seeded agent starts its own lineage.
- **Spatial hash use:** the hash is used for membrane separation, so overlapping discs push apart. This is local physics, not a group rule.
- **Metabolic constants** (`METABOLISM` in `src/agents/params.ts`) are first guesses. They were not tuned against any test.

## M3 Coupling: gate NOT passed (test 6 fails since the follow-up below)

### Carrying capacity (user chose option 1: hungrier agents)

- **Grazing per block:** agents graze from their 8×8 block of field cells and sense u by bilinear interpolation of block means. In the browser this is the 64×64 readback of a 512² field; headless, the CPU field uses the same `BlockEnvironment`, so both run the same coupling.
- **Write-back conserves mass:** per block, u is multiplied by a factor so the block loses exactly the u mass grazed, and emitted v is spread evenly over the block.
- **Mass units:** amounts are now masses (concentration × cells). New constants: graze rate 20 per unit of local u, energy yield 0.002 per unit grazed, at most 50% of a block's u per tick. Signal is 0.1 v mass per tick. Death releases 16 v mass, which is 0.25 across one block: enough to seed a Gray–Scott spot.
- **What limits growth:** mostly local depletion. A grazing agent drains its own block faster than the feed refills it, so it must keep moving.
- **How the constants were chosen:** against design targets, not test thresholds. The targets were a carrying capacity below the 5000 cap that F controls, and no frozen state.
  - Graze 20 / yield 0.0015: population frozen at exactly 50; agents break even and never divide or die.
  - Graze 40 / yield 0.001: also frozen; agents strip their own block.
  - Graze 20 / yield 0.002: chosen.
- **Results at 128²:** the population settles around 250–420, and lower F gives fewer agents. **Results at 512²** (default 200 agents, Mitosis): 313 at tick 250, 2975 at 1000, then levelling off at 3899 by tick 3000, below the 5000 cap and still creeping up slowly. Mean u fell from 0.90 to 0.45, and spot coverage fell to 0% by tick 1250. The CPU reference takes about 130 ms per tick at 512².

**Trade-off to decide (not fixed):** agents and the Gray–Scott pattern compete for the same u. As the population evolves lower build efficiency (mean build falls from 0.5 to about 0.3), agents break even at lower u, graze mean u down to about 0.45, and the Mitosis spots die out (coverage 0% instead of about 34%). Setting the yield low enough to keep the pattern alive froze the population instead. Options: a cost floor that evolution can't lower (higher basal cost), a cap on how much a single agent can store, or accepting that a crowded ecology erases the pattern.

### Browser coupling and render

- `src/field/FieldCoupling.ts`: downsample pass (8×8 block means into a 64×64 RGBA32F target, read with `readPixels`) and apply pass (64×64 RG32F update texture). `GrayScott.pass()` runs an extra ping-pong pass.
- Frame loop (`src/main.ts`): one tick is the field steps, readback, agent step and write-back (SPEC.md section 3, steps 2 to 5). The speed slider now sets ticks per frame (at most 4), so field and agent rates stay locked. "Single step" steps one tick.
- `src/render/AgentRenderer.ts`: instanced discs, with ring opacity = M and core brightness = E. Hue is the hue of the genome (gain, motility, build) read as an RGB colour. "Hue = lineage derived from genome" was read this way, so drift shows as a colour shift. Discs are drawn at twice the physical radius so they read on screen.
- `src/render/Trails.ts`: RGBA16F feedback buffer with decay 0.92. Half floats are used because 8-bit trails never fade below 1/255.
- Controls: a Protocells folder (membrane decay, mutation sigma, sensing noise, cut production, initial agents applied on reset), view mode, and a trails toggle. Keys `1`, `2`, `3` switch view mode. View 4 (network overlay) is M5.
- The browser path has not been run yet: no browser here. It needs the same kind of check as M1.

### Gate results (`npm test`, 39 tests, 38 pass)

- **Test 5, FAILS:** CV of the energy response is **0.059** (needs above 0.1). Protocol: 50 genomes from the seeding distribution, each alone in a uniform environment with no noise and no division. 20 ticks at u = 0.5, then 10 ticks at u = 1. Response = final E minus final E of the same agent without the pulse. Mean response 0.158. The threshold was not changed. Cause: intake depends only on u, not on any gene, so all genomes take in the same extra energy. The genome only changes how much is spent on production (build) and movement (motility). For the test to pass honestly, a gene would have to shape the response itself, for example sensing gain scaling uptake. That is a model change and needs a decision.
- **Test 6, passes:** pre-damage mean 254.4 agents (last 200 of 2000 ticks). Wiping 25% of the area removed 66 agents; the lowest point was 191. The 100-tick moving mean reached 80% of the pre-damage level at tick 133 (2.2 s; limit 60 s). The criterion is weak: a 25% wipe leaves 75%, so recovery to 80% needs only a small rebound. No rule refers to damage or recolonization; recovery comes from ordinary division into the emptied area.
- **Tests 4 and 7, still pass with the new coupling:** knockout extinct at tick 121; control 125 agents at tick 1000 from 50; determinism hash `b6ffadc7` on both runs.

### Assumptions and deviations (M3)

- **Headless test population:** 50 initial agents on 128², because 200 on 128² would be 16× the default density of 200 on 512².
- **60 s = 3600 ticks** (one tick per frame at 60 fps).
- **Test 6 judging:** pre-damage level is the mean over the 200 ticks before damage; recovery is judged on a 100-tick moving mean.
- **Damage:** "wipe" resets the field to u = 1, v = 0 and removes the agents in the disc with no death burst. Core functions `World.damage`, `CpuField.wipe` and `wipeAgents` exist; the browser tool is M4.

### M3 follow-up (2026-10-20)

- **Test 5, model change (user decision):** sensing gain now also scales uptake, `grazeRate × (0.5 + gain) × u`. It carries an upkeep cost of 0.004 × gain energy per tick, so higher gain is a trade-off rather than a free gain. Test 5 now passes: CV **0.151**, mean response 0.165.
- **Ageing (user decision):** membrane decay is `membraneDecay × (1 + age / 2000)`, so no agent is immortal at break-even. This was added because the uptake cost put the 128² test population into a frozen state: exactly 50 agents for 2000 ticks, with no births or deaths.
- **Acceptance tests moved to 256² with 50 agents,** the same density as the default 200 on 512². The earlier 50 on 128² was 4× the default density. Whole suite: about 5 minutes.
- **512² with ageing** (default setup): 623 agents at tick 500, 2070 at 1000, then 2600–2800 from tick 1500 to 3000. Mean gain rises from 0.5 to 0.84 despite its cost. Mean u falls to 0.47, and spots are gone by tick 1500.
- **Test 6 now FAILS** at 256² default density. The seeded population never divides (exactly 50 at tick 1000), dies of old age as one cohort around tick 2000, and falls to 3 after damage with no recovery in 60 s. Tests 4, 5 and 7 pass.
- **Root cause, unresolved:** a seeded agent breaks even at about u = 0.78, which is almost exactly the Mitosis field's background u. Whether a population takes off depends on chance early conditions: it grows at 512², and freezes at 128² and 256². Two options are on the table and waiting for a decision:
  - give seeded agents a margin (break-even about 0.5), so populations grow reliably but erase the pattern;
  - redesign the energy model so agents cannot draw u below the pattern regime.

## M4 Metrics: gate passed (test 1)

Started at the user's request with the M3 gate still open (test 6).

Built:
- `src/metrics/`: order parameter (std of v), dissipation proxy (mean u·v², computed per cell in the readback shader, not from block means), pattern wavelength (radially averaged power spectrum of v via a radix-2 FFT, in field cells), closure index, population and distinct lineages, mean energy. `MetricsLog` is a 20,000-sample rolling buffer with CSV export.
- Metrics readback: a second `FieldCoupling` at block size 4 gives the 128×128 readback (R mean u, G mean v, B mean u·v²), every 10 frames.
- Live uPlot plots (population, mean energy, order parameter, dissipation), top left, about the last 100 s. `H` hides them with the rest of the UI.
- Damage tool: "click to damage" with a radius, plus a "Wipe 25% of the area" button. Queued wipes run at the start of a frame (GPU wipe pass plus agent removal). Also "Download metrics CSV". Cut flux already existed.
- Playwright (`npm run test:e2e`), using the installed Chrome (`channel: 'chrome'`), with no browser download. `?test` in the URL exposes `window.__selforg` for the tests.

Results:
- **Test 1, headless** (128², field only): stable at tick 960 with order parameter 0.1197. It fell below 10% of that 20 ticks (0.3 s) after the cut.
- **Test 1, browser** (512², field only, headless Chrome): stable order parameter 0.0990 at 60 fps. It fell below 10% 0.5 s after the cut.
- **Smoke test, browser, default app:** after 20 s there were 2519 protocells at 60 fps, with no page errors. Metrics: 199 lineages, mean energy 0.68, closure index 0.83, order parameter 0.023, and wavelength 512, meaning no pattern is left. This also covers the M3 browser check: discs, trails and plots render (screenshot in `test-results/`).
- `npm test`: 50 tests, 49 pass. Test 6 still fails, as recorded under M3.

Assumptions and deviations:
- **Test 1 runs field only** (0 agents), because the concept is the field's dissipative structure. With agents, the pattern is mostly grazed away before the cut.
- **"Run until stable"** means the order parameter is within 2% over 10 s (600 ticks headless; 6 samples 2 s apart in the browser).
- **Closure index:** "repair rate over the last 50 ticks" is an exponential moving average with a 50-tick window, for both repair and decay. An agent counts as self-maintaining when its repair is at least 0.95× its decay. With ageing, decay creeps up, so at steady state repair lags decay very slightly; a strict ≥ would read near 0 for healthy agents. The 0.95 is a reading of the definition; no test uses it.
- **Metrics `timeS`** is wall-clock seconds since the last reset.
- **Visual artefact:** death bursts show as hard-edged squares, because emitted v is spread evenly over an 8×8 block. For M5: smooth the emission in the apply shader.
- **Headless vs browser:** at the same density, the headless 256² test population freezes, while the 512² browser run grows (about 2500 agents after 20 s, matching the headless 512² run). This fits the break-even explanation under M3: whether a population takes off depends on early conditions.

## M5 Visual polish: gate passed (test 8)

Built:
- **Bloom (Must):** the scene renders into an RGBA16F target. A bright pass with a soft knee (threshold 0.55) and a two-iteration 9-tap separable Gaussian run at half resolution, and the composite has a strength slider (default 0.8) and a toggle (default on). `src/render/Bloom.ts`.
- **Scene:** `src/render/Scene.ts` owns every renderer and draws a frame. Renderers take a target framebuffer.
- **Network overlay (view 4, key `4`):** lines between agents within a signal range of 12 cells (about 1.5 blocks), with width and brightness scaled by coupling strength = 1 − distance/range. Built on the CPU with a spatial hash and drawn as instanced quads.
- **Flow overlay:** 3000 particles drift along −∇u from the latest readback. Visual only, with its own random stream.
- **Lineage view:** stacked shares of the 8 largest lineages over the last 300 samples. Each band uses the mean genome colour of its members, through `genomeColor`, which mirrors the shader. The rest show as grey.
- **Perturbation brush:** click-drag with mode noise (adds v), nutrient (pushes u toward 1), or damage (wipes field and agents), plus a radius. Expanding ripple rings mark the brush. It replaces M4's click-to-damage.
- **Smoother write-back:** the per-block update is interpolated bilinearly between block centres on both GPU and CPU, so death bursts no longer show as squares. Total v added stays exact; u removal is exact where a block's u is uniform and approximate elsewhere.
- **Asynchronous readback:** the agent readback (and the metrics readback) now goes through a pixel buffer and fence. Agents sense the newest finished readback, normally the previous frame's, so their CPU work overlaps the GPU's field steps. This took 5000 agents from 53.6 fps to 60 fps. Headless runs are unchanged, because the CPU World is synchronous.

Test 8 (`npm run test:e2e`) at 1920×1080, 512² field, 5000 agents, bloom on, all Must items on (field, discs, bloom, trails, plots):
- **60.0, 60.0, 60.0 and 60.1 fps** over 10-second windows in four runs, with the population held at 5000.
- **GPU:** Intel Iris Xe (integrated, through ANGLE/D3D11), which is below the spec's "M1-class or discrete GPU".
- **How 5000 is held:** 5000 is above the natural carrying capacity, so the test sets membrane decay to 0 (its slider minimum). Agents then don't die and every rule still runs.
- **Pass threshold:** the test uses ≥ 59.5 fps as "60 fps", because the frame callback is capped at the 60 Hz display rate.

Before async readback: 53.6 fps. In the browser the agent step costs about 7–8 ms at 5000 agents (3.1 ms in a Node benchmark with uniform positions; clustering costs more in membrane separation). The GPU field plus readback costs about 6.6 ms.

Overlay costs (10% rule), as frame work time with `?sync` (`gl.finish` at frame end), median of 3 interleaved runs, two repeats:
- **Flow:** +7.2% and +7.8%. Under 10%, but **default off** anyway, for headroom on this GPU and because it adds visual clutter. A judgment call; one toggle.
- **Network:** +24.9% and +21.6%. **Default off** (view 3).
- **Lineage view:** +3.0% and +1.8%. **Default on.**

Earlier single-sample measurements swung between −51% and +35%, so only the medians are used.

Other results:
- `npm test`: 51 tests, 50 pass.
- **Test 6 fails, and its earlier pass is no longer counted.** After the smoothing change it briefly "passed" vacuously: the frozen population of 50 lost only 9 to the wipe, and 41 is above the 80% target. The test now has a precondition that the wipe must leave the population below the recovery target, so it fails honestly ("expected 41 to be less than 40"). Root cause unchanged; see M3.
- Browser tests: tests 1 and 8, the overlay costs and the smoke test pass. Smoke test: 2649 protocells at 60 fps after 20 s.

Known issues:
- Chrome logs "READ-usage buffer was written, then fenced, but written again before being read back" for the readback buffer, about 256 times in 6 s (likely Chrome's cap). The fence is checked without blocking and 60 fps holds, so this is a slower read path, not a stall. Not resolved.
- Network lines between close agents are partly hidden under the discs, which are drawn on top.

## M6 Analysis: gate passed (tests 2 and 3)

Built:
- **F sweep and bifurcation panel:** `src/metrics/sweep.ts` holds the `SweepRunner`, abrupt-step detection and the hysteresis report. The panel (`src/ui/bifurcation.ts`) plots order parameter against F with the up (orange) and down (blue) branches and a dashed marker at the current F. It reports both transitions and the largest gap between the branches. Start it with "Run / stop F sweep (k fixed)".
- **Sweep protocol:** F from 0.02 to 0.07 in steps of 0.0025, up then down, at the current k. Each value is held 300 ticks, and the order parameter is averaged over the last 100.
- **Sweep perturbation (protocol decision):** at the start of each step, 4 seeded patches of the autocatalytic species are added, the same shape as the initial patches (`perturbationPatches`, `CpuField.seedPatches`, GPU `PATCH_FRAG`). Measured without them (128², headless), the order parameter was 0.000 at every F on both branches: once uniform, the field never leaves without a fluctuation, so the sweep shows nothing. This follows SPEC.md section 2, "seeded noise at critical parameter values".
- **Pattern wavelength:** the spectral peak is refined between frequency bins with a parabola through its neighbours, since whole bins are about 8% apart at Mitosis scale.
- **Capture:** PNG snapshot (taken inside the frame callback) and a 10 s WebM via MediaRecorder (VP9, then VP8 if unavailable, 8 Mbit/s).
- **JSON state:** export and import of parameters plus seed (`src/ui/stateJson.ts`). Import checks every value against its control's range, lists every problem, and changes nothing if any value is invalid. Missing fields keep their values; unknown fields are ignored. A successful import resets with the imported seed.
- **Presets:** each was run field only for 25 s at speed 4 (6000 ticks) at 512² and checked on screenshots.
  - Mitosis: spots, wavelength 12.2 cells.
  - Coral: a labyrinth filling the field, 11.5 cells.
  - Worms: spreading worm-like stripes.
  - Chaos: chaotic waves and rings.
  The values stay as the spec gives them; none needed retuning.
- **Refactor:** `src/field/BrowserSim.ts` (the GPU field coupled to CPU agents), `createDefaultState()` in controls, the test-hook type in `src/ui/testHook.ts`, and download and capture helpers. Every module is still under 300 lines (main.ts: 280).
- **Scripts:** `npm test` now runs the fast unit tests only; `npm run test:acceptance` runs the headless acceptance tests (about 10 minutes); `npm run test:e2e` runs the browser tests.

Results:
- **Test 2, headless** (128², Mitosis k 0.0649, field only): up branch 0.000 until F 0.0275, then 0.031 at 0.0300. Down branch: pattern held down to 0.0225 (0.036), then 0.000 at 0.0200. One abrupt step per branch. Hysteresis: jump up at F ≈ 0.0288, down at F ≈ 0.0213, largest gap 0.104 at F 0.0275.
- **Test 2, browser** (512²): up branch 0.000 until F 0.035, then 0.022 at 0.0375. Down branch held 0.056 at 0.0225, then 0.004 at 0.0200. One abrupt step per branch. The panel reported a jump up at F 0.0363, down at F 0.0212, and the largest gap 0.0938 at F 0.035. The window where the pattern can exist but doesn't arise on the way up is wider at 512², with the same hold time and 4 patches on a 16× larger area. Hysteresis is reported, not tuned.
- **Test 3, headless** (128², 1500 ticks, seeds 1–10): max pairwise |r| 0.109; wavelengths 11.8–12.6 cells, at most 4.7% from the median.
- **Test 3, browser** (512², 6000 ticks): max |r| 0.052; wavelengths 12.0–12.2, at most 1.3% from the median.
- **Capture and state, browser:** the PNG (239 KB) and WebM (17 MB, valid EBML header) download; the JSON export has the right values; re-import restored seed 4242 and F 0.05 and reset the run.
- **Full browser suite after the M6 refactor:** 7 of 7 pass. Test 1 fell below 10% 0.5 s after the cut; test 8 held 60.0 fps; the smoke test had 2547 protocells at 60 fps. The overlay costs were measured with a CPU-heavy headless run going in parallel (flow +14.7%, network +13.2%, lineage +2.1%), so they are noisier than in M5. Flow and network stay off by default either way.
- **Headless acceptance:** 7 of 8 pass. Test 6 still fails (frozen population; addressed next).

Assumptions:
- Tests 2 and 3 run field only (0 agents), because both concepts concern the field.
- **"Wavelength stays within 15%":** every seed's wavelength is within ±15% of the median across seeds.
- **Abrupt steps:** an order parameter below 0.001 counts as 0.001, so jumps between two near-uniform states are not reported as abrupt.
- **Test 3 duration:** run for a fixed time per seed (1500 ticks headless, 6000 in the browser), long enough for Mitosis to fill the field at each size.
- **Wavelength metric limit:** for patterns that do not fill the field (Worms and Chaos after 25 s), the largest-scale contrast dominates and the wavelength reads 512.

## Energy-balance decision (user, 2026-10-20): applied

**Decision:** agents **may** erase the Gray–Scott pattern; make seeded populations grow reliably so test 6 becomes a real test. The stated target was to lower break-even to about u = 0.5.

**What break-even actually was:** a median seeded agent (all genes 0.5) divides only once its energy reaches 1.0. With energy yield 0.002 that needs u ≈ 1.27 even with no competition, which is above the maximum of 1. So a typical seeded agent could never divide; only lucky genomes (low build) could. That is why 128² and 256² froze while 512² grew.

**Measured** (CPU reference, default density: 50 agents on 256², 200 on 512², Mitosis, 2500 ticks):

| Energy yield | 256² | 512² |
| --- | --- | --- |
| 0.002 (old) | frozen at 50 | grows only by chance (2600–2800) |
| **0.0025 (chosen)** | 50 → 365 (t500) → ~1000 from t1500, mean u 0.40 | 200 → 3052 (t500) → 4000–4200 from t750, mean u 0.36–0.39 |
| 0.003 | ~1250–1400, mean u 0.32–0.36 | **at the 5000 cap** from t500 |
| 0.0035 | ~1600–1740, mean u 0.29–0.31 | not run (above 0.003) |
| 0.005 | ~2400–3000, mean u 0.25 | **at the 5000 cap** from t250 |

**Deviation, stated plainly:** the literal target (break-even u ≈ 0.5, a yield of about 0.005) is incompatible with keeping the carrying capacity below the 5000 cap, which was the user's earlier option-1 decision. The lower agents' break-even, the further they graze u down and the more agents the feed supports. 0.0025 is the lowest tested yield that grows reliably at default density at both sizes, and it stays under the cap. With it, a median seeded agent still needs u ≈ 1.0 to divide. Growth comes from genetic variation, and selection then lowers build (0.5 → 0.25) and raises gain (0.5 → 0.8). The 512² population still creeps up slowly (4000 → 4213 between t1500 and t2500) as gain evolves; the remaining headroom to the cap is about 800.

**Results with 0.0025:**
- **Test 6 passes for real:** pre-damage mean 982.6 agents (256²); the 25% wipe removed 251 (25.5%), leaving 723 (73.6%, below the 80% target, so the precondition holds). The 100-tick moving mean was back to 80% at tick 181 (3.0 s, limit 60 s).
- **Unit tests:** 54 pass. The CPU field's Mitosis-growth test got an explicit 30 s timeout: it timed out at 6.7 s against Vitest's 5 s default when test files ran in parallel (it passes alone in about 5 s).
- **Full acceptance suite:** still running when this was committed; only test 6 had been run on its own (above). Results follow in the next commit.

## Next

1. Optional: a browser check that the default app population stays under the cap over long runs (512² headless: 4213 at t2500, slowly rising).
