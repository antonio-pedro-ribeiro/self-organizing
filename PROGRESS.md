# Progress

## M1 Field: code complete, gate NOT yet verified

Built: Vite and strict TypeScript scaffold, GPU Gray–Scott (RGBA32F ping-pong, 9-point Laplacian, torus), Catmull-Rom bicubic display with magma and viridis colormaps, Tweakpane controls (preset, F, k, cut flux, pause, single step, steps per frame, speed, seed, reset, colormap, v scale), eased parameter changes (about 0.5 s), FPS readout, `H` to hide UI.

**Not verified:** the M1 gate ("patterns form and change with F and k; above 60 fps with field only"). The shaders have never been run in a browser. Run `npm run dev` and check three things: the shaders compile (an error shows on screen if not), spots grow and split from the seeds with the Mitosis preset, and the HUD shows 60 fps.

**Fixed during M2:** the Laplacian used weights (−1, 0.2, 0.05), which approximate 0.3·∇², so effective diffusion was about 0.3× the spec's Du and Dv. On the CPU mirror, Mitosis spots never grew: about 4% coverage after 16,000 steps. The stencil is now normalised (−10/3, 2/3, 1/6). With it, spots spread to about 34% coverage. The weights live in `LAPLACIAN` in `src/field/presets.ts`, shared by the shader and the CPU field. This changes what the browser shows, so the M1 check above should use the fixed version.

## M2 Agents (headless): gate passed

M2 was started at the user's request while the M1 gate was still open. M2 is CPU-only and does not depend on the GPU path.

Built:
- `src/field/CpuField.ts`: CPU reference Gray–Scott, the same math as the shader. It implements the agents' `Environment` interface (nutrient, gradient, consume, emit).
- `src/agents/`: `Population` (structure of typed arrays, stable compaction, FNV-1a state hash), `SpatialHash` (counting-sort grid on a torus), `rules.ts` (feed, produce, repair, retain, move, signal, divide or die, then membrane separation), `seed.ts`, `params.ts`, and `World` (headless field plus agents).
- `gaussian()` in `src/util/prng.ts`.

Gate results (`npm test`, 34 tests):
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

### Open issue: no carrying capacity

In the control run the population hits the 5000 hard cap by about tick 200 and stays there. The field's feed refills nutrient far faster than agents can eat it, so food never limits growth; only the safety cap does. The cap is meant as a safety limit, not as the ecology. This would make test 6 (recovery to 80% of the pre-damage population) and the population plot uninformative. Options for M3, where consumption is coupled to the GPU field anyway: make agents much hungrier relative to the feed flux (graze an area, lower energy yield), raise maintenance costs, or add local crowding costs. This needs a decision before M3.

## Next

1. Confirm the M1 gate in a real browser, with the stencil fix.
2. Decide on carrying capacity (above).
3. M3: field readback for sensing, consumption and signal write-back, instanced agent render, trails; tests 5 and 6.
