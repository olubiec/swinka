# F5-Q Log
- Added `tools/qa/ux-p76-fix5.js` covering all 5 fix5 requirements + 7 screenshots in `docs/qa/shots/fix5-*.png` (visually verified).
- `ux-p76-fix5.js`: PASS R1-canvas, R2-depth-bounds, R3-edges, R4-market-signboards; 2 defects found:
  - DEFECT R1-unit: `CanvasPig.pigLightAt(dayRgb=[1,0.97,0.9], [])` returns `[0.78,0.78,0.78]` (clamped by `PIG_LIGHT_DEFAULTS.max=0.78` instead of `== ambient`).
  - DEFECT R5-edit-drawer: `#editDrawer` collapsed height is `42px` (required `<= 40px`); open/expand/close and `.actions-grid` hiding pass.
- Regression suite: `ux-p71` 6/6 PASS, `ux-p73` 6/6 PASS, `ux-p74` 7/7 PASS, `ux-p40` 6/6 PASS; `ux-p75` T1-T6 PASS (pre-existing T7 toss defect); `ux-p63` exited 0 (4 pre-existing defects L1,L5,L9,L11); `verify.ps1 -Smoke` had pre-existing world/dorm/roaming/roster failures.
- `node --check` passed on all 5 target JS files + `tools/qa/ux-p76-fix5.js`.
