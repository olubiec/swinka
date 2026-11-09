# PK-P45b: Room geometry from layout grid
- Implemented pure module `CuyRoomGeometry` (`window.CuyRoomGeometry` and CommonJS `module.exports`).
- Exports: `CELL = 16`, `geometry(layout)`, `cellToPx(layout, cx, cy, cw, ch)`, `pxToCell(layout, x, y)`.
- `geometry(layout)` returns `{ size: [w, h], wallH, floor: [0, wallH, w, h], walk: [8, wallH+8, w-8, h-2], cell: 16 }`.
- Default fallback is 12x7 with wallRows 2; wallRows is clamped to 1..rows-2.
- `cellToPx` computes bottom-centre `{ x: (cx + cw/2)*16, y: (cy + ch)*16 }` matching CuyScenes.placedThings.
- `pxToCell` is the inverse, clamped to [0..cols-1, 0..rows-1], returning integer `{ cx, cy }`.
- Included `room-geometry.js` before `scenes.js` in `web/home/index.html`.
- Added `tools/qa/ux-p45-room-geometry.js` covering G1-G7; all 7 checks pass.
