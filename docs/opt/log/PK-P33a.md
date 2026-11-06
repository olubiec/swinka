# PK-P33a: Canvas scene background and draw order
- Added CanvasPig.setScene(def), CanvasPig.setThings(list), CanvasPig.setPigVisible(bool), CanvasPig.debug().
- CanvasPig methods also exposed on PigCanvas class, PigCanvas instance, and window.CanvasPig.
- Added CuyScenes.placedThings(state, sceneId) and CuyScenes.loadAtlas() / getAtlas() to features/places/scenes.js.
- Implemented draw order: background, flat items (flat: true, rugs), standing items sorted by bottom edge y with pig, and light layers.
- Pig rendering toggled via pigVisible; idles pig logic and leaves pigDraws at 0 when false.
- Mouse mapping (toScene) dynamically adapts to scene width and height with object-fit cover math.
- tools/qa/ux-p33-scene-draw.js verifies E1 (own-background), E2 (time-of-day), E3 (pixel-clean), E4 (y-sort), E5 (room-regression), E6 (pig-hidden), E7 (mouse-map).
- Decisions: atlas.json loaded synchronously via fs in Node environment and fetched in browser; default cell size 16px.
