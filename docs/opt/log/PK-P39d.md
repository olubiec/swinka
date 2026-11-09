# PK-P39d: Scene light and ambient in all scenes
- Built `window.CuyLight.build(sceneId, placed, toggles)` in `places/feature.js` supporting indoor and outdoor scenes.
- Lazy-loads `lib/lights.js` and `data/lights.json`; missing lib or file safely returns null light scene with no console error.
- Enhanced `lib/lights.js` `periodOf` to respect `window.__cuyNow` override and `activeSources` to support `placed.itemId` / `placed.uid`.
- Extended `CanvasPig.setLightScene`, `CanvasPig.debug()`, and `PigCanvas.prototype.applySceneLight` with additive lamp radial glow and dust.
- Added `CuyPlaces.toggleLamp(uid)`, `CuyPlaces.setLampToggle(uid, on)`, and canvas click handler to toggle lamps.
- Verification: `tools/qa/ux-p39-light.js` passed all 5 test scenarios (Li1-Li5).
