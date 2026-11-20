PK-RF1 completed: wrote `docs/opt/foundations/RF1.md` and `docs/opt/log/PK-RF1.md` within strict read-range limits.
Decisions:
- Kept `## 1.`..`## 5.` top-level headings (subsections use `###`) and bounded `litFrame` cache to per-entry 64x64 canvases keyed by `origin.x/2, origin.y/2` so `this.litCanvas` is never shared across cached entries.
- Recommended `isDragging()` return `!!this.drag` (matching `feature.js:1010` `inst && !!inst.drag`) and context-guarded `img._cachedPatternCtx === ctx`.
Differences from planned names/lines:
- `canvas-pig.js` lines `240-315` do not contain `setLightScene` (`250-258`/`298` are animation rows and `PigCanvas.constructor`); noted for symbol lookup in `PK-PF-CV`.
- `drawHabitat` (`2930-3030`) has 4 `ctx.createPattern` calls (`2938, 2961, 2990, 3014`), not 3 (`2938, 2977, 3014`).
- `applyScene` (`feature.js`) also unguardedly calls `syncHotspots`, `syncWeatherLayer`, and `setEdgeNeighbours`; `isPigBeingDragged` already exists at line `1010`.
Left undone: `updateStageNav`, `PigCanvas.setThings`, `endDrag` (>2310), and `window.CanvasPig` export block were outside `Czytaj tylko` and unread.
