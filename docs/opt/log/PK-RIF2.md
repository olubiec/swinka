# PK-RIF2 Log
- Status: OK
- Decisions: Mapped 1 Hz diffing anchors (`lastAppliedSceneKey`, `lastThingsSig`, `lastLightSig`, `lastPresentSig`, `lastHotspotsSig`, `lastWeatherSig`, `lastEdgeSig`), hoisted `CanvasPig.isDragging()` guard, lamp refresh, and Edit button constraints into `docs/opt/foundations/RIF2.md`.
- F2F-2 status: `PK-PF-BAR` OK; `PK-PF-FRM` Farm checks PASS (`ux-p43-farm.js` missing); `PK-PF-MKT` has `ReferenceError: resolveTab is not defined` at `market/feature.js:715` (per `PK-PF-FRM.md`) and `DEFECT H1` in `ux-p60-hotspots-adv.js` (`ux-p43-market.js` missing).
- Differences from prompt: `places/feature.js` uses `currentSceneId` (not `currentPlace`) and `hs.kind === 'lamp'` -> `toggleLamp(hs.uid || hs.id)` (not `lamp_toggle`).
- Read bounds: `places/feature.js` lines `221-819` and `1121-1346` (`toggleLamp`, `bindEditButton`, `syncEditButton`, `setCurrentPlace`) were outside `Czytaj tylko` and flagged for `PK-PF-PL`.
- Modified: `docs/opt/foundations/RIF2.md`, `docs/opt/log/PK-RIF2.md`.
- Verification: `node tools/qa/foundation-check.js docs/opt/foundations/RIF2.md 5` -> `FOUNDATION OK (5 sections, 13138 chars)` (exit 0).
- Left undone: None (research-only package).
