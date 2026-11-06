# PK-P2a: Every pig gets its own portrait
- Added `tools/qa/ux-p2-portraits.js` covering R1-R4; reproduced initial portrait collisions and 404s.
- In `canvas-pig.js`, implemented `window.CuyPig.renderPortrait(look, stage, size)` with head crop (idle frame).
- Shared `resolveSheet` ensures portraits use the exact same sprite and palette pipeline as the main pig.
- Cached portraits by `breed|palette|stage|size` with nearest-neighbour scaling for 32px and 64px.
- Updated `pigs/feature.js` so roster cards, starter groups, and adoption offers render via `renderPortrait`.
- Retained PNG path as fallback only for named pigs with known assets; prevented 404s for unnamed pigs.
- Kept portrait frame at 32x32 / 64x64 with `image-rendering: pixelated` in `pigs/feature.css`.
- Verification command passed cleanly: syntax checks, `ux-p2-portraits.js`, and `web-smoke.js` all green.
- Differences from planned names: none. Undone: none.
