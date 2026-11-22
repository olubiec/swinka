# F2-FIX5 — 5 live-test UX/gameplay fixes (F5-C, F5-P, F5-Q)
- Pig light: `pig_light` (`source_gain: 0.22`, `max: 0.78`), skipped `on===false` & `ambient`/window sources, `cap = max(c.max, amb[ch])` so daylight stays 1.0x, indoor `CuyRoomGeometry.stageOffset`, daytime `glowAlpha * 0.35`.
- Depth/collisions/frame: `setScene` full-stage `walk = [8, stageWallY+8, 248, 138]`; drag up scales down & obeys `isFree`; pig reaches left/right/bottom window frame in every room.
- Edge bars & room switch: `rawX` edge zones + `_disarmedSide`; `findNextUnlockedScene` skips locked places (`garden`/`park`/`farm`) so left/right switching works in every room/direction; arrow glyphs/sprites removed.
- Edit drawer & market labels: `.actions-grid` replaced by `#editDrawer` (`is-collapsed` = 42px vs <=40px check); `drawMarketSignboards` moved to counter front (`sh-18`) and drawn before `applySceneLight` & `drawPigFor`.
- Known old-test conflicts (untouched per AGENTS.md): `ux-p44-drag-switch.js` T3/T5 (expects locked-place block), `ux-p52`/`ux-p62` (expect `#btnMore` visible), `ux-p44-drag-edge` G3, `ux-p75` T7.
- Manual check (`tools/build.ps1`): test night/day lamp, drag depth & frame reach, edge room switch in `salon`/`pig_1`/`market`, collapsible edit drawer, market counter signboards behind pig.
