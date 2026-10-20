# self-organizing

A browser-based simulator of a self-organizing digital system: a GPU reaction-diffusion field (Gray–Scott) that will be populated by protocell agents. It illustrates Fritjof Capra's account of self-organization: dissipative structures, autopoiesis and cognition. The full specification is in [SPEC.md](SPEC.md); current status is in [PROGRESS.md](PROGRESS.md).

## Run

Requires Node 20+ and a browser with WebGL2 and float render targets (current Chrome, Edge or Firefox).

```sh
npm install
npm run dev        # http://localhost:5173
npm test           # unit tests
npm run build      # typecheck and production build
```

Keys: `H` hides all UI, `Space` pauses.

## Seeing each concept in the app

| Concept | How to see it | Status |
| --- | --- | --- |
| Dissipative structure | Turn on **cut flux**: the pattern decays when the feed stops; turn it off and it regrows from the remaining seeds | M1 |
| Bifurcation | Drag **F** or **k** slowly, or switch presets: the field changes between spots, stripes and waves | M1 (automatic sweep panel in M6) |
| Order through fluctuations | Change the **seed** and press **Reset with seed**: same parameters, different pattern details | M1 |
| Autopoiesis | Protocells with production cut off disintegrate | M2–M3 |
| Structural coupling | Same perturbation, different response per protocell | M3 |
| Emergence | Colonies and fronts in the metrics | M3–M4 |
| Cognition | Chemotaxis trajectories curve toward food | M3 |
| Resilience | Damage tool, then watch recolonization | M4 |

## Layout

```
src/field/    Gray–Scott on the GPU, presets, initial state
src/render/   WebGL helpers, field renderer, colormaps
src/ui/       Tweakpane controls
src/util/     Seeded PRNG
tests/        Vitest unit tests
```
