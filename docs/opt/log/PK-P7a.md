# PK-P7a: Visual weather module and data
Status: OK
API: `window.CuyWeather` / `module.exports`: `DEFAULT_DATA`, `stateFor(dateKey, sceneKind, settings, data)`, `draw(ctx, state, tMs, w, h)`.
Data: `assets/data/weather.json` (`version`, `outdoorScenes`, `types.{clear,overcast,rain}` with `weight`, `tintColor`, `tintAlpha`, `streakCount`, `streakColor`, `streakHighlight`, `streakAlpha`, `streakLength`, `speedY`, `windX`).
Decisions: Added Murmur3 fmix32 avalanche after FNV-1a on `dateKey` so sequential `YYYY-MM-DD` strings spread across [0,1); normalized `Date` via UTC `toISOString().slice(0,10)`. Split rain streaks into two non-overlapping batches (`streakColor`, every 4th `streakHighlight`) keeping exact `streakCount` strokes.
Diffs from R31: Prompt said `CanvasPig.addLayer`, R31 Prompt fixes noted `window.CuyRoom.addLayer` (not touched here; PK-PF2 registers layer).
STUB: `createMockCtx` in `tools/qa/ux-p7-weather.js` mocks Canvas 2D context (`save`, `restore`, `fillRect`, `beginPath`, `moveTo`, `lineTo`, `stroke`).
Verification: `node --check web/home/lib/weather.js`, `node --check tools/qa/ux-p7-weather.js`, `node tools/qa/ux-p7-weather.js` -> PASS W1..W8.
