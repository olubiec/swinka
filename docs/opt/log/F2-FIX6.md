# F2-FIX6 Verification Log
- Added `tools/qa/ux-p77-fix6.js` (syntax checked with `node --check`) covering all 5 F6 fixes at 420x640.
- `node tools/qa/ux-p77-fix6.js`: 5/5 PASS, 0 defects (`F6-1-lamp-coords` x=56,y=90; `F6-2-pig-walk-bounds` [4,38,252,140]; `F6-3-edge-blocked` red bar; `F6-4-market-stalls` y<=84, sy<84; `F6-5-edit-grid-snap` 16x16 grid + red invalid highlight + `.needs-section`/`.actions-section` hidden).
- `node tools/qa/ux-p76-fix5.js`: 4 PASS (`R1-unit`, `R1-canvas`, `R2-depth-bounds`, `R4-market-signboards`), 2 DEFECT (`R3-edges` expected due to F6 `.edge-blocked` on locked neighbor instead of skipping; `R5-edit-drawer` collapsed height 42px > 40px).
- `node tools/qa/web-smoke.js`: 20 PASS, 21 FAIL, 2 SKIP (pre-existing failures: `Harvest all`/`Water all` 0-size buttons, `26_my_pigs`, and legacy `world_*`/`dorm_*`/`roaming_*` selectors).
- Decision: kept `ux-p76-fix5.js` untouched per no-weakening rule and added `ux-p77-fix6.js` for F6 assertions.
