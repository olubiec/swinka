# PK-PF-HS Log
- Status: OK
- Modified: `web/home/lib/hotspots.js`, `assets/data/scene_hotspots.json`, `tools/qa/ux-p43-hotspots.js`
- Decisions: Kept `classifyInstance(inst, catalog)` and `CuyHotspots` `{ id, kind, rect, label, uid }` shape with `Number.isFinite(...) > 0` per RF4/RF5 instead of planned `(sceneId, inst)` / `{ x, y, w, h, action, target }`.
- Decisions: Added `torch_wall` with `lantern` items and `window_*` exclusion per RF4; placed static `stall:orders` fallback at `[8, 60, 28, 88]` outside existing X6 test points.
- Open note: Static `stall:orders` rect was not verified against `web/home/features/places/scenes.js` (`Nie czytaj`); dynamic `fx:market:order_board` instance overrides it by id.
- Verification: `node --check` (3 files), `hotspots-check.js` (PASS), `ux-p43-hotspots.js` (12 passed, 0 failed).
