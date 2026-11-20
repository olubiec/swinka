# PK-TF1 Log
- Status: Complete (`SUMMARY: 3/6 passed, 3 defects`, exit 0 without `STRICT=1`).
- Files: `tools/qa/ux-p71-lag-and-drag-fix.js`, `docs/opt/log/PK-TF1.md`.
- Decisions: Added `launchBrowser()` fallback (`headless` -> `msedge` -> `chrome`) because Playwright's bundled `chromium_headless_shell` is not installed on Windows; wrapped `requestAnimationFrame` on `page` for L5 CPU frame time measurement.
- Verify: `cmd /c "node --check tools/qa/ux-p71-lag-and-drag-fix.js && node tools/qa/ux-p71-lag-and-drag-fix.js"` -> exit 0 (`3/6 passed, 3 defects`).
- PASS: `L4-drag-survives-state-push` (+31.0px), `L5-frame-time-budget` (avg 1.53ms, max 16.10ms / 120 frames), `L6-no-console-errors` (0 errors).
- `DEFECT L1`: CanvasPig.setThings called 22 times across 10 identical state pushes (expected 0)
- `DEFECT L2`: CanvasPig.setLightScene called 22 times across 10 identical state pushes (expected 0)
- `DEFECT L3`: getImageData called 14 times over 30 night+lamp frames (expected <= 6)
