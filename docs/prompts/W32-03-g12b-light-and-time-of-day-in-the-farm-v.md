# W32-03: G12b: light and time of day in the farm view
Zmieniaj: web/home/features/farm/feature.js
Wymagane: web/home/features/farm/feature.js
Weryfikacja: node tools/qa/web-smoke.js
Pytania: nie zadawaj pytań i nie czekaj na odpowiedź. Jeśli czegoś brakuje lub coś jest niejasne, sam wybierz najrozsądniejsze rozwiązanie zgodne z AGENTS.md, zapisz decyzję w opisie PR i dokończ zadanie do końca.
Nie ruszaj: web/home/app.js, web/home/lib/*, web/home/index.html, assets/*, AGENTS.md, docs/*, tasks/*
Goal: The farm screen is lit by the time of day and by its lamps, drawn with the pixel-art light assets.
Depends on: W31 merged (`lib/lights.js`, `tools/qa/lights-test.js`), W20 and W30 merged (this view exists).
Facts: Use `Lights.periodOf(new Date())`, `Lights.ambientFor`, `Lights.activeSources(lights, place, placedItems, period, toggles)` from `web/home/lib/lights.js` (read its header for the exact signatures). Place is `outdoor`. Apply the ambient tint to the farm scene (`bg/farm.png`, `bg/orchard.png`) and to plots and crops; the barn item `barn_hay` may carry a window light if `lights.json` lists it. Rendering rules (from `docs/SWIATLO_SWINEK.md` and `assets/data/lights.json`): scene order is background and furniture, then ambient tint from `Lights.ambientFor`, then each active source (glow circle or its `mask`, nearest-scaled, additive, radius `radius_cells` x 16 px), then the `on_file` sprite strip (frames side by side, width = item size[0], `fps` from the source). Never load `file_x2` files: draw 1x sprites and scale them with an integer factor and `imageSmoothingEnabled = false`. If `lights.json` or any image fails to load, draw the scene without light (no exception). Include `lib/lights.js` in the page through the same mechanism the file already uses for its other libs (check `web/home/index.html` only to read how scripts are listed; do NOT edit it: if a script tag is missing, load the module from this file with a dynamic `<script>` insertion guarded by a flag). Test rules: keep checks deterministic; no network; use repo-relative paths from the repository root.
Steps:
1. Read the current drawing code of this file and find where the scene is painted; add the light pass after the scene and before UI overlays.
2. Refresh the light when the period changes (check once a minute) and when items are placed or removed.
3. Add no new dependencies and no new files. Keep edit mode readable: no tint while editing the grid.
4. Run the verification command.
Prohibited: changing or deleting existing test assertions, new dependencies, touching files outside "Zmieniaj". Names and signatures from earlier waves are given as planned. If the real code differs, use the real code, list each difference in the PR, and continue (do not stop, nobody will answer).
PR: what was done, decisions and why, how to check by hand.
