# PK-31a: Asset checker, light engine and 9-slice UI assets
Zmieniaj: tools/qa/check-assets.js, web/home/lib/lights.js, tools/qa/lights-test.js, web/home/lib/ui-assets.js, web/home/style.css
Wymagane: tools/qa/check-assets.js, web/home/lib/lights.js, tools/qa/lights-test.js, web/home/lib/ui-assets.js
Weryfikacja: node --check tools/qa/check-assets.js && node --check web/home/lib/lights.js && node --check tools/qa/lights-test.js && node --check web/home/lib/ui-assets.js && node tools/qa/web-smoke.js && node tools/qa/check-assets.js && node tools/qa/lights-test.js && node tools/qa/check-css-vars.js
Pytania: nie zadawaj pytań i nie czekaj na odpowiedź. Jeśli czegoś brakuje lub coś jest niejasne, sam wybierz najrozsądniejsze rozwiązanie zgodne z AGENTS.md, zapisz decyzję w opisie PR i dokończ do końca.
Nie ruszaj: AGENTS.md, docs/archive/, tasks/*, every file not listed in Zmieniaj
Items (in this order): W31-01, W31-04, W31-03
Goal: Asset checker, light engine and 9-slice UI assets.
Steps: work the items below in order; after each item run the quick check (the Weryfikacja line, or only the part that concerns the item), fix, then make one commit "[<item id>] <item title>". If time runs out, finish and commit the current item and list the unfinished items in the PR. Earlier stages are "merged" = present in the repo now. Where an item has a "Package override", it wins over any conflicting file or step in the item text; the `Zmieniaj` line of this package is authoritative.
Prohibited: changing or deleting existing test assertions, new dependencies, touching files outside "Zmieniaj". Names and signatures from earlier waves are given as planned. If the real code differs, use the real code, list each difference in the PR, and continue (do not stop, nobody will answer).
Test rules: use `RepoFile(...)` for repo files, inject tables and `Random`/clock instead of assigning statics (`Current`), keep tests deterministic.
PR: one pull request for the package; for each item what was done, decisions and why, how to check by hand; a screenshot for visual changes; anything left undone.

## Item W31-01: G10: check-assets.js, every referenced asset exists
Files of this item: tools/qa/check-assets.js
Goal: One Node script proves that every asset id used by the data files has its file and every icon class has an entry.
Depends on: W30 merged.
Facts: Pure Node.js (CommonJS, no dependencies, same style as `tools/qa/check-icons.js`). Inspect the real JSON shape of each file first. Data to cover: `assets/world/atlas.json` (`items[id].file`, `file_x2`, paths relative to `assets/world/`), `assets/world/tiles.json`, `assets/data/world_items.json` (every id has an atlas entry or is listed as glyph fallback in `docs/DESIGNER_BRIEF.md`), `assets/data/farm.json` crops and `assets/data/items_farm.json` icons, `assets/data/pigs_named.json` (sheets in `assets/sprites/pigs/<id>/<stage>/`, portraits in `assets/sprites/portraits/<id>.png`), `assets/ui/ui.json` (`items[].file`, relative to `assets/`), `assets/props/props.json`, `assets/data/lights.json` (`sources[].file`, `on_file`, `mask`, `window_tods`, `dust.file`, relative to `assets/world/`), `assets/app-icon/*`. Icons: every `icon-<id>` class used in `web/home/**` (css, js, html) must exist in `assets/icons/icons.json` and have a CSS rule in `web/home/style.css`. Test rules: keep checks deterministic; no network; use repo-relative paths from the repository root.
Steps:
1. Collect all referenced paths from the files above and check each exists on disk (fs.existsSync); collect problems in an array with the file that references them.
2. Check the icon rule from Facts without importing `check-icons.js`.
3. Print `ASSETS OK` and exit 0 when no problems; otherwise print one line per problem and exit 1.
4. Run it; if it reports real missing files, do NOT create them: list them in the PR (art is done by a human/Claude Code, code draws glyph fallbacks). Only if the list is non-empty and every entry is on the documented fallback list may the script treat them as warnings (print `WARN`, exit 0).

## Item W31-04: G12a: pure light engine and its test
Files of this item: web/home/lib/lights.js, tools/qa/lights-test.js
Goal: A pure browser module turns `lights.json`, the time of day and the placed items into the light data a renderer needs.
Depends on: none.
Facts: Contract: `assets/data/lights.json` (version 2): `ambient[morning|day|evening|night] = {color:[r,g,b] multiplier, level}`, `steps` (5), `dither` (`bayer4`), `sources[id]` with `place` (`indoor|outdoor|both`), `color`, `radius_cells`, `strength`, `flicker`, `toggle`, `item` (atlas id), `file`, `on_file`, `frames`, `fps`, `glow:[x,y]`, optional `mask`, `warms_ambient`, `hue_cycle`, `auto_at` (`lamp_street`: turns on at that period), `window.window_tods`. Pig lighting rules: `docs/SWIATLO_SWINEK.md` (pig light strength 0.5). The module must work both in the browser (`root.Lights`) and in Node (`module.exports`) so the test can `require` it. Period boundaries: if the garden background code already defines them (grep `evening` in `web/home`), reuse the same hours; otherwise use morning 06-10, day 10-17, evening 17-21, night 21-06 as named constants. Test rules: keep checks deterministic; no network; use repo-relative paths from the repository root.
Steps:
1. `periodOf(date)` -> `morning|day|evening|night`.
2. `ambientFor(lights, period)` -> `{color, level}`; unknown period falls back to `day`.
3. `activeSources(lights, place, placedItems, period, toggles)`: `placedItems` is `[{id, x, y}]` in grid cells; return one entry per placed item that has a source whose `place` matches (`indoor` for rooms, `outdoor` for garden/park/farm/market, `both` always); `on` is true when `toggles[id]` says so, else automatic: `toggle:true` sources are on in evening and night, `auto_at` sources on from that period, others always on; include `frames`, `fps`, `file`/`on_file`, `mask`, `glow`, `radiusCells`, `strength`, `flicker`, `color`.
4. `tint(rgb, ambient)` multiplies and clamps; `nearest(rgb, paletteArray)` returns the closest palette colour (palette from `assets/data/style_palette.json`, passed in by the caller).
5. `tools/qa/lights-test.js` loads the real `assets/data/lights.json` and `style_palette.json`, asserts every period resolves, a lamp is off at noon and on at evening, `lamp_street` follows `auto_at`, `place` filtering works (a fireplace is not returned for the garden unless its `place` says so), `nearest` returns a palette member, and prints `LIGHTS OK`.

## Item W31-03: G11: 9-slice UI assets and the CSS classes that use them
Files of this item: web/home/lib/ui-assets.js, web/home/style.css
Goal: The Home page can draw panels, buttons and separators from the pixel-art 9-slice pieces in `assets/ui/` instead of flat CSS boxes.
Depends on: none.
Facts: `assets/ui/ui.json` has `items[id] = { file, size:[w,h], slice:[l,t,r,b] }` for `panel_paper`, `panel_wood`, `btn_normal`, `btn_hover`, `btn_pressed`, `sep_h`, `sep_v`, `header_banner`, `shop_panel`. `web/home/lib/sprites.js` shows the project style for a browser module (IIFE, `root.X = ...`, assets base `https://cuy.assets/` in the app, relative path in the mock). Wiring into `app.js` is done in a later task, so do not touch `app.js` or `index.html`. Test rules: keep checks deterministic; no network; use repo-relative paths from the repository root.
Steps:
1. Create `web/home/lib/ui-assets.js` (same IIFE style): `UiAssets.apply(rootElement)` fetches `assets/ui/ui.json` once and sets CSS custom properties on `:root`, one per item: `--ui-<id>` (with `_` kept) holding `url(<assets base>/ui/<file>)`; on any failure it does nothing (flat CSS stays).
2. In `web/home/style.css` add classes `.ui-panel-paper`, `.ui-panel-wood`, `.ui-btn` (+ `:hover`, `:active`), `.ui-sep-h`, `.ui-sep-v`, `.ui-banner` using `border-image: var(--ui-<id>) <slice> fill / <slice>px` and `image-rendering: pixelated`, each with a fallback `background`/`border` that works when the variable is missing. Define the variables with `initial` fallbacks at `:root` so `node tools/qa/check-css-vars.js` stays green.
3. Do not restyle existing screens. Run both verification commands.
