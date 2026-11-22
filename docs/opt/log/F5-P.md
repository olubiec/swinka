# F5-P Log
- Implemented `findNextUnlockedScene` in `web/home/features/places/feature.js` and wired it into `handleEdgeHold` and `handlePigExit` so edge-dragging skips locked places to the next unlocked scene in that direction.
- Moved market stall signboards to the lower wooden counter front in `drawMarketSignboards` (`web/home/features/places/scenes.js`, `sy = top + Math.max(12, sh - 18)`).
- Added indoor stage offset (`CuyRoomGeometry.stageOffset`) and `pigLight` pass-through in `CuyLight.build`, skipped `ambient`/`window` sources and scaled daytime `glowAlpha` by `0.35` in `applySceneGlow`.
- Conflict: `tools/qa/ux-p44-drag-switch.js` T3 expects dragging from `garden` toward locked `park` to stay in `garden` with a Locked toast; with fix #1 it skips locked `park` and switches to `market` (causing T3 and T5 to fail). Test left untouched per rules.
- Checks: `node --check` passed on both files; `ux-p74-market-farm-ux.js` 7/7 passed; `ux-p63-light-pixels.js` exited 0 (4 defects); `ux-p44-drag-switch.js` exited 1 (T1,T2,T4,T6,T7 pass; T3,T5 fail).
