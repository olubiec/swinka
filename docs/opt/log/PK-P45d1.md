# PK-P45d1: Scene data depth scale, room size_from_layout, checker rules
- Set `depth_scale` to `[0.9375, 1.0]` across all scenes (`room`, `garden`, `park`, `farm`, `market`).
- Added `size_from_layout: true` to room scene with fallback `size: [192, 112]` and `walk: [8, 40, 184, 110]`.
- Kept all existing scene keys intact (`blockers`, `behindLine`, exits, etc.).
- Extended `tools/qa/place-scenes-check.js` with rules R1 (`depth_scale`), R2 (`walk` bounds), R3 (`size_from_layout` fallback).
- Added `tools/qa/ux-p45-scene-data.js` covering SD1-SD5 (valid data, 3 invalid fixtures rejected, 1/16 step multiples).
- Verification passed: node --check place-scenes-check.js && node --check ux-p45-scene-data.js && ux-p45-scene-data.js && place-scenes-check.js.
