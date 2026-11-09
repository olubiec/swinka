# PK-P45c3: Register trim sprites in tiles.json

- Registered `trim` top-level key in `assets/world/tiles.json` with `baseboard` (file: `house/trim_baseboard.png`, size: [16, 8]) and `floor_shadow` (file: `house/trim_floor_shadow.png`, size: [16, 4]).
- Preserved existing keys (`note`, `bg`, `tiles`, `market`) and original 1-space indentation and CRLF format in `tiles.json`.
- Implemented `tools/qa/ux-p45-trim-art.js` verifying TA1 (original keys intact & trim present), TA2 (files exist & IHDR sizes match declared sizes), TA3 (`check-assets.js` runs cleanly).
- Verification passes without errors.
