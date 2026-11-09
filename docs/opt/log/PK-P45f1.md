# PK-P45f1: Pig depth scale in 1/16 steps
Status: BLOCKED
- Quantiser in `canvas-pig.js`: changed `scaleAt(y)` step from 1/8 to 1/16 (`Math.round(raw * 16) / 16`).
- Guard: added `getDrawnSize(scale)` asserting `64*k/16` integer; falls back to `Math.round(64*s)` with `debug().scaleFallbackCount`.
- APIs: `debug().scaleFallbackCount` (and `debug().pig.scaleFallbackCount`), `getDrawnSize(scale)`.
- Tests added: `tools/qa/ux-p45-pig-depth.js` covering PD1-PD4 across all scenes; PD1-PD4 PASS. `ux-p34-pig-walk.js` PASS.
- Blocked on untouched external file `tools/qa/ux-p39-depth.js`:
  browserType.launch: Executable doesn't exist at C:\Users\48782\AppData\Local\ms-playwright\chromium_headless_shell-1194\chrome-win\headless_shell.exe
  When run with browser, D1-D4 PASS but D5 fails (`[salon] Top scale 0.75 vs 0.88 diff > 1/8`) due to PK-P45d1 room size change.
