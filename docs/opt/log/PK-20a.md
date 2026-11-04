# PK-20a: browser mocks, places bar, room editor
- Done: W20-08 mocks (`features/rooms/mock.js`, `features/farm/mock.js`, `features/market/mock.js`), each reads `?world=1`; `bridge.js` untouched.
- Done: W20-01 places bar in `app.js` (House, Garden, Farm, Park, Market). It is an overlay on the top of the pig stage: the Home page has no spare height, and a row under the stage pushed Feed/Clean/Call past the 620 px window (layout check failed). Locked place: first tap shows "Confirm?", second tap sends `place_unlock`.
- Done: W20-02 room editor (`features/rooms/feature.js`, `feature.css`): canvas grid (scale 2 when it fits), drawer, ghost, drag, PPM/Delete remove, F flip, keyboard cursor. `openFeature(id, arg)` now passes the place argument.
- Deviation: `features/index.json` now lists `rooms`. The smoke test fails when a folder has `feature.js` but is not listed; the C# app builds its list from folders anyway, so `rooms` shows in the More menu from this commit.
- Deviation: `assets/world/atlas.png` and `tiles.png` are not in the repo. Sprites come from the per-item PNGs named in `atlas.json` (`items[id].file`); floors use solid colours as the spec allows.
- Deviation: mock item `sofa_blue` became `sofa_cosy` (the atlas has no `sofa_blue`). Pigs in rooms are drawn only if `rooms.pigs` exists; Cuy.Core does not send it yet.
- Undone (deferred by the package): undo/redo and snapping; room skins UI.
- Verified: `node --check` on all changed JS; `node tools/qa/web-smoke.js` WEB SMOKE OK.
