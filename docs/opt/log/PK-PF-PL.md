# PK-PF-PL: Places feature diffing, drag guard, and lamp toggle
Status: IMPLEMENTED_WITH_PREEXISTING_QA_DEFECTS
Files: `web/home/features/places/feature.js`, `docs/opt/log/PK-PF-PL.md`
Decisions: Added module-level signature cache (`lastSceneKey`, `lastThingsSig`, `lastLightSig`, `lastPresentSig`, `lastHotspotsSig`, `lastWeatherSig`, `lastEdgeSig`, `lastLockedOverlaySig`) and `resetSceneSigs()` invoked on scene/size/tod/lock/Edit transitions (`lastEditOpen` + `#placesEditBtn` click).
Diffs vs prompt names: Used real symbols `currentSceneId` (not `currentPlace`), `toggleLamp`/`setLampToggle` (not `CuyLights.toggle`), and `hs.kind === 'lamp'` (plus `'lamp_toggle'` fallback) in `ensureLampHotspotSubscription`; preserved `#placesEditBtn` text/background CSS invariants from `PK-PF-BAR`.
Guards: `applyScene` skips `setThings` unless `sceneChanged || (!isPigBeingDragged && thingsSig !== lastThingsSig)`, guards `setLightScene`/`setHotspots`/`CuyRoom` weather & `p36_locked_overlay`/`setEdgeNeighbours`, hoists `isPigBeingDragged` with `CanvasPig.isDragging()`, skips `setPresentPigs` while dragging without updating `lastPresentSig`, and clears `lastLightSig` in `toggleLamp`/`setLampToggle`/`onHotspot`.
Verify: `node --check` PASS; `ux-p51-places-wiring.js` PASS (F1-F11); `ux-p47-bar.js` PASS (T1-T6); `ux-p39-light.js` PASS (Li1-Li5).
DEFECTs (pre-existing, outside Zmieniaj): `ux-p44-drag-switch.js` FAIL (T4 expects old Polish `'sypialnia'`, got `'salon'`; T5 `chip-consistent`); `ux-p38-presence.js` FAIL (Pr1 expects `"Cuy is in"`, got `"Pip is in SalonGo there"`).
