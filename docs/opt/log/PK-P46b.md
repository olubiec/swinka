# PK-P46b
- Status: OK. Verification (`node --check`, `ux-p46-render.js` D1..D8, `place-scenes-check.js` C1..C7/B1..B6/R1..R4) passed.
- API (`web/home/features/places/scenes.js`): `CuyScenes.placedThings(state, sceneId)` returns outdoor instances (`id`, `uid`, `itemId`, `url`, `x`, `y`, `anchorX`, `anchorY`, `flat`, `flip`) when `bg_clean === true` and `[]` when `bg_clean` is false/missing; skips items missing from `atlas.items` or with `art === 'missing'`.
- `CuyScenes.def(id, tod, state)`: when `bg_clean === true`, builds `blockers` from instance footprints (`[x*16, y*16, (x+cw)*16, (y+ch)*16]`) with `behindLine: -9999` and sets `res.behindLine = -9999` (no `canvas-pig.js` edits needed).
- Helpers: `CuyScenes.debugInstances(sceneId, state)` and `CuyScenes.setBgClean(sceneId, val)` (used by D1/D4/D5/D6 in `ux-p46-render.js` to inject `bg_clean: true` in memory without editing `place_scenes.json`).
- Canvas sprite drawing: `PigCanvas.drawThing(ctx, thing)` (`web/home/canvas-pig.js:1329`); public `addLayer` cannot interleave per-item y-sort with the pig, so `CanvasPig.setThings` + `drawThing` handles it.
- Mock (`web/home/features/places/mock.js`): `OUTDOOR_SEED` seeds `garden`, `park`, `farm`, `market` in `rooms.layouts`; compare against `assets/data/outdoor_defaults.json` after merge (`PK-P46t2`).
- `tools/qa/place-scenes-check.js`: added `R4` (optional `bg_clean` must be boolean) and duplicate static blocker warning for `bg_clean: true`.
