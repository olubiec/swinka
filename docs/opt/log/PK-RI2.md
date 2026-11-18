# PK-RI2 Log
- Status: OK. Produced `docs/opt/foundations/RI2.md` with sections `## 1.`..`## 7.` from post-F2-2 code and logs.
- F2-2 BLOCKED/STUB: `PK-P47r` BLOCKED (`ux-p34-pig-walk.js` W3/W8), `PK-P5b` BLOCKED (4 `PigPinMessagesTests` Core failures), `PK-P46a` test count conflict (75 vs 80); STUB tests in `PK-P43c`, `PK-P43d`, `PK-P5a`, `PK-P7a`, `PK-P7b`, `PK-P6b`, `PK-P6s`.
- Key contract vs reality diffs: `weather.js` uses `window.CuyRoom.addLayer('weather', 15, fn)` (not `CanvasPig.addLayer`); `hotspots.js` `arbitrate` takes `editMode` param (no `window.CuyEditMode`); `edit-panel.css:48-55` `.edit-drawer` still has `bottom: 0` overlapping `#btnMore`.
- Decisions: kept `Places` lamp toggle via `CanvasPig.onHotspot` (`kind === 'lamp'`), removed `initCanvasLampClick` and `120,65` fallback in `PK-PF2` spec; marked `showFixtureToast` exact helper name in `app.js` as `UNVERIFIED`.
- Verified: `ux-p47-bar.js`, `ux-p6-filters.js`, `ux-p6-templates.js`, `ux-p6-skins.js`, `ux-p43-hotspots.js` all exited 0; `foundation-check.js` passed.
