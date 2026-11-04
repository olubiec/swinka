PK-32a log (W32-01..W32-04: all four items coded; Weryfikacja: node --check OK on 4 files, web-smoke exit 1, see last lines)
- lib/lights.js is not in index.html: each feature inserts it once as a dynamic script (guard: script[data-cuy-lights]). Data: url('data/lights.json'). oneX() strips _x2 so only 1x files load.
- Per-lamp toggles: activeSources keys by placed id, so each placed item is passed under its uid (sources copied per uid). Toggle memory: S.lampToggles only. Play mode = no drawer item picked and no move.
- Edit mode = drawer item picked or item being moved: rooms and garden skip the whole light pass (tint, glow, strips); the grid stays readable.
- Assumed: lights.json file/mask/dust paths are relative to assets/ (as atlas paths are). Strip frame width = atlas size[0] when the atlas has the item, else sheet width / frames.
- Garden: garden_<period>.png / park_<period>.png drawn under the floor tiles (tiles at alpha 0.35 when the bg loads). Dust strip at alpha 0.3 around lit lamps.
- Farm: no scene canvas exists, so bg/farm.png and bg/orchard.png are NOT drawn; tint applies to plot canvases (plots and crops). No placed items, so no barn window light.
- Market: no placed items, tint is a multiply overlay div (inline style, no CSS file); posters poster_1..3 drawn from atlas only if present.
- Period checked once a minute per view; rooms/garden redraw every 250 ms only while a lamp animates.
- web-smoke: all checks PASS except 404s (exit 1) for assets/fx/dust_motes.png, assets/fx/cone_shade.png, assets/house/lamp_floor.png named by lights.json; these W31 files are not in the repo yet. Code falls back to no light.
OPEN (verify red, not fixed): web-smoke exits 1 on 404 for assets/fx/dust_motes.png, assets/fx/cone_shade.png, assets/house/lamp_floor.png, which lights.json names. These files are not in the repo. The code falls back to no light. Fix: create the assets (visual waves) or allow-list them in web-smoke ALLOWED_MISSING with an owner decision.
