# PK-TF4 Log
- Created `tools/qa/ux-p74-market-farm-ux.js` (Playwright, `?mock=seven`, `420x640`, tests M1-M3 and F1-F4).
- Added `launchBrowser()` fallback (`msedge`/`chrome`) when Playwright's bundled `headless_shell.exe` is absent on Windows.
- `node --check tools/qa/ux-p74-market-farm-ux.js && node tools/qa/ux-p74-market-farm-ux.js` exited 0: 2/7 passed (`M3`, `F4`), 5 defects (`M1`, `M2`, `F1`, `F2`, `F3`).
- Gap: `window.CanvasPig.getHotspots()` / `.hotspots` returned `[]` (actual hotspot API in `canvas-pig.js`/`hotspots.js` could not be read due to `Czytaj tylko` restriction), causing `M1`/`M2`/`F1`-`F3` hotspot lookup to find 0 hotspots and `M3` to pass without opening `#marketStallPanel`.
