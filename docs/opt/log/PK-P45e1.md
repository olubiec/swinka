# PK-P45e1: Room scene definition from the layout grid
- Extracted layout lookup from `placedThings` into local `layoutFor(sceneId, state)` and exposed on `CuyScenes.layoutFor`.
- Updated `CuyScenes.def(sceneId, time, state)` for scenes with `size_from_layout`: returns `{ size, wallH, walk, ... }` derived via `CuyRoomGeometry.geometry(layout)`.
- When no layout is present, `def` falls back to JSON `size: [192, 112]`, `wallH: 32`, and `walk: [8, 40, 184, 110]`.
- Outdoor scenes remain untouched with exact JSON attributes (no `wallH`), preserving backwards compatibility.
- `placedThings` now calculates item positions using `CuyRoomGeometry.cellToPx(layout, x, y, cw, ch)`.
- Updated `DEFAULT_SCENES` fallbacks and lazy synchronous reading of `place_scenes.json` in CommonJS.
- Added `tools/qa/ux-p45-room-scene.js` validating RS1-RS6; all checks and `ux-p33-scene-draw.js` (E1-E7) passed.
