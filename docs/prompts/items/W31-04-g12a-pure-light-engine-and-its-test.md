# W31-04: G12a: pure light engine and its test
Zmieniaj: web/home/lib/lights.js, tools/qa/lights-test.js
Wymagane: web/home/lib/lights.js, tools/qa/lights-test.js
Weryfikacja: node tools/qa/lights-test.js
Pytania: nie zadawaj pytań i nie czekaj na odpowiedź. Jeśli czegoś brakuje lub coś jest niejasne, sam wybierz najrozsądniejsze rozwiązanie zgodne z AGENTS.md, zapisz decyzję w opisie PR i dokończ zadanie do końca.
Nie ruszaj: web/home/app.js, web/home/index.html, web/home/features/*, assets/*, AGENTS.md, docs/*, tasks/*
Goal: A pure browser module turns `lights.json`, the time of day and the placed items into the light data a renderer needs.
Depends on: none.
Facts: Contract: `assets/data/lights.json` (version 2): `ambient[morning|day|evening|night] = {color:[r,g,b] multiplier, level}`, `steps` (5), `dither` (`bayer4`), `sources[id]` with `place` (`indoor|outdoor|both`), `color`, `radius_cells`, `strength`, `flicker`, `toggle`, `item` (atlas id), `file`, `on_file`, `frames`, `fps`, `glow:[x,y]`, optional `mask`, `warms_ambient`, `hue_cycle`, `auto_at` (`lamp_street`: turns on at that period), `window.window_tods`. Pig lighting rules: `docs/SWIATLO_SWINEK.md` (pig light strength 0.5). The module must work both in the browser (`root.Lights`) and in Node (`module.exports`) so the test can `require` it. Period boundaries: if the garden background code already defines them (grep `evening` in `web/home`), reuse the same hours; otherwise use morning 06-10, day 10-17, evening 17-21, night 21-06 as named constants. Test rules: keep checks deterministic; no network; use repo-relative paths from the repository root.
Steps:
1. `periodOf(date)` -> `morning|day|evening|night`.
2. `ambientFor(lights, period)` -> `{color, level}`; unknown period falls back to `day`.
3. `activeSources(lights, place, placedItems, period, toggles)`: `placedItems` is `[{id, x, y}]` in grid cells; return one entry per placed item that has a source whose `place` matches (`indoor` for rooms, `outdoor` for garden/park/farm/market, `both` always); `on` is true when `toggles[id]` says so, else automatic: `toggle:true` sources are on in evening and night, `auto_at` sources on from that period, others always on; include `frames`, `fps`, `file`/`on_file`, `mask`, `glow`, `radiusCells`, `strength`, `flicker`, `color`.
4. `tint(rgb, ambient)` multiplies and clamps; `nearest(rgb, paletteArray)` returns the closest palette colour (palette from `assets/data/style_palette.json`, passed in by the caller).
5. `tools/qa/lights-test.js` loads the real `assets/data/lights.json` and `style_palette.json`, asserts every period resolves, a lamp is off at noon and on at evening, `lamp_street` follows `auto_at`, `place` filtering works (a fireplace is not returned for the garden unless its `place` says so), `nearest` returns a palette member, and prints `LIGHTS OK`.
Prohibited: changing or deleting existing test assertions, new dependencies, touching files outside "Zmieniaj". Names and signatures from earlier waves are given as planned. If the real code differs, use the real code, list each difference in the PR, and continue (do not stop, nobody will answer).
PR: what was done, decisions and why, how to check by hand.
