# PK-P45c1: Art: baseboard strip
- Generated `assets/world/house/trim_baseboard.png` (16x8 RGBA) using idempotent script `tools/art/room_trim_baseboard.py`.
- Exact wood ramp colors used from `style_palette.json`: w0 `#47281c`, w1 `#6f4328`, w2 `#9b6238`, w3 `#c58a52`, w4 `#e3b27a`.
- Bevel, knot, nail, and grain features drawn with seamless matching on columns 0 and 15 (no features on x=0, 15).
- Visual check at 8x magnification confirms it clearly reads as a warm wooden baseboard molding with realistic bevel and subtle grain rather than pixel noise.
- Exported asset: `assets/world/house/trim_baseboard.png` (16x8, repeating on x; key `trim.baseboard` for `tiles.json` in PK-P45c3).
- Added test `tools/qa/ux-p45-trim-baseboard.js` verifying B1 (size 16x8), B2 (palette), B3 (full opacity), B4 (seamless edges), B5 (no #fff/#000), B6 (byte-identical run).
- Verification line passed with 0 style check errors and check-assets OK. Status: DONE.
