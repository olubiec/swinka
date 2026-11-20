# PK-PF-SC Log
Status: Done (all Weryfikacja checks passed).
Files: `web/home/features/places/scenes.js`, `web/home/features/places/mock.js`, `docs/opt/log/PK-PF-SC.md`.
Decisions:
- `placedThings` accepts both `(state, sceneId)` and `(placeId, state)` (real callers pass `(st, sceneId)`). Added `getLightsData`/`loadLights`; `resolveSingleFrameMetrics` reads `entry.size` (single-frame in `atlas.json`) or `entry.w`/`entry.h`, dividing by `frames` only for explicit strip frames or strip-sized `entry.w` (keeps `campfire` `32x24` and `brazier` `16x16`), and attaches `sw, sh` in `placedThings` and `hotspotsFor` (`CuyHotspots.fromScene`).
- Added `CuyScenes.drawMarketSignboards(ctx, state, opts)` rendering `14x12` plaques (sprout/carrot/pink ball-star) centered on `stall_left`/`stall_center`/`stall_right` canopies.
- Synced `OUTDOOR_SEED.park` in `mock.js` to `16x9` and `assets/data/outdoor_defaults.json` (`bench_right` `13,7`, `tree_3` `10,1`, `tree_4` `0,4`, `lamp_mid` `9,5`, `lamp_right` `14,5`).
Differences & Gaps: `scenes.js` has no canvas render loop (`canvas-pig.js` renders scenes, outside `Zmieniaj`), so `canvas-pig.js` must call `CuyScenes.drawMarketSignboards(ctx, state)` in market rendering; `hotspotsFor` calls `CuyHotspots.fromScene` (not `fromInstances`). Recorded `order_board` (`fx:market:notice_board`) rect `[64, 96, 96, 128]` for `PK-RF5`.
Verify: `node --check` (`scenes.js`, `mock.js`), `ux-p46-render.js` (D1-D8 pass; D3 flaked once in run 1 before passing in run 2), `ux-p50-canvas-wiring.js` (C1-C12 + Perf pass), `place-scenes-check.js` (pass).
