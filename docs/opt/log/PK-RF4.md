# PK-RF4 Log
- Status: OK-WITH-NOTE
- Output: `docs/opt/foundations/RF4.md` (5 sections, 13690 chars; `node tools/qa/foundation-check.js docs/opt/foundations/RF4.md 5` -> `FOUNDATION OK`).
- Decisions: Specified `sw`/`sh` -> `(w <= 8 ? w * 16 : w)` resolution in `canvas-pig.js` and `hotspots.js` for pixel-caller compatibility; deferred final `padX`/`footH` until `PK-PF-CV` checks existing tests.
- Differences: `scenes.js:210-370` contains `load`, `getHotspotsData`, `loadHotspots`, `getScenesDict`, `order`, `neighbor`, `timeOfDay`, `isHouseRoom` (`placedThings` shifted past line 370); `scene-pigs.js:1-200` uses `stepPig` (`177`), not `stepWalk`.
- Differences: `hotspots.js:64-65` uses `Number.isFinite(...) ? ... : ...` (not `Number(...) || ...`); `isLampItem` (`31-38`) also omits `torch_wall` in addition to `garden_lantern` and `lantern_post`.
- Unread (strict `Czytaj tylko`): `ux-p39-blockers.js`, `ux-p50-canvas-wiring.js`, `scene-pigs.js:201-348`, `scenes.js:371-795`, `atlas.json`, `lights.json`; flagged in `RF4.md` section 5 for downstream packages.
