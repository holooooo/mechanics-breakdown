# Shared contracts (main agent owns this file)

Project root: `/Users/xiechuyu/code/vibe/test/zelda-chemistry-engine`
Three.js: `node_modules/three` (0.170). Pages use an import map:
`"three": "./node_modules/three/build/three.module.js"`, `"three/addons/": "./node_modules/three/examples/jsm/"`.

## Folder ownership
| Path | Owner |
|---|---|
| `script.json`, `CONTRACT.md` | main |
| `src/sim.js`, `test/sim.test.mjs` | sim agent |
| `src/world.js`, `src/shaders/*`, `film.html`, `film.js`, `film.css`, `covers/*` | main (visuals) |
| `tools/*` (cdp, serve, render, build_voice.py, build_audio.py, srt), `build/`, `assets/audio*`, `sfx_cues.json` schema | pipeline agent |
| `index.html`, `app.js`, `site.css` (interactive preview) | later |

## 1. `src/sim.js` — deterministic chemistry grid (pure JS, no DOM, runs in Node + browser)

```js
export const N = 48;            // grid N×N
export const CELL = 0.25;       // world units per cell; grid spans x,z ∈ [-6, 6]
export const DT = 1/60;         // fixed step
export const MAT = { VOID:0, GRASS:1, SOIL:2, STONE:3, WOOD:4, METAL:5, WATER:6 };
export function createSim(layoutId = 'meadow', opts = {}) -> Sim
```
Cell index `i = z*N + x` (x = column, z = row). Cell centre world pos: `wx = (x - N/2 + 0.5)*CELL`, `wz = (z - N/2 + 0.5)*CELL`.

### Sim object
Typed-array fields (length N*N), all readable directly by the renderer:
- `mat: Uint8Array` (MAT ids; VOID = outside island)
- `temp: Float32Array` ambient 20, burning ~500–700, cap 900
- `wet: Float32Array` 0..1 (WATER cells are always 1)
- `fuel: Float32Array` 0..1 (GRASS ~0.8–1, WOOD 1 but burns slower, others 0)
- `burn: Float32Array` 0..1 burning intensity (0 = not burning; smooth fade-in/out ok)
- `ash: Float32Array` 0..1 burnt amount
- `ice: Float32Array` 0..1 ice mass on the cell (ice blocks sit on top of cells)
- `charge: Float32Array` 0..1
- `steam: Float32Array` 0..1 recent evaporation/quench intensity (for steam puffs, decays ~1s)
- `height: Float32Array` terrain height in world units (static per layout, gentle rolling, island edge drops)

Scalars / objects:
- `time` (seconds), `frame`
- `wind: {x, z}` current wind vector (units: cells/sec-ish bias; |w| up to ~2)
- `raining: 0..1` rain intensity (smooth)
- `updraft: {strength, x, z}` strength = Σ burn·something, (x,z) world-space heat centroid
- `glider: {x, y, z, vy, active}` paraglider body: when active, it drifts toward the updraft centroid horizontally and integrates vy from updraft strength minus gravity; y clamps [1.2, 7]. Physics must be plausible-looking (gentle spiral rise, not teleport).
- `sources: [{x,z}]` charge sources (world pos), `receivers: [{x,z,powered:boolean, poweredAt:number|-1}]`
- `layout` id

Methods:
- `schedule(events)` — replace the scheduled event list. Events `{t, type, ...}` with t in sim seconds:
  - `{type:'ignite', x, z, r=0.5}` world pos, radius world units — sets temp high on cells with fuel and wet<0.3 (rule: fire element applied to material)
  - `{type:'rain', on:true|false}` start/stop rain (intensity eases over ~1s)
  - `{type:'wind', x, z}` set wind vector (eased over ~0.5s)
  - `{type:'shock', on:true|false}` energise/de-energise all `sources`
  - `{type:'ice', x, z, r}` place ice blocks
  - `{type:'glider', on:true, x, y, z}` spawn/activate glider
- `seek(t)` — deterministic: state at sim time t is identical regardless of seek order (use snapshots every 1s + replay). Must be fast enough for frame-by-frame film rendering (forward seeks by 1/30s step only the needed ticks).
- `step(dt)` — realtime accumulator for interactive page (fixed DT ticks). Also `ignite/rain/setWind/shock` convenience methods for interactive use that apply immediately (they may append to the schedule at current time).
- `stats()` → `{time, burning, burnt, wet, iceMass, iceMelted, charged, maxTemp, updraft, raining, receiverPowered}` (counts = number of cells over threshold).

### Rules (must follow the GDC "three rules" framing — comment the code accordingly, it is shown on screen)
Keep each rule a small, readable function delimited by `//#region <name>` … `//#endregion` (regions: `cell`, `burn`, `heat`, `rain`, `melt`, `charge`, `updraft`) so the film can quote them. Code shown on screen should be short, clean, commented in Chinese.
1. Element → material: heat (fire element) ignites a cell when `temp > IGNITE (≈150) && fuel > 0.05 && wet < 0.3 && ice < 0.05`; burning consumes fuel, adds ash, keeps temp high; burn stops when fuel ~0 or wet > 0.35.
2. Element → element: rain / water raises wet and cools; hot cells next to wet cells evaporate wetness (steam field); heat melts ice (ice decreases, wet increases on that cell and neighbours, melted ice in a channel cell turns it into connected water: set wet≈1).
3. Material ↛ material: burning cells never set neighbours' `burn` directly; they only emit heat. Heat diffuses to 8 neighbours (diagonals weighted less), downwind neighbours receive extra (wind bias), cools toward ambient, wet cells cool faster.
- Charge: conductive = METAL or WATER or wet > 0.35, and ice < 0.05. Each tick charge = max over conductive 4-neighbours of neighbour.charge * 0.94 (per hop), sources set 1 while shocked; non-conductive → 0; decays fast when unpowered. Receiver powered when its cell charge > 0.2.
- Fire spread speed: on default grass with no wind, front advances ~0.6–1 cells/sec; with wind 1.5 clearly elongated downwind. A 1-cell-radius ignition on a 48² meadow should burn most grass in ~25–35 s and burn out behind the front (fuel consumed in ~4–6 s per cell). Rain at intensity 1 should extinguish a large fire within ~2–3 s.

### Layouts (deterministic, hash-based noise, no Math.random)
- `meadow`: round-ish island (radius ~5.6 world), mostly GRASS with fuel variation, a few SOIL paths, 3–4 STONE outcrops, 5–7 WOOD clusters (trees, 2×2 cells) — return their centres in `sim.trees: [{x,z}]`.
- `lab`: same island shape; the chain puzzle along the z≈0 line from west to east: a charge source at x≈-4.6 on a WATER channel (cells z∈[-1,1] from x=-4.8..-1.6), then a 1-cell-wide gap x∈[-1.6,-0.6] that is SOIL covered with an ICE block (ice=1; once melted the gap cells become wet≈1 → conductive), then a METAL rail x∈[-0.6, 4.2], ending at a receiver at x≈4.6. GRASS elsewhere, with dry grass patch next to the ice block (around x≈-1, z≈1.5) so a fire there melts the ice. Source/receiver stored in `sources`/`receivers`.
- `lift`: meadow variant with a big dry grass field in the middle (for a strong updraft) — may reuse meadow with a parameter.

### Tests `test/sim.test.mjs` (node, no deps)
Determinism (seek(20) fresh vs seek(5)→seek(20)→seek(3)→seek(20) identical arrays), fire spreads & burns out, wind elongates spread downwind, rain extinguishes, materials rule (a WOOD cell surrounded by SOIL gap of ≥3 cells next to a burning tree does NOT ignite when heat is zeroed — i.e., no direct burn propagation), ice melts near fire and lab chain powers the receiver when fire is lit by the ice and shock is on, not before. Perf: seek(60) from 0 under ~300 ms in Node.

## 2. Timeline (pipeline agent produces, main consumes)
`build/timeline.json` and `timeline.js` (`window.TIMELINE = {...}`):
```json
{ "duration": 201.3, "scenes": [ {"id":"hook","start":0,"end":19.2,
    "lines":[{"zh":"…","en":"…","start":0.6,"end":7.3}]} ],
  "subs": [ {"zh":"subtitle chunk ≤ 18 chars","en":"matching English chunk","start":0.6,"end":3.1} ] }
```
Scene `end` = next scene `start`. Film references times via line start/end, never hard-coded seconds.

## 3. SFX cues (main writes `sfx_cues.json`, pipeline mixes)
```json
[ {"scene":"burn","line":0,"offset":0.4,"type":"ignite"} ]
```
`type ∈ ignite | fire_loop(dur) | rain(dur) | thunder | steam | zap | power_on | whoosh | wind(dur) | chime | ui_tick | glider`. Absolute time = timeline line start + offset.
