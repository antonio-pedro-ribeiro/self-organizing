# Self-Organizing Field: User Manual

*Também disponível em português: [Manual do Utilizador](MANUAL_DO_UTILIZADOR.md).*

This manual explains what the simulator is for, how to use every setting, and how to read what you see on screen. You don't need any programming or biology background.

---

## 1. What this simulator is for

Living things, flames, hurricanes and cities have something in common: **order appears and lasts without anyone in charge**. Nobody draws the spots on a leopard or tells a flock of starlings where to turn. The order comes from many simple, local interactions, and it only lasts while energy keeps flowing through the system.

This simulator lets you watch that happen and experiment with it. It follows the ideas of the physicist and systems thinker Fritjof Capra:

- **Dissipative structures:** patterns that exist only while energy flows through them.
- **Autopoiesis:** "self-making". A living thing keeps rebuilding itself from what it takes in.
- **Cognition as sensing and responding:** even the simplest life senses its surroundings and reacts.

Everything on screen comes from two layers:

1. **A chemical field:** a sheet of two virtual chemicals that react and spread. Under the right conditions they form spots, stripes and waves on their own.
2. **Protocells:** thousands of tiny simple "cells" that live in the field. They feed on it, keep their skin repaired, move toward food, divide, and die.

No rule anywhere in the program says "form a colony", "make a front" or "repair the damage". When you see those things, they are emerging on their own.

> This is an illustrative model, built to make ideas visible. It is not a validated model of real biology or chemistry.

---

## 2. The big idea in one picture: a pond fed by a stream

Picture a shallow **pond fed by a stream**.

- The **stream** brings fresh **food** into the pond all the time.
- Where the food is rich, **algae blooms** appear and spread. Left alone, the blooms arrange themselves into regular spots or winding bands.
- Tiny **creatures** live in the pond. Each one eats, uses some of that food to **patch its own skin**, swims toward richer water, splits in two when it's well fed, and **dissolves** when its skin fails. When it dissolves, its remains feed a new bloom.
- **Dam the stream** and the blooms fade, the creatures starve, and the pond goes still. The order was never "in" the pond. It lived in the flow of food through it.

Everything in the simulator maps onto this picture:

| In the pond | In the simulator | The idea it shows |
| --- | --- | --- |
| The stream's inflow of food | **F (feed)**: how fast nutrient is added | Energy flux keeps order alive (*dissipative structure*) |
| Food dissolved in the water | **u**, the nutrient | The resource everything depends on |
| Algae blooms | **v**, the second chemical, shown as colour | Patterns that form on their own |
| How fast blooms die back | **k (kill)** | Dissipation: how fast order decays |
| Changing the stream's flow | Moving **F** or running an **F sweep** | Small changes can flip the whole pattern (*bifurcation*) |
| Where the first blooms happened to start | **seed** | Chance decides the details, not the overall style (*order through fluctuations*) |
| A creature | A **protocell** (a small ring) | A self-maintaining unit |
| A creature patching its own skin | Membrane repair from its own components | *Autopoiesis* |
| Swimming toward richer water | Steering up the nutrient gradient | *Cognition* as sensing and responding |
| Two creatures reacting differently to the same rain | Same nutrient pulse, different response per genome | *Structural coupling* |
| Groups of creatures nobody organized | Colonies and fronts | *Emergence* |
| The pond refilling after a storm | Regrowth after you wipe an area | *Resilience* |

Keep this picture in mind; the rest of the manual refers back to it.

---

## 3. Quick start

1. Open the simulator in a current version of Chrome, Edge or Firefox. If it was set up for you, open the link you were given; to run it yourself, see the README (`npm install`, then `npm run dev`, then open `http://localhost:5173`).
2. It starts running at once with the **Mitosis** preset and 200 protocells.
3. Watch the first minute:
   - **0–5 s:** small bright squares, the first "blooms", round off and grow into glowing spots. Coloured rings, the protocells, are scattered across the field and start to wander.
   - **5–20 s:** spots grow and split. Protocells multiply, and their trails show them drifting away from the spots toward richer water.
   - **20–60 s:** protocells spread into colonies. Where they crowd, they eat so much nutrient that the spots fade. The plots on the left track all of this.
4. Press `H` to hide every panel and just watch. Press `H` again to bring them back.

---

## 4. The screen at a glance

```
┌──────────────┬──────────────────────────────────┬──────────────────┐
│ PLOTS        │                                  │ CONTROL PANEL    │
│ Population   │                                  │ Chemistry        │
│ Mean energy  │          THE FIELD               │ Run              │
│ Order param. │   (the pond, seen from above)    │ Protocells       │
│ Dissipation  │                                  │ Perturb & record │
│ Lineages     │                                  │ Analysis/capture │
│ Bifurcation* │                                  │ Look             │
├──────────────┴──────────────────────────────────┴──────────────────┤
│ HUD: 60 fps · 2547 protocells · F 0.0367 · k 0.0649 · ...            │
└──────────────────────────────────────────────────────────────────────┘
  * The bifurcation panel appears only while or after you run an F sweep.
```

The field is a square that **wraps around** at its edges, like a video game map: a protocell that leaves on the right comes back on the left.

---

## 5. Reading the visual output

### 5.1 The field (the pond water)

- **Colour shows v, the "bloom" chemical.** With the default **magma** colour map, near-black means no bloom; purple, then orange, then pale yellow mean more and more.
- **Brightness also follows u, the nutrient.** Nutrient-rich water looks slightly lighter; depleted water looks darker and bluer.
- **Glow:** with **bloom** on, the brightest areas get a soft halo. It's purely visual.

Typical patterns:

| What you see | What it means |
| --- | --- |
| Even, dark field | No pattern: either nothing has started yet, or the order has died out |
| Round glowing spots that split | **Mitosis**-style self-replicating spots |
| Winding bands filling the field | **Coral**-style labyrinth |
| Bands spreading from a few places | **Worms** |
| Rings, waves and churning shapes | **Chaos**: patterns that never settle |

### 5.2 Protocells (the creatures)

Each protocell is a small disc:

```
     ○      ring  = membrane (skin) health: solid ring = healthy, faint ring = failing
    (●)     core  = energy: bright core = well fed, dim core = hungry
```

- **Colour** comes from the cell's three genes (sensing gain, motility, build efficiency). Daughters inherit their parent's genes with small random changes, so **related cells share a colour**, and a slow colour drift across a colony is evolution happening.
- **Trails** (thin fading streaks) show where cells have been. Paths that curve toward richer, darker-in-v water show cells *sensing and responding*.
- When a cell dies, it releases a puff of the bloom chemical, so you may see a small glow appear where it was.

### 5.3 Overlays

| Overlay | How to turn it on | What it shows |
| --- | --- | --- |
| **Trails** | Look ▸ trails (on by default) | Recent paths of protocells |
| **Signal network** | Press `4`, or Look ▸ view ▸ "Both + network (4)" | Light-blue lines between cells close enough to affect each other; closer pairs get thicker, brighter lines |
| **Flow** | Look ▸ flow overlay | Faint drifting particles that follow nutrient as it moves from rich water toward where it's being eaten, like watching the current in the pond |
| **Brush ripples** | Use the drag brush | Rings marking where you touched the field |

The network and flow overlays cost frame rate, so they start switched off.

### 5.4 The status line (HUD)

`60 fps · 2547 protocells · F 0.0367 · k 0.0649 · 8 steps/tick · 1–4 view · H hides UI`

- **fps:** frames per second. 60 is smooth.
- **protocells:** how many creatures are alive right now.
- **F and k:** the values the simulation is actually using. They glide to a new setting over about half a second, so they may lag the slider briefly.
- **steps/tick, or paused:** how much chemistry runs per simulation tick, or whether the run is paused.

### 5.5 The plots

All plots scroll and show about the last 100 seconds.

| Plot | What it measures | In the pond picture | How to read it |
| --- | --- | --- | --- |
| **Population** | Number of living protocells | How many creatures | Rises while food is plentiful, levels off when food runs short, drops after damage or starvation |
| **Mean energy** | Average stored energy per cell | How well fed they are on average | Falls when crowding makes food scarce |
| **Order parameter (std v)** | How uneven the bloom chemical is across the field | How much pattern there is | Near 0 = flat, no pattern; higher = strong spots or bands. **The key indicator of order.** |
| **Dissipation proxy (mean u·v²)** | How fast the reaction runs overall | How hard the pond is "working" to keep its blooms | Rises with active patterns and falls to 0 when they die. It stands in for the energy the structure uses up. |

A common sight with protocells on: the order parameter **rises for 10–20 seconds and then falls**. The spots form, then the growing population grazes the nutrient away and the spots fade.

### 5.6 Lineage view

**Lineage shares (top 8)** is a stacked chart. Each band is one family line (all the descendants of one starting cell), coloured like its members on the field. Band height is that family's share of the population; grey is everyone else.

- Bands **widening** over time: a family is taking over.
- **Many thin bands:** a diverse population.
- One band filling everything: one ancestor's descendants won.

### 5.7 Bifurcation panel

This appears when you run an **F sweep** (section 6.5). It plots the **order parameter against F**:

- The **orange** line is the sweep going **up** (F increasing).
- The **blue** line is the sweep going **down**.
- The **dashed vertical line** is the current F.

How to read it:

- A sudden **cliff** in a line is a *bifurcation*: a tiny change in the feed flipped the whole pond from "no pattern" to "pattern" or back.
- If the two lines **don't overlap**, that's *hysteresis*: the pond remembers its past. Going down, patterns survive at feeds where, going up, they hadn't formed yet. Once it's patterned, the pond holds on.
- The line underneath summarizes it, for example: *"Done: 2 jumps over 3×; jump up at F 0.0363, down at F 0.0212; max gap 0.0938 at F 0.0350"*.

---

## 6. Using the controls

The control panel is on the right. Click a folder title to collapse or expand it. Changes take effect at once unless noted.

### 6.1 Chemistry: the stream and the blooms

| Setting | Range (default) | What it does |
| --- | --- | --- |
| **preset** | Mitosis, Coral, Worms, Chaos (Mitosis) | Sets F and k to a known pattern style. Pick one, then press **Reset with seed** for a clean start. |
| **F (feed)** | 0 – 0.08 (0.0367) | How fast nutrient flows in. **Main control.** Too low and blooms starve; changing it can flip the pattern type. |
| **k (kill)** | 0.04 – 0.07 (0.0649) | How fast the bloom chemical decays. Small changes here change the pattern style a lot. |
| **cut flux** | on/off (off) | Dams the stream: sets F to 0. Patterns fade within about a second. Turn it off again quickly to see them recover; wait too long and the pond stays empty until something reseeds it (try the noise brush). |

Presets as they look in this simulator (field only):

| Preset | F, k | Look |
| --- | --- | --- |
| **Mitosis** | 0.0367, 0.0649 | Round spots that grow and split |
| **Coral** | 0.0545, 0.062 | A dense maze of bands |
| **Worms** | 0.078, 0.061 | Worm-like bands spreading out |
| **Chaos** | 0.026, 0.051 | Restless waves and rings |

### 6.2 Run: time and randomness

| Setting | Range (default) | What it does |
| --- | --- | --- |
| **paused** | on/off (off) | Freezes the simulation; the picture stays. `Space` toggles it too. |
| **Step one tick** | button | While paused, advances exactly one tick. Useful for following single cells. |
| **field steps/tick** | 1 – 16 (8) | How much chemistry runs per tick. Higher makes the patterns evolve faster relative to the protocells, but costs speed. |
| **speed** | 0.25× – 4× (1×) | Ticks per screen frame. 0.25× is slow motion; 4× fast-forward. Above 1×, the frame rate may drop on slower machines. |
| **seed** | 0 – 99999 (1) | The "dice" for the starting blooms and protocells. Same seed and same settings give the same start. |
| **Reset with seed** | button | Restarts the run from the current seed, preset and protocell settings. Clears the plots. |

### 6.3 Protocells: the creatures

| Setting | Range (default) | What it does |
| --- | --- | --- |
| **membrane decay** | 0 – 0.05 (0.01) | How fast every cell's skin wears out per tick. Higher means a harsher world: cells must work harder to stay alive. Membranes also wear faster as cells age. |
| **mutation sigma** | 0 – 0.1 (0.02) | How much a daughter's genes differ from its parent's. 0 means perfect copies; higher means more variety and faster colour drift. |
| **sensing noise** | 0 – 1 (0.3) | How randomly cells steer. 0 means they head straight for food; 1 means they mostly wander. |
| **cut production** | on/off (off) | **Knockout experiment:** no cell can make new skin material. Watch every cell's ring fade and the whole population die within about 2 seconds. |
| **initial (on reset)** | 0 – 2000 (200) | How many cells to start with at the next **Reset with seed**. Set to **0** to study the field on its own. |

The three genes each cell carries:

- **Sensing gain:** how strongly it steers toward food, and how much it can take in (at an energy cost).
- **Motility:** how fast it swims. Moving costs energy.
- **Build efficiency:** how much energy it spends making skin material. Too little and its skin fails; too much wastes energy.

### 6.4 Perturb and record: poking the pond

| Setting | What it does |
| --- | --- |
| **drag brush** | Choose what click-and-drag on the field does: **Off**; **Add noise** (sprinkles the bloom chemical, which can seed new patterns); **Add nutrient** (enriches the water); **Damage** (wipes the field and any cells under the brush). A ripple marks each touch. |
| **brush radius** | Size of the brush in field cells (4 – 200, default 24). The field is 512 cells across. |
| **Wipe 25% of the area** | Wipes a disc covering a quarter of the field in the centre: the standard resilience experiment. |
| **Download metrics CSV** | Saves every recorded measurement (up to the last 20,000 samples) as a spreadsheet file. |

### 6.5 Analysis and capture

| Button | What it does |
| --- | --- |
| **Run / stop F sweep (k fixed)** | Automatically steps F from 0.02 up to 0.07 and back down, holding each value about 5 seconds at speed 1×, and draws the bifurcation panel. At each step it sprinkles a few tiny seeds of bloom so a pattern *can* form if conditions allow. It takes a few minutes at 1×; set **speed** to 4× to go faster. Press again to stop. For the clearest result, set **initial** to 0 and press **Reset with seed** first. |
| **Snapshot PNG** | Saves a picture of the current screen. |
| **Record 10 s WebM** | Records the next 10 seconds as a video file. |
| **Export state JSON** | Saves all settings plus the seed, so you or someone else can reproduce the run. |
| **Import state JSON** | Loads a saved settings file and restarts with its seed. Invalid files are refused with a list of what's wrong, and nothing changes. |

### 6.6 Look

| Setting | Default | What it does |
| --- | --- | --- |
| **view** | Both (3) | Field only (1), agents only (2), both (3), or both plus network (4). Keys `1`–`4` do the same. |
| **trails** | on | Fading paths behind cells |
| **bloom** | on | Glow around bright areas |
| **bloom strength** | 0.8 | How strong the glow is (0 – 2) |
| **flow overlay** | off | Particles showing nutrient flow |
| **lineage view** | on | The family-share chart in the plots column |
| **colormap** | Magma | Magma (black→purple→orange→yellow) or Viridis (purple→teal→yellow) |
| **v scale** | 0.35 | How much bloom chemical counts as "full colour". Lower it if the field looks dim; raise it if everything is washed out. |

---

## 7. Keyboard and mouse

| Input | Action |
| --- | --- |
| `H` | Hide or show all panels |
| `Space` | Pause or resume |
| `1` / `2` / `3` / `4` | Field only / agents only / both / both plus network |
| Click-drag on field | Apply the current **drag brush** (when it isn't Off) |

---

## 8. Guided experiments

Each experiment shows one idea from the pond picture. Start each one with **Reset with seed** unless it says otherwise.

### 8.1 Order needs a flow (dissipative structure)
1. Set **initial** to 0, press **Reset with seed**, and wait until the spots fill the field and the **order parameter** plot levels off.
2. Turn on **cut flux**.
3. **Look for:** the spots fade in about a second, and the order parameter and dissipation plots drop to almost zero. The pattern was never stored anywhere; it existed only while food flowed.
4. Turn **cut flux** off. Nothing comes back by itself. Use the **Add noise** brush to reseed it.

### 8.2 Tipping points and memory (bifurcation, hysteresis)
1. Set **initial** to 0, **Reset with seed**, set **speed** to 4×.
2. Press **Run / stop F sweep**.
3. **Look for:** a cliff in the orange (up) line where patterns suddenly appear, and a blue (down) line that stays high to lower F before dropping. The gap between them is the pond's memory.

### 8.3 Same rules, different details (order through fluctuations)
1. Set **initial** to 0. Reset with seed 1 and snapshot it once the spots fill the field.
2. Change **seed** to 2 and reset again.
3. **Look for:** a completely different arrangement of spots with the **same spacing**. Chance placed them; the rules set their size.

### 8.4 Life rebuilds itself (autopoiesis)
1. Start with the default 200 cells and let them spread for 10 seconds.
2. Turn on **cut production**.
3. **Look for:** rings fading on every cell, then the population plot falling to zero within about 2 seconds. A cell that can't rebuild itself can't exist.

### 8.5 Same push, different responses (structural coupling)
1. Let a mixed-colour population develop for 20–30 seconds.
2. Choose **Add nutrient** as the drag brush and paint across a group of cells.
3. **Look for:** cells of different colours (different genes) responding differently. Some brighten and divide quickly; others barely change. The environment triggers the response, but each cell's own make-up decides what it is.

### 8.6 Nobody is in charge (emergence)
1. Run the default for a minute. Press `4` for the network view.
2. **Look for:** colonies, chains and fronts of cells, and the lineage chart showing some families taking over. None of this is written in the rules; each cell only eats, repairs, steers, divides or dies.

### 8.7 Swimming toward food (cognition)
1. Lower **sensing noise** to about 0.1 and keep **trails** on.
2. **Look for:** trails that curve smoothly away from the glowing spots (where nutrient is used up) toward richer water.

### 8.8 Bouncing back (resilience)
1. Let the population grow until the **Population** plot levels off.
2. Press **Wipe 25% of the area**.
3. **Look for:** a dip in the population plot, then cells from the edges dividing into the empty area until the plot recovers. There is no repair rule; the gap is refilled by ordinary growth.

---

## 9. Saving and sharing

- **Reproduce a run:** use **Export state JSON**; whoever loads it with **Import state JSON** gets the same settings and seed. The start is identical. Long browser runs can drift slightly between computers, because graphics cards round numbers differently.
- **Analyse the numbers:** **Download metrics CSV** gives one row per sample (every 10 frames) with these columns:

| Column | Meaning |
| --- | --- |
| `tick` | Simulation ticks since reset |
| `timeS` | Seconds since reset |
| `F`, `k` | Feed and kill values in use |
| `population`, `lineages` | Living cells and distinct family lines |
| `meanEnergy` | Average energy per cell |
| `closureIndex` | Share of cells whose skin repair keeps up with wear (self-maintaining cells) |
| `orderParameter` | How much pattern there is |
| `dissipation` | How hard the reaction is working |
| `wavelength` | Typical pattern spacing in field cells. It reads 512 when the field has no regular pattern, or when the pattern hasn't spread across the whole field. |

- **Show others:** **Snapshot PNG** or **Record 10 s WebM**.

---

## 10. Performance tips

- The HUD shows **fps**. Below about 50, motion starts to stutter.
- The **network** and **flow** overlays are the most expensive extras; switch them off first.
- **Speed** above 1× and **field steps/tick** above 8 also cost frames.
- A larger browser window means more pixels to draw.

---

## 11. Troubleshooting

| Problem | What to do |
| --- | --- |
| A plain error message instead of the simulator | Your browser or graphics card lacks WebGL2 with float render targets. Try a current Chrome, Edge or Firefox, with hardware acceleration enabled in the browser settings. |
| Field is all dark | Nothing is patterning: F may be 0 (is **cut flux** on?), the pattern may have died out, or **v scale** may be too high. Try **Reset with seed** or the noise brush. |
| Everything looks washed out | Lower **bloom strength** or raise **v scale**. |
| No protocells | **initial** was 0 at the last reset, or the population died (did you cut production?). Set **initial** above 0 and reset. |
| Brush does nothing | Pick a mode other than **Off** in **drag brush**. |
| The bifurcation panel is missing | It only appears after you start an F sweep. |
| Import refused | The file has an out-of-range or mistyped value; the message lists each one. |

---

## 12. Glossary

- **Autopoiesis:** "self-making"; a system that continuously rebuilds the parts it's made of.
- **Bifurcation:** a point where a small change in a setting causes a sudden change in behaviour.
- **Dissipative structure:** an ordered pattern that exists only while energy flows through it.
- **Emergence:** group-level patterns that no individual rule describes.
- **Gradient:** the direction in which a quantity, here nutrient, increases.
- **Hysteresis:** when a system's state depends on its history, so going up and coming down follow different paths.
- **Lineage:** all descendants of one original protocell.
- **Order parameter:** a single number for how much pattern there is.
- **Protocell:** a minimal life-like unit: a boundary, a metabolism, and the ability to divide.
- **Seed:** the number that fixes all the "random" choices of a run.
- **Structural coupling:** the environment triggers changes in a system, but the system's own structure decides what those changes are.
- **u, v:** the two chemicals. u is the nutrient (the food in the pond); v is the autocatalytic "bloom" chemical that makes the patterns.

---

## 13. Honest limits

- The simulator illustrates ideas; it doesn't predict real organisms or reactions.
- Protocells and blooms compete for the same nutrient. With many protocells, they graze the water so hard that the spots fade where the protocells crowd. This is deliberate, but it means the field's own patterns are best studied with **initial** set to 0.
- There is a hard limit of 5000 protocells for safety and speed.
