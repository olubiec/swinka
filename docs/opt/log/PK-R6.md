# PK-R6: Research: stash, categories, room templates, lamps and light (P6)
- R6 foundation document produced in docs/opt/foundations/R6.md (5 sections, verified).
- P6 split into PK-P6a (stash categories/search), PK-P6b (bounds & templates), PK-P6c (light/shadows).
- P6-01 and P6-04 confirmed done in Core (WorldState.OwnedItems, Rooms[place].Items).
- P6-02 done in P40 (edit-panel.js, #editDrawer, drag-to-place, move, flip, remove).
- P43e handles lamp hotspot hit detection; P6c provides toggle:false guard and drops initCanvasLampClick.
- P6-07 scoped to removing phantom (120,65) glow and adding procedural canvas ellipse in drawThing.
- Sequence decision: PK-P6a runs after PK-P46c to prevent edit-panel.js merge collisions.
- Verification passed: node tools/qa/foundation-check.js docs/opt/foundations/R6.md 5.
