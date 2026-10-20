# self-organizing

A browser-based simulator of a self-organizing digital system: a GPU reaction-diffusion field (Gray–Scott) that will be populated by protocell agents. It illustrates Fritjof Capra's account of self-organization: dissipative structures, autopoiesis and cognition. The full specification is in [SPEC.md](SPEC.md); current status is in [PROGRESS.md](PROGRESS.md).

## Run

Requires Node 20+ and a browser with WebGL2 and float render targets (current Chrome, Edge or Firefox).

```sh
npm install
npm run dev        # http://localhost:5173
npm test                 # unit tests
npm run test:acceptance  # headless acceptance tests 1–7 (about 10 minutes)
npm run test:e2e         # browser tests 1, 2, 3, 8, capture, smoke (Playwright, installed Chrome)
npm run build      # typecheck and production build
```

Keys: `H` hides all UI, `Space` pauses, `1`/`2`/`3`/`4` show field only, agents only, both, or both plus the signal network. Click-drag on the field with a **drag brush** mode set to add noise, add nutrient, or damage.

## Seeing each concept in the app

| Concept | How to see it | Status |
| --- | --- | --- |
| Dissipative structure | Turn on **cut flux**: the pattern decays when the feed stops (watch the order parameter plot fall); turn it off and it regrows from the remaining seeds. Turn on **flow overlay** to see nutrient streaming toward where it is consumed | M1, M5 |
| Bifurcation | Set initial agents to 0 and reset, then **Run / stop F sweep**: the panel plots order parameter against F going up and down, with the abrupt jump and the hysteresis loop | M6 |
| Order through fluctuations | Change the **seed** and press **Reset with seed**: same parameters, a different arrangement with the same spot spacing. **Export state JSON** saves parameters plus seed to reproduce a run | M1, M6 |
| Autopoiesis | Protocells with production cut off disintegrate (headless test 4 in M2; visible in M3) | M2–M3 |
| Structural coupling | Same perturbation, different response per protocell (headless test 5 currently fails; see PROGRESS.md) | M3 |
| Emergence | Watch the **plots** and the **lineage view**: population, order parameter and lineage shares change as colonies spread, with no colony rule in the code. Press `4` for the signal network | M4, M5 |
| Cognition | Turn on **trails**: protocell paths curve up the nutrient gradient, away from spots | M3 |
| Resilience | **Wipe 25% of the area** (or click to damage), then watch the population plot recover | M4 (headless test 6 currently fails; see PROGRESS.md) |

## Layout

```
src/field/    Gray–Scott on the GPU, CPU reference field, presets, initial state
src/agents/   Protocell rules, population storage, spatial hash, block coupling, headless world
src/render/   WebGL helpers, field, agent discs, trails, bloom, overlays, scene
src/metrics/  Order parameter, dissipation, wavelength, closure index, rolling log
src/ui/       Tweakpane controls, plots, input
src/util/     Seeded PRNG
tests/        Vitest unit tests
```
