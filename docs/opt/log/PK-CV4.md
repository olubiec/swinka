# PK-CV4 Log (PASS)
- Implemented `CanvasPig`/`PigCanvas` wiring in `web/home/canvas-pig.js`: `setCompanion`, `setMusicBpmData`, `setBeat`, `setWeatherKind`, `StageLooks.lookFor` in `updateState`, `housePlate` in `render`, `slowMul` + `_danceSyncFps` in `defFor`, `bubbleOffsetY` in `drawSpeechBubble`, Y-sorted companion rendering, and `DanceSync` loop in `update`/`_buildBehaviorCtx`.
- `node --check` passed on `web/home/canvas-pig.js` and `tools/qa/ux-p135-canvas-optional.js`.
- `node tools/qa/ux-p135-canvas-optional.js`: PASS O1, O2, O3, O4, O5, O6, O7 (all 7 passed).
- STUB used in `ux-p135-canvas-optional.js`: `STUB PK-APP4` (injected `lib/companion.js`, `lib/dance-sync.js`, `lib/stage-looks.js`), `STUB CuyMusic` (mocked audible state).
- `ux-p34-pig-walk.js`: browser runner timed out (`waitForFunction`); Node fallback passed W3, W4, W7 and failed W1, W2, W5, W6, W8 (pre-existing).
