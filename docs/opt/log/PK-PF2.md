# PK-PF2 Log
- Status: BLOCKED (`ux-p51-places-wiring.js` F1-F11 PASS; `ux-p47-bar.js` T1-T6 PASS; `ux-p44-drag-switch.js` FAIL T4 & T5).
- Failing test (`ux-p44-drag-switch.js`):
  `FAIL T4 drag-across-three-scenes: Should have switched to sypialnia, got: salon`
  `FAIL T5 chip-consistent: Should have switched scene`
- `web/home/features/places/feature.js`: removed `initCanvasLampClick` and `gx=120; gy=65;` fallback; added `isToggleableLightSource` / `window` guard to `setLampToggle`; moved glow/dust to `applySceneGlow`; wired `CanvasPig.onHotspot`, `CuyHotspots.fromScene` -> `CanvasPig.setHotspots`, `CuyRoom.addLayer('weather', 15)` / `removeLayer('weather')`, `CanvasPig.setPresentPigs`.
- `tools/qa/ux-p51-places-wiring.js`: F1-F11 all pass (uses `window_sun`, `CanvasPig._hotspotListeners`, `STUB` fallback for `setPresentPigs`/`setHotspots`, unlocked `places.order`, `addScriptTag` for `lib/{hotspots,weather}.js`).
