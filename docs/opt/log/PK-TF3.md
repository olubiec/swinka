# PK-TF3 Log
- Created `tools/qa/ux-p73-drag-collision-lamps.js` (Playwright, `openHome` + `mock=seven`, `420x640`, `STRICT=1` support, Edge fallback when Playwright Chromium binary is absent).
- Verified with `node --check tools/qa/ux-p73-drag-collision-lamps.js; if ($LASTEXITCODE -eq 0) { node tools/qa/ux-p73-drag-collision-lamps.js }` (exit 0).
- `PASS C1-footprint-full-pixel-width`: room `32/32 px`, stall `48/48 px` blocked.
- `DEFECT C2-pigs-never-walk-through-items`: `market` `pig_1` at `(144, 128)` on steps 52-54 fails `CanvasPig.isFree(p.x, p.y)`.
- `DEFECT C3-lamp-hotspots-pixel-sized`: `CanvasPig.getHotspots()` returned `0` hotspots in `room_1`, `garden`, `park`.
- `DEFECT C4-indoor-lamp-click-toggles-off-and-on`: no lamp hotspot with `uid` found in `room_1`.
- `DEFECT C5-outdoor-lantern-click-toggles`: no lantern hotspot found in `garden` or `park`.
- `PASS C6-no-console-errors`.
