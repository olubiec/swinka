# PK-RIF1 Log
- Status: OK-WITH-NOTE
- Modified: `docs/opt/foundations/RIF1.md`, `docs/opt/log/PK-RIF1.md`
- Decisions: Documented verified anchors within `Czytaj tylko` and flagged unread regions (`canvas-pig.js` `setLightScene`/`window.CanvasPig`/`endDrag>2310`/`isFree`/`scenePigs.step`; `scenes.js` `371-795`; `mock.js` `141-216`) for symbol lookup and expanded read scope in `PK-PF-CV`/`PK-PF-SC`.
- Differences from prompt: `canvas-pig.js:240-315` has anims/constants/`PigCanvas.constructor` (not `setLightScene`), `drawHabitat` has 4 `createPattern` sites (`2938,2961,2990,3014`, not 3), and `scenes.js:140-370` omits `placedThings`/`market` layer (`371-795`); `PK-PF-SP` uses `stepPig`/`sync`/`isSegmentFree`.
- F2F-2 status: `PK-PF-BG`, `PK-PF-HS`, `PK-PF-SP` are `OK`; `PK-PF-DATA` fixed `park` in `outdoor_defaults.json`/`OutdoorDefaults.cs` (`tree_3 10,1`, `tree_4 0,4`, `bench_right 13,7`, `lamp_mid 9,5`, `lamp_right 14,5`) but left `mock.js:28-44` unsynced (`24x12` + OOB items).
- Unread per `Czytaj tylko`: `hotspots.js`, `scene-pigs.js`, `outdoor_defaults.json`, `ux-p39-blockers.js`, `ux-p50-canvas-wiring.js`, and unlisted slices of `canvas-pig.js`/`scenes.js`/`mock.js`.
- Verification: `node tools/qa/foundation-check.js docs/opt/foundations/RIF1.md 5` -> `FOUNDATION OK (5 sections, 14780 chars)`.
