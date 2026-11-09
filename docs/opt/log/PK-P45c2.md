# PK-P45c2: Art: floor-edge dither shadow
- Generated `assets/world/house/trim_floor_shadow.png` (16x4 RGBA) via `tools/art/room_trim_shadow.py`.
- Uses palette colors Plum A `#382538` and Plum B `#54394f`; opaque pixel counts per row are 16, 8, 4, 0 with no partial alpha.
- Visual review at 8x magnification over floor wood tile confirms a clean baseboard drop-shadow with crisp dithering that blends naturally rather than reading as noise.
- Exported asset: `assets/world/house/trim_floor_shadow.png` (16x4, repeating on x; key `trim.floor_shadow` for `tiles.json` in PK-P45c3).
- Added QA test `tools/qa/ux-p45-trim-shadow.js` verifying S1 (dimensions), S2 (palette), S3 (binary alpha), S4 (row counts), and S5 (idempotency).
- Verification line passed with 0 style violations and check-assets OK. Status: DONE.
