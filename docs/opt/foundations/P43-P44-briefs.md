# P43 + P44 briefs (2026-11-08)

Grounded on `P43-P44.md`, `P39.md`, `P40.md`, the 10 prompt files, and grep/Read ranges of the code. Nothing built, no game code edited. Corrections to the prompts are in `P43-P44-spec-patch.json` (prompt_fixes); each brief below states the final rule, so the worker does not need the prompt text.

## 0. Decisions (resolved here)

| # | Question | Decision | Why (fact) | Rejected |
|---|---|---|---|---|
| D1 | Start gate | P43/P44 stay Blocked until P39a, P39b, P39c and P40b are merged. | P43b needs `isOverPig`/edit mode from P40b; P44a needs `isFree` from P39c. | Start P43a on P39a alone (not enough for P43b-d). |
| D2 | Farm plot count (P43a H5) | Data holds 12 `plot:0..11` hotspots. Runtime shows `plot:i` only while `i < f.plots.length`. No `plotCount` in data. | Count is state: `farm/feature.js:135` (`f.plots`), mock `plotsOwned=4`, `MAX_PLOTS=12` (`farm/mock.js:20,27`). Server start count is `FarmConfig.StartPlots` (`Pet.Farm.cs:37`). | `plotCount` in data (goes stale on expansion). |
| D3 | Toys (P43e O2) | Dropped. No toy code remains (grep of canvas-pig, places, garden, rooms: 0 hits). `walkToToy` is not needed. | Toys removed in commits 771ce41, a1a98a7. | Re-adding a toy API. |
| D4 | Room lamps (P43e) | Do NOT add `rooms/feature.js`. Scene lamp toggles live in `places/feature.js`, in an object `lampToggles` keyed by item uid, passed as the `toggles` argument of `Lights.activeSources` (as P39d). `garden/feature.js` is removed from P43e (not needed). | Garden store `garden/feature.js:43,230-235` and rooms store `rooms/feature.js:44,212-218` are module-local; exposing them means editing two more modules. | Exposing `toggleLamp` from garden and rooms as globals. |
| D5 | Food bowl (P43e O4) | Dropped unless step 1 finds an existing open function. Current finding: no food-drawer symbol in `web/home` (`food` matches only shop/tricks/coloring/calendar/achievements, none is a drawer). Log the drop. | grep. | Writing a new food drawer (out of scope). |
| D6 | Gramophone (P43e O3) | Use the existing `.room-gramophone-trigger` only if step 1 finds an open function in `features/music/player.js` (trigger line 117). Otherwise drop O3 and log. | No exported show-player function found. | Calling DOM `click()` on a window-only element. |
| D7 | Strip farm/market windows (P43f) | Remove only the More tiles and `openFeature('farm'\|'market')` calls in `app.js`. Keep the ids in `features/index.json` (the modules must stay loaded; they host the scene panels from P43c/d). Dead window code stays. | `farm/feature.js` and `market/feature.js` are not in P43f Zmieniaj, and removing their ids would unload the panels. | Removing ids (breaks P43c/d). |
| D8 | Edge take-out (P44a) | Above/below: 12 px outside the canvas rect, as now (`canvas-pig.js:699-706`). Left/right: 40 px outside, and only when that side has no neighbour. | Current check is 12 px on all four sides (`canvas-pig.js:699`). | Keep 12 px on all sides (takes the pig out when a neighbour exists). |
| D9 | Ring wrap (P44b) | `CuyScenes.neighbor` wraps around the ring (`scenes.js:271-281`); it does NOT skip locked scenes. A neighbour exists when `neighbor(id,±1,st) !== id`. Locked neighbour: toast (pattern `places/feature.js:209`), no switch. | Verified in code. | Treating wrap as "no neighbour" (would hide the right edge). |
| D10 | onDrop payload (P44a) | `onDrop({x,y})`. The canvas does not know the scene id; `places/feature.js` adds it. | Canvas has no scene id (`canvas-pig.js` has `setScene(def)` only). | `onDrop({x,y,scene})` (prompt). |
| D11 | Overlay markers (P43d) | Drawn on the main canvas with `CanvasPig.addLayer(name,z,fn)` (`canvas-pig.js:351`) at rects from `CanvasPig.getHotspots()`. The bulk strip is a DOM element in `.stage-viewport`. | DOM markers would need the canvas scale transform, which P39c changes. | DOM markers positioned by hand. |
| D12 | Hover/click API (P43b) | `CanvasPig.setHotspots(list)`, `CanvasPig.getHotspots()`, `CanvasPig.onHotspot(fn)` (adds a listener, does not assign). Pig-wins test via `isOverPig` (`canvas-pig.js:~675`), not `pickAt`. | `pickAt` does not exist until P40b and is not needed. | `onHotspot = fn` (prompt). |
| D13 | Market stall mapping (P43c) | `stall:<n>` maps to the n-th goods entry of the market state (verified in step 1); `stall:own` -> `market_stall`. Label is display only. | Label alone is not a key. | Mapping by label text. |

## 1. Order and file conflicts

Shared files (must be serial):
- `web/home/canvas-pig.js`: P39c, P39e, P40b, (P40c), **P43b, P44a**, P45 canvas packages. Rule: P44a never runs in the same wave as a P45 package that edits canvas-pig.js.
- `web/home/features/places/feature.js`: P39d, **P43e, P44b**.
- `web/home/features/places/scenes.js`: P39a, P39e, **P43b** (hotspots pass-through).
- `assets/data/place_scenes.json`: P39a, **P43a**, P45d1.
- `web/home/app.js`, `features/index.json`: P40a, P40d, **P43f**.
- `docs/qa/UX_WAVE_CHECKS.md`: every q package (P43q before P44q).

Overlap of P43 and P44 is unavoidable on two files (canvas-pig.js, places/feature.js). Other file sets are disjoint.

Order: P43a -> P43b -> {P43c || P43d} -> P43e -> P43f -> P43q; P44a (after P43b) -> P44b (after P43e and P44a) -> P44q.
P43c || P43d is safe: `market/` and `farm/` do not overlap. P43f waits for both (it edits app.js).

## 2. Package briefs

Common: test files are new; mock state `seven` (`CuyScenesMock.state('seven')`, `places/mock.js:51`). Verification lines stay as written in each prompt, with the fixes below. No package runs git.

### PK-P43a Scene hotspots data
- Goal: `hotspots` per scene in `place_scenes.json`, validated by the checker.
- Files: `assets/data/place_scenes.json`, `tools/qa/place-scenes-check.js`, `tools/qa/ux-p43-hotspot-data.js` (new), `docs/opt/log/PK-P43a.md`. No change.
- Contracts: created here: `scene.hotspots[] = {id, kind, rect:[x0,y0,x1,y1], label}`. kind in {stall, plot, orchard, shop, decor}. Ids: `stall:<n>`, `stall:own`, `plot:0..11`, `orchard:0..k`, `shop`, `pond`, `flowerbed`. Confirmed: scene `walk`, `bg`, `depthScale` (P39).
- Steps: view each of `assets/world/bg/market.png`, `farm.png`, `garden_day.png` once (visual exception in CLAUDE.md), write rects in scene pixels. Plot count is the constant 12 (D2). Checker H1-H4 as in prompt; H5: plot hotspot count == 12 and `farm/mock.js:20` MAX_PLOTS == 12 (read by regex).
- Tests (`ux-p43-hotspot-data.js`): valid data accepted; three in-memory invalid fixtures rejected (duplicate id, rect outside scene, bad kind).
- Verify: as prompt line.
- Done when: green; log lists hotspot ids per scene.

### PK-P43b Hotspots in the canvas
- Goal: hover highlight, click, keyboard on scene hotspots; pig and drag win.
- Files: `web/home/canvas-pig.js`, `web/home/features/places/scenes.js` (def() passes `hotspots`, next to P39a `blockers`), `tools/qa/ux-p43-hotspot-engine.js` (new), log.
- Depends: P39a, P39c (toScene contain math, `canvas-pig.js:664` changed by P39c), P40b (edit mode flag). Not `pickAt`.
- Contracts: created here: `CanvasPig.setHotspots(list)`, `CanvasPig.getHotspots()`, `CanvasPig.onHotspot(fn)`, `debug().hover`. Confirmed: `suppressClick` (682), `this.drag {startX,startY,moved}` (691-696), `isOverPig` (~675), `handleCanvasClick`, `addLayer` (351), `toScene` (662).
- Steps: scenes.js def pass-through; canvas stores list; hover test via pointermove (cursor `pointer`); click fires only if `!drag.moved` and `!suppressClick` and pig not hit; edit mode disables hotspots (flag from P40b); Tab order = reading order; Enter fires. Draw outline in palette highlight colour; label chip = wood 9-slice from `assets/ui/`, clamped to canvas.
- Tests X1-X8 as prompt.
- Done when: green; log has the API names.

### PK-P43c Market stalls in the scene
- Goal: stall click opens a floating panel beside the stall; no modal.
- Files: `web/home/features/market/feature.js`, `market/feature.css`, `tools/qa/ux-p43-market-scene.js` (new), log.
- Depends: P43a, P43b.
- Contracts: created here: `CuyMarket.openPanel(stallId, anchorRect)`. Uses: `CanvasPig.onHotspot` (kind 'stall' only), `CanvasPig.getHotspots()`. Confirmed: messages `market_buy/market_sell/market_stall/market_quote` (feature.js:244-254), `registerFeature` (269).
- Steps: map `stall:<n>` to goods (D13); anchorRect = hotspot rect converted to window px with the canvas scale; panel clamped inside the window; one panel; Esc/X/click outside closes. Window (More tile) stays until P43f.
- Tests K1-K9 as prompt.

### PK-P43d Farm plots in the scene
- Goal: click plot = plant/water/harvest; markers show state; bulk strip; orchard and shop panels.
- Files: `web/home/features/farm/feature.js`, `farm/feature.css`, `tools/qa/ux-p43-farm-scene.js` (new), log.
- Depends: P43a, P43b.
- Contracts: confirmed: `f.plots` (farm/feature.js:135), plot states `empty` / `growing` / `ripe` plus `watered` flag (feature.js:157-158, 243), messages `farm_plant/farm_water/farm_harvest/farm_harvest_all/farm_buy/orchard_*`. Consumed: `CanvasPig.getHotspots()`, `CanvasPig.addLayer` (D11). Created here: none outside the module.
- Steps: per plot i, hotspot active iff `i < f.plots.length`. Rules: `empty` -> crop menu -> `farm_plant {plot,cropId}`; `growing` and not watered -> `farm_water {plot}`; `ripe` -> `farm_harvest {plot}`; `growing` and watered -> tooltip with `secondsLeft`. Markers: drop icon if growing and not watered, basket if `ripe`, none if empty (library icons; check `assets/icons/icons.json` for names).
- Tests F1-F9 as prompt.

### PK-P43e Rooms and garden objects act in the scene
- Goal: lamps toggle in the scene; gramophone and food only if they have an existing open function.
- Files: `web/home/features/places/feature.js`, `tools/qa/ux-p43-object-actions.js` (new), log. `garden/feature.js` removed (D4).
- Depends: P43b (setHotspots/onHotspot), P39d (`Lights.activeSources` toggles argument, `places/feature.js` light code).
- Contracts: created here: `lampToggles` (object in places feature, keyed by item uid). Confirmed: `Lights.activeSources(lights, place, items, period, toggles)` (lib/lights.js:68).
- Steps: 1) grep gramophone open function (D6) and food open function (D5); log both; drop O3/O4 if none. 2) For each placed item with action `lamp` build a hotspot (rect = cell from the rooms cell size; cell constant verified in step 1), merge into `setHotspots` with the scene's own hotspots. Lamp click flips `lampToggles[uid]`, calls the existing light redraw.
- Tests: O1 lamp toggle changes ambient state; O5 object without action has no hotspot; O6 hotspots update after place and remove. O2 removed (D3). O3/O4 only if their functions exist.
- Verify: `node --check` on places feature and the test file, then run the test.

### PK-P43f Farm and Market windows retired (More tiles only)
- Goal: no More tile or open call for farm/market; panels from P43c/d are the only UI.
- Files: `web/home/app.js`, `web/home/features/index.json` (no id removed, D7), `tools/qa/ux-p43-retire-fm.js` (new), log.
- Depends: P43c, P43d; serial after P40a/P40d (app.js, index.json).
- Steps: grep tile entries and `openFeature('farm'|'market')` in app.js; remove those only. `CuyPlaces.openPlace` already switches scene (places/feature.js:471), so no change there.
- Tests: V1 no farm/market tile; V2 walk all More tiles and places bar: no modal with farm/market class; V3 plant through scene; V4 buy through stall panel; V5 locked farm unlock path (P40e drawer).
- Note: dead window code remains in farm/market feature.js; log it.

### PK-P43q Windows checks wave P43
- Files: `docs/qa/UX_WAVE_CHECKS.md`, `docs/qa/shots`, `tools/qa/ux-p43-shots.js` (new), log.
- Steps: run `node tools/qa/ux-p43-shots.js` once (writes `docs/qa/shots/p43-*.png`), then the Weryfikacja line once. Compare with `docs/opt/log/baseline-smoke.txt`.
- Product code untouched.

### PK-P44a Drag to the edge
- Goal: hold at left/right edge 600 ms -> `onEdgeHold`; drag continues in the new scene; take-out rules per D8.
- Files: `web/home/canvas-pig.js`, `tools/qa/ux-p44-drag-edge.js` (new), log.
- Depends: P39c (`isFree`, `debug().grid`), P43b (serial in canvas-pig.js; not in the same wave as P45 canvas packages).
- Contracts: created here: `CanvasPig.onEdgeHold({side})`, `CanvasPig.continueDrag(def)`, `CanvasPig.onDrop({x,y})` (D10), `CanvasPig.setEdgeNeighbours({left,right})`. Confirmed drag code: 687-726, `take_out` at 706.
- Steps: edge zone 12 px inside left/right; 600 ms hold fires `onEdgeHold` once; re-arm after leave. `continueDrag(def)`: sets scene def, pig x = walk x0+16 (left) or x1-16 (right), keeps `drag.moved=true`. `onDrop` on every drop inside the window, after snapping (uses `isFree`). Take-out per D8. Indicator: library arrow sprite (name verified in step 1); no SVG, no glyph.
- Tests G1-G7 as prompt. G4 needs a single-scene mock (`neighbor` returns the same id).

### PK-P44b Drag switches the scene
- Goal: hold switches bar and scene; drop saves location once.
- Files: `web/home/features/places/feature.js`, `tools/qa/ux-p44-drag-switch.js` (new), log.
- Depends: P44a, P43e (serial in places/feature.js), P38a (locked handling in log).
- Contracts: consumed: `CuyScenes.neighbor(id, dir, state)` with dir ±1 (scenes.js:271); `applyScene(sceneId, st)` (places/feature.js:275); `places.pigMove {pigId,to}` (existing message). Locked check pattern: `places/feature.js:209`. Unlock hint from `order(state)` items.
- Steps: on every applyScene call `setEdgeNeighbours` (left = `neighbor(id,-1,st)!==id` and unlocked; right likewise). `onEdgeHold({side})`: `nid = neighbor(cur, side==='right'?1:-1, st)`; if `nid===cur` or locked -> toast `Locked: <hint>` (or nothing if no neighbour) and continue drag in place; else `applyScene(nid, st)` then `continueDrag(def)`. `onDrop({x,y})` -> `places.pigMove {pigId, to: currentSceneId}` once. Pinned pigs: move and stay pinned. take_out sends nothing extra.
- Tests T1-T7 as prompt.

### PK-P44q Windows checks wave P44
- Files: `docs/qa/UX_WAVE_CHECKS.md`, `docs/qa/shots`, `tools/qa/ux-p44-shots.js` (new), log.
- Steps: run `node tools/qa/ux-p44-shots.js` once (step 2 was empty in the prompt), then the Weryfikacja line once. Compare with baseline.

## 3. Unresolved (and what settles each)

1. Max plot count on the server: `FarmExpansion.cs` config (`StartPlots`, max) is not read. Settles D2 if max differs from 12. Read `src/Cuy.Core/World/FarmExpansion.cs` config values in P43a step 1.
2. Gramophone and food open functions (D5, D6): settled by P43e step 1 grep; drop path is already written.
3. Market goods shape for `stall:<n>` (D13): settled by P43c step 1 read of `market/feature.js` (around lines 100-260).
4. Lamp cell size for hotspot rects (P43e): settled by P43e step 1 (rooms cell constant).
5. Arrow sprite name (P44a) and cursor/icon names (P43d): settled by grep in `assets/icons/icons.json` at package start.
6. `places.pigMove` sender: already in code per P44b prompt; not re-verified here. Settled by P44b step 1 grep.
