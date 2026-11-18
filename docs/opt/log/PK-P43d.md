# PK-P43d: Farm: plots interact in the scene
- Decisions: Registered `alwaysOnState: true` on `farm` feature; lazy-bound `CanvasPig.onHotspot(handleHotspot)` and `CanvasPig.addLayer('farm_markers', 60, drawFarmMarkers)` (fallback `CuyRoom.addLayer`) on init and `onState`.
- R1/R43 override applied: plot markers (`water_drop` when dry, `basket` when ripe) drawn on canvas layer `farm_markers` (z=60) using `CanvasPig.getHotspots()`, not as DOM overlays.
- Plot mapping: `fx:farm:plot:<i>` / `plot:<i>` maps 1:1 to `state.farm.plots[i]`: empty -> anchored crop menu (`farm_plant`), dry -> `farm_water`, ripe -> `farm_harvest`, watered growing -> countdown tooltip.
- Orchard & shop: `orchard` hotspot -> anchored panel (`orchard_plant`, `orchard_harvest`); `shop` hotspot -> anchored panel (`farm_buy`); `#farmSceneStrip` under `#placesBar` provides `Harvest all` (`farm_harvest_all`) and `Water all` (`farm_water`) only on `farm`.
- API exported: `window.CuyFarm = { handleHotspot, closePanel, drawMarkers, syncSceneUI }`; panels clamped inside viewport (`position: fixed`, integer px, palette `--ui-*`).
- Verification: `node --check web/home/features/farm/feature.js && node --check tools/qa/ux-p43-farm-scene.js && node tools/qa/ux-p43-farm-scene.js` (stubbed `CanvasPig.onHotspot`/`addLayer`/`getHotspots`: `STUB onHotspot`, F1-F9 PASS).
