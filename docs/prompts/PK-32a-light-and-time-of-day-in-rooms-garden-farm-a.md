# PK-32a: Light and time of day in rooms, garden, farm and market views
Zmieniaj: web/home/features/rooms/feature.js, web/home/features/garden/feature.js, web/home/features/farm/feature.js, web/home/features/market/feature.js
Wymagane: web/home/features/rooms/feature.js, web/home/features/garden/feature.js, web/home/features/farm/feature.js, web/home/features/market/feature.js
Weryfikacja: node --check web/home/features/rooms/feature.js && node --check web/home/features/garden/feature.js && node --check web/home/features/farm/feature.js && node --check web/home/features/market/feature.js && node tools/qa/web-smoke.js
Pytania: nie zadawaj pytań i nie czekaj na odpowiedź. Jeśli czegoś brakuje lub coś jest niejasne, sam wybierz najrozsądniejsze rozwiązanie zgodne z AGENTS.md, zapisz decyzję w opisie PR i dokończ do końca.
Nie ruszaj: AGENTS.md, docs/archive/, tasks/*, every file not listed in Zmieniaj
Items (in this order): W32-01, W32-02, W32-03, W32-04
Goal: Light and time of day in rooms, garden, farm and market views.
Steps: work the items below in order; after each item run the quick check (the Weryfikacja line, or only the part that concerns the item), fix, then make one commit "[<item id>] <item title>". If time runs out, finish and commit the current item and list the unfinished items in the PR. Earlier stages are "merged" = present in the repo now. Where an item has a "Package override", it wins over any conflicting file or step in the item text; the `Zmieniaj` line of this package is authoritative.
Prohibited: changing or deleting existing test assertions, new dependencies, touching files outside "Zmieniaj". Names and signatures from earlier waves are given as planned. If the real code differs, use the real code, list each difference in the PR, and continue (do not stop, nobody will answer).
Test rules: use `RepoFile(...)` for repo files, inject tables and `Random`/clock instead of assigning statics (`Current`), keep tests deterministic.
PR: one pull request for the package; for each item what was done, decisions and why, how to check by hand; a screenshot for visual changes; anything left undone.

## Item W32-01: G12b: light and time of day in the rooms view
Files of this item: web/home/features/rooms/feature.js
Goal: The rooms (house, pig rooms, shared bedroom) screen is lit by the time of day and by its lamps, drawn with the pixel-art light assets.
Depends on: W31 merged (`lib/lights.js`, `tools/qa/lights-test.js`), W20 and W30 merged (this view exists).
Facts: Use `Lights.periodOf(new Date())`, `Lights.ambientFor`, `Lights.activeSources(lights, place, placedItems, period, toggles)` from `web/home/lib/lights.js` (read its header for the exact signatures). Place is `indoor`. Respect the per-lamp toggle: clicking a placed lamp in play mode (not in edit mode) toggles it and remembers the choice in a module variable only (no save changes). Rendering rules (from `docs/SWIATLO_SWINEK.md` and `assets/data/lights.json`): scene order is background and furniture, then ambient tint from `Lights.ambientFor`, then each active source (glow circle or its `mask`, nearest-scaled, additive, radius `radius_cells` x 16 px), then the `on_file` sprite strip (frames side by side, width = item size[0], `fps` from the source). Never load `file_x2` files: draw 1x sprites and scale them with an integer factor and `imageSmoothingEnabled = false`. If `lights.json` or any image fails to load, draw the scene without light (no exception). Include `lib/lights.js` in the page through the same mechanism the file already uses for its other libs (check `web/home/index.html` only to read how scripts are listed; do NOT edit it: if a script tag is missing, load the module from this file with a dynamic `<script>` insertion guarded by a flag). Test rules: keep checks deterministic; no network; use repo-relative paths from the repository root.
Steps:
1. Read the current drawing code of this file and find where the scene is painted; add the light pass after the scene and before UI overlays.
2. Refresh the light when the period changes (check once a minute) and when items are placed or removed.
3. Add no new dependencies and no new files. Keep edit mode readable: no tint while editing the grid.
4. Run the verification command.

## Item W32-02: G12b: light and time of day in the garden and park view
Files of this item: web/home/features/garden/feature.js
Goal: The garden and park screen is lit by the time of day and by its lamps, drawn with the pixel-art light assets.
Depends on: W31 merged (`lib/lights.js`, `tools/qa/lights-test.js`), W20 and W30 merged (this view exists).
Facts: Use `Lights.periodOf(new Date())`, `Lights.ambientFor`, `Lights.activeSources(lights, place, placedItems, period, toggles)` from `web/home/lib/lights.js` (read its header for the exact signatures). Place is `outdoor`; fire sources appear only here. Use the time-of-day backgrounds `assets/world/bg/garden_<period>.png` and `park_<period>.png` and add the `dust_motes` strip (`lights.dust`) in lit areas at low opacity. Rendering rules (from `docs/SWIATLO_SWINEK.md` and `assets/data/lights.json`): scene order is background and furniture, then ambient tint from `Lights.ambientFor`, then each active source (glow circle or its `mask`, nearest-scaled, additive, radius `radius_cells` x 16 px), then the `on_file` sprite strip (frames side by side, width = item size[0], `fps` from the source). Never load `file_x2` files: draw 1x sprites and scale them with an integer factor and `imageSmoothingEnabled = false`. If `lights.json` or any image fails to load, draw the scene without light (no exception). Include `lib/lights.js` in the page through the same mechanism the file already uses for its other libs (check `web/home/index.html` only to read how scripts are listed; do NOT edit it: if a script tag is missing, load the module from this file with a dynamic `<script>` insertion guarded by a flag). Test rules: keep checks deterministic; no network; use repo-relative paths from the repository root.
Steps:
1. Read the current drawing code of this file and find where the scene is painted; add the light pass after the scene and before UI overlays.
2. Refresh the light when the period changes (check once a minute) and when items are placed or removed.
3. Add no new dependencies and no new files. Keep edit mode readable: no tint while editing the grid.
4. Run the verification command.

## Item W32-03: G12b: light and time of day in the farm view
Files of this item: web/home/features/farm/feature.js
Goal: The farm screen is lit by the time of day and by its lamps, drawn with the pixel-art light assets.
Depends on: W31 merged (`lib/lights.js`, `tools/qa/lights-test.js`), W20 and W30 merged (this view exists).
Facts: Use `Lights.periodOf(new Date())`, `Lights.ambientFor`, `Lights.activeSources(lights, place, placedItems, period, toggles)` from `web/home/lib/lights.js` (read its header for the exact signatures). Place is `outdoor`. Apply the ambient tint to the farm scene (`bg/farm.png`, `bg/orchard.png`) and to plots and crops; the barn item `barn_hay` may carry a window light if `lights.json` lists it. Rendering rules (from `docs/SWIATLO_SWINEK.md` and `assets/data/lights.json`): scene order is background and furniture, then ambient tint from `Lights.ambientFor`, then each active source (glow circle or its `mask`, nearest-scaled, additive, radius `radius_cells` x 16 px), then the `on_file` sprite strip (frames side by side, width = item size[0], `fps` from the source). Never load `file_x2` files: draw 1x sprites and scale them with an integer factor and `imageSmoothingEnabled = false`. If `lights.json` or any image fails to load, draw the scene without light (no exception). Include `lib/lights.js` in the page through the same mechanism the file already uses for its other libs (check `web/home/index.html` only to read how scripts are listed; do NOT edit it: if a script tag is missing, load the module from this file with a dynamic `<script>` insertion guarded by a flag). Test rules: keep checks deterministic; no network; use repo-relative paths from the repository root.
Steps:
1. Read the current drawing code of this file and find where the scene is painted; add the light pass after the scene and before UI overlays.
2. Refresh the light when the period changes (check once a minute) and when items are placed or removed.
3. Add no new dependencies and no new files. Keep edit mode readable: no tint while editing the grid.
4. Run the verification command.

## Item W32-04: G12b: light and time of day in the market view
Files of this item: web/home/features/market/feature.js
Goal: The market screen is lit by the time of day and by its lamps, drawn with the pixel-art light assets.
Depends on: W31 merged (`lib/lights.js`, `tools/qa/lights-test.js`), W20 and W30 merged (this view exists).
Facts: Use `Lights.periodOf(new Date())`, `Lights.ambientFor`, `Lights.activeSources(lights, place, placedItems, period, toggles)` from `web/home/lib/lights.js` (read its header for the exact signatures). Place is `outdoor`. Apply ambient tint only; draw posters `poster_1..3` from the atlas on the stalls if the atlas has them. Rendering rules (from `docs/SWIATLO_SWINEK.md` and `assets/data/lights.json`): scene order is background and furniture, then ambient tint from `Lights.ambientFor`, then each active source (glow circle or its `mask`, nearest-scaled, additive, radius `radius_cells` x 16 px), then the `on_file` sprite strip (frames side by side, width = item size[0], `fps` from the source). Never load `file_x2` files: draw 1x sprites and scale them with an integer factor and `imageSmoothingEnabled = false`. If `lights.json` or any image fails to load, draw the scene without light (no exception). Include `lib/lights.js` in the page through the same mechanism the file already uses for its other libs (check `web/home/index.html` only to read how scripts are listed; do NOT edit it: if a script tag is missing, load the module from this file with a dynamic `<script>` insertion guarded by a flag). Test rules: keep checks deterministic; no network; use repo-relative paths from the repository root.
Steps:
1. Read the current drawing code of this file and find where the scene is painted; add the light pass after the scene and before UI overlays.
2. Refresh the light when the period changes (check once a minute) and when items are placed or removed.
3. Add no new dependencies and no new files. Keep edit mode readable: no tint while editing the grid.
4. Run the verification command.
