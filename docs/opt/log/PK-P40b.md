# PK-P40b: Edit mode: drag from stash onto the scene
- `CanvasPig`: added `setGhost(ghost)`, `cellValid(itemId, x, y)`, `pickAt(x, y)`, `toClient(x, y)`.
- `debug().ghost`: returns `{ itemId, x, y, valid }` during drag, `null` otherwise.
- `edit-panel.js`: card pointerdown initiates drag; DOM ghost follows pointer outside canvas, switching to canvas ghost inside.
- Coordinates snapped to 4 px grid; valid drop dispatches `room_place { place, itemId, x, y }`.
- Invalid placement (out-of-bounds, blocker collision, standing object overlap, indoor in outdoor) shows red tint and cancels.
- Items with 0 owned cannot be dragged (dimmed cards).
- Placed item updates `CuyScenes.placedThings` and marks footprint cell as blocked (`CanvasPig.isFree` = false).
- Verified with Playwright in `tools/qa/ux-p40-edit-place.js` (P1-P7 passing).
