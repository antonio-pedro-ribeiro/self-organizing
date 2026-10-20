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

## Next

1. Decide the energy-balance question above (test 6 and the agent–pattern trade-off).
2. Run the browser check for M3: agents visible, trails, view modes, frame rate.
3. M4 was started at the user's request with the M3 gate still open (test 6).
