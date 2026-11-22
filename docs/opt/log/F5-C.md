# F5-C Log

- Updated pig lighting defaults (`source_gain: 0.22`, `max: 0.78`) in `assets/data/lights.json`, `web/home/canvas-pig.js`, and `docs/SWIATLO_SWINEK.md`; skipped `on === false` and `ambient`/window sources in `pigLightAt` and `litFrame`.
- Expanded room `walk` bounds in `setScene` to `[8, stageWallY + 8, sceneWidth - 8, sceneHeight - 6]` for full-stage movement up to the window frame.
- Added scene-edge `rawX` triggers (`<= 14` / `>= sceneWidth - 14`) and `_disarmedSide` tracking in `continueDrag`/`pointermove`/`pointerdown`/`endDrag` for opposite-side re-arming.
- Moved `drawMarketSignboards` before `applySceneLight` and `drawPigFor` in both `render()` branches.
- Verification: `node --check` passed; `ux-p71` (6/6) and `ux-p73` (6/6) passed; `ux-p75` passed T1-T6 (pre-existing T7 toss physics defect); `ux-p44` failed G3 (`continue-keeps-drag`).
