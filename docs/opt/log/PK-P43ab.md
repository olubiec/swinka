# PK-P43ab Log
- Status: OK
- Files: `assets/data/scene_hotspots.json`, `web/home/lib/hotspots.js`, `tools/qa/hotspots-check.js`, `tools/qa/ux-p43-hotspots.js`, `docs/opt/log/PK-P43ab.md`
- Decisions: `fromScene` returns shared frozen `EMPTY` for room scenes with no lamp/static hotspots; `hit` uses half-open `[x0, x1)` x `[y0, y1)` and skips negative/inverted rects; `clampLabelRect` returns `{ x, y, w, h }` clamped to `[0..sceneW-labelW, 0..sceneH-labelH]`.
- API: `CuyHotspots.{KINDS, EMPTY, fromScene, hit, arbitrate, clampLabelRect, sortKeyboard, createTracker}` (`setHover`, `on`, `trigger`).
- Validator: `hotspots-check.js` exports `{ KINDS, validate(data) }`.
- Differences from research file: per R30 section 8, `arbitrate` takes `editMode` parameter (no `window.CuyEditMode`); `scene_hotspots.json` uses exact R30 section 3 schema/coords.
- Stubs: none (pure Node unit tests with inline mock instances/static data).
