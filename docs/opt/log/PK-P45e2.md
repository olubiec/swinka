# PK-P45e2: Room drawn from the grid with trim sprites
- Stored def.wallH in setScene(def) (default 32 for room scenes, preserved for outdoor scenes); drawHabitat uses this.wallH, this.sceneWidth, this.sceneHeight.
- Replaced hardcoded trims (#c98d50, #6e4424, rgba(0,0,0,0.15)) with world/house/trim_baseboard.png (y = wallH - 8) and world/house/trim_floor_shadow.png (y = wallH).
- Resolved trim URLs via trim keys in world/tiles.json and loaded through loadCachedImage; whole pixel rendering without old colors.
- Added floorLine() returning bottom of walk band (this.walk[3] or 119 fallback); replaced hardcoded floorY: 119 in render().
- Exposed CanvasPig.debug().wallH, CanvasPig.wallH getter, and CanvasPig.floorLine().
- Added QA test suite in tools/qa/ux-p45-room-draw.js covering RD1-RD6 (Playwright + Node fallback).
- Verification command passed cleanly: all RD1-RD6, E1-E7 (ux-p33), and W1-W8 (ux-p34) tests green.
