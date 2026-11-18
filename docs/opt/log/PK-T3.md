Cases: 16 total (7 PASS: H4, H5, H6, H7, H14, H15, H16; 9 DEFECT; 0 SKIP).
DEFECT H1: `places/mock.js` seeds 3 market stalls (`stall_left/center/right`) instead of 4 (`seeds/pantry/decor/own`).
DEFECT H2: `market/feature.js` stepper is not clamped to `s.owned`, sending `market_sell` with `count > owned` without refusal.
DEFECT H3: `canvas-pig.js:2350` checks `poopCount > 0` on outdoor scenes without checking `sceneId === 'salon'`, sending `clean` on ground clicks.
DEFECT H8: `rooms/mock.js` `CATALOG` lacks `stall_basic`/`stall_big`, so `room_move` ignores stall moves in mock and hotspot rect does not move.
DEFECT H9: `CuyHome.listFeatures()` (`app.js:784`) filters out `farm`, so `farm.onState` never runs to bind `CanvasPig.onHotspot`; unbought plots show no hint.
DEFECT H10: `places/mock.js` `OUTDOOR_SEED.farm` does not seed `fx:farm:plot:0..3` instances (0 plot instances in default mock).
DEFECT H11: `farm` scene panel fails to open via hotspot (`listFeatures` filter) and `CuyMarket` panel stays open when switching scenes.
DEFECT H12: Canvas hotspots have no DOM tabstops or keyboard Tab/Enter handlers wired in `canvas-pig.js`.
DEFECT H13: `canvas-pig.js:2364` calls `_hotspotListeners` directly without `CuyHotspots.createTracker()` 250ms cooldown, firing 10 times on 10 rapid clicks.
