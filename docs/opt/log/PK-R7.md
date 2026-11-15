# PK-R7: Research: collisions, night lamps, shadows, weather
- Status: Grounded against codebase; verification passed (15809 chars, 5 sections).
- Core placement: use `src/Cuy.Core/World/RoomLayoutOps.cs` (`CanPlace`), not non-existent `Decor/RoomOccupancy.cs`.
- Editor: placement grid & red ghost already done in `web/home/features/places/edit-panel.js` (P40), not `decor/feature.js`.
- Pathfinding & Z-sort: blockers, walk grid and Z-sorting already done in `canvas-pig.js` (P39); reachable toys remain.
- Night lamps & light strips: existing `brazier_on`/`torch_on` need frame slicing in `drawThing`; campfire needs D4.
- Split: P7a (furniture shadows & weather overlay) and P7b (reachable toys & animation scale sync) in Wave 3.
- Wave 4: P7c (animated light strips, outdoor night illumination, D4 campfire) and P7q (QA).
- Exact symbols: `RoomLayoutOps.CanPlace`, `CanvasPig.cellValid`, `CanvasPig.isFree`, `drawThing`, `Lights.activeSources`.
