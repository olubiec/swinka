# W31-01: G10: check-assets.js, every referenced asset exists
Zmieniaj: tools/qa/check-assets.js
Wymagane: tools/qa/check-assets.js
Weryfikacja: node tools/qa/check-assets.js
Pytania: nie zadawaj pytań i nie czekaj na odpowiedź. Jeśli czegoś brakuje lub coś jest niejasne, sam wybierz najrozsądniejsze rozwiązanie zgodne z AGENTS.md, zapisz decyzję w opisie PR i dokończ zadanie do końca.
Nie ruszaj: src/*, web/*, assets/*, AGENTS.md, docs/*, tasks/*
Goal: One Node script proves that every asset id used by the data files has its file and every icon class has an entry.
Depends on: W30 merged.
Facts: Pure Node.js (CommonJS, no dependencies, same style as `tools/qa/check-icons.js`). Inspect the real JSON shape of each file first. Data to cover: `assets/world/atlas.json` (`items[id].file`, `file_x2`, paths relative to `assets/world/`), `assets/world/tiles.json`, `assets/data/world_items.json` (every id has an atlas entry or is listed as glyph fallback in `docs/DESIGNER_BRIEF.md`), `assets/data/farm.json` crops and `assets/data/items_farm.json` icons, `assets/data/pigs_named.json` (sheets in `assets/sprites/pigs/<id>/<stage>/`, portraits in `assets/sprites/portraits/<id>.png`), `assets/ui/ui.json` (`items[].file`, relative to `assets/`), `assets/props/props.json`, `assets/data/lights.json` (`sources[].file`, `on_file`, `mask`, `window_tods`, `dust.file`, relative to `assets/world/`), `assets/app-icon/*`. Icons: every `icon-<id>` class used in `web/home/**` (css, js, html) must exist in `assets/icons/icons.json` and have a CSS rule in `web/home/style.css`. Test rules: keep checks deterministic; no network; use repo-relative paths from the repository root.
Steps:
1. Collect all referenced paths from the files above and check each exists on disk (fs.existsSync); collect problems in an array with the file that references them.
2. Check the icon rule from Facts without importing `check-icons.js`.
3. Print `ASSETS OK` and exit 0 when no problems; otherwise print one line per problem and exit 1.
4. Run it; if it reports real missing files, do NOT create them: list them in the PR (art is done by a human/Claude Code, code draws glyph fallbacks). Only if the list is non-empty and every entry is on the documented fallback list may the script treat them as warnings (print `WARN`, exit 0).
Prohibited: changing or deleting existing test assertions, new dependencies, touching files outside "Zmieniaj". Names and signatures from earlier waves are given as planned. If the real code differs, use the real code, list each difference in the PR, and continue (do not stop, nobody will answer).
PR: what was done, decisions and why, how to check by hand.
