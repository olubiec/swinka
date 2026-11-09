# PK-P39c: Walk grid and pathfinding around blockers
- Built 4 px free-cell grid per scene in `canvas-pig.js` on `setScene`/`setThings`: walk band minus `scene.blockers` minus placed standing item footprints.
- APIs exposed: `CanvasPig.debug().grid = {w, h, free: count}`, `CanvasPig.isFree(x, y)`, `CanvasPig.snapToFreeCell(x, y)`.
- Pathfinding: straight line check (`isSegmentFree`) or 8-neighbour A* with no corner cutting and collinear waypoint smoothing.
- Drag & drop: `endDrag` snaps dropped pig from blocked cell to nearest free cell via concentric BFS search within walk band.
- Target picker: `pickRandomWalkTarget` only chooses reachable free cells (A* check + BFS fallback).
- Added `tools/qa/ux-p39-grid.js` testing W1-W6 (never in blocker, path around, reject blocker target, drop snap, standing item footprint, perf).
- Verification passed: `node --check` and all scenarios W1-W6 green.
