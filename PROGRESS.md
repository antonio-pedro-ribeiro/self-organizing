# Progress

## M1 Field: code complete, gate NOT yet verified

Built: Vite and strict TypeScript scaffold, GPU Gray–Scott (RGBA32F ping-pong, 9-point Laplacian, torus), Catmull-Rom bicubic display with magma and viridis colormaps, Tweakpane controls (preset, F, k, cut flux, pause, single step, steps per frame, speed, seed, reset, colormap, v scale), eased parameter changes (about 0.5 s), FPS readout, `H` to hide UI.

Checks that ran: `npm run typecheck`, `npm test` (12 tests: PRNG, colormaps, presets, initial field), `npm run build`. All pass.

**Not verified:** the M1 gate ("patterns form and change with F and k; above 60 fps with field only"). The build environment had no browser or GPU, and the Chromium download was blocked, so the shaders have never been run. Someone needs to run `npm run dev` and check three things: the shaders compile (an error shows on screen if not), spots form from the seeds with the Mitosis preset, and the HUD shows 60 fps. M2 should not start until this is confirmed.

## Assumptions and deviations

- Added `@tweakpane/core` as a dev dependency. Tweakpane 4's type definitions import it, and without it typechecking fails. It is types only and is not in the SPEC.md section 3 list.
- Default `v` display scale is 0.35 and the initial state is 24 seeded square patches; both are untuned guesses.
- Preset values are the spec's starting points; none has been checked visually.
- Field is stored as RGBA32F with NEAREST sampling (linear filtering of float textures is not universal); bicubic upsampling is done in the display shader.
- Playwright (SPEC.md section 3) is not installed yet; it is first needed for tests 1–3 and 8.

## Next

1. Confirm the M1 gate in a real browser.
2. M2: protocell rules, spatial hash, CPU reference field, tests 4 and 7.
