# PK-20b: Garden and park view, farm view
Zmieniaj: web/home/features/garden/feature.js, web/home/features/garden/feature.css, web/home/features/farm/feature.js, web/home/features/farm/feature.css, docs/opt/log/PK-20b.md
Wymagane: web/home/features/garden/feature.js, web/home/features/farm/feature.js
Weryfikacja: node --check web/home/features/garden/feature.js && node --check web/home/features/farm/feature.js && node tools/qa/web-smoke.js
Pytania: nie zadawaj pytań i nie czekaj na odpowiedź. Jeśli czegoś brakuje lub coś jest niejasne, sam wybierz najrozsądniejsze rozwiązanie zgodne z AGENTS.md, zapisz decyzję w opisie PR i dokończ do końca.
Nie ruszaj: AGENTS.md, docs/archive/, tasks/*, every file not listed in Zmieniaj
Items (in this order): W20-04, W20-05
Goal: Garden and park view, farm view.
Steps: work the items below in order and keep the files of finished items in place. Do not run git (no commit, branch, PR): the orkiestra commits and merges after the Weryfikacja line passes. After each item run the part of the Weryfikacja line that concerns it and fix failures; if time runs out, finish the current item and say in the log which items are undone. Earlier stages are "merged" = present in the repo now. Where an item has a "Package override", it wins over any conflicting file or step in the item text; the `Zmieniaj` line of this package is authoritative. Docs are named by section: read only that section (grep its heading), never a whole design document or docs/PLAN.md.
Prohibited: changing or deleting existing test assertions, new dependencies, touching files outside "Zmieniaj". Names and signatures from earlier waves are given as planned. If the real code differs, use the real code, list each difference in the PR, and continue (do not stop, nobody will answer).
Test rules: use `RepoFile(...)` for repo files, inject tables and `Random`/clock instead of assigning statics (`Current`), keep tests deterministic.
Log: write `docs/opt/log/PK-20b.md` (max 10 lines: decisions and why, differences from the planned names and signatures, anything left undone). No pull request text.

## Item W20-04: Garden and park view with walks and the memory corner
Files of this item: web/home/features/garden/feature.js, web/home/features/garden/feature.css
Goal: The player can decorate the garden and the park and send a pig for a walk.
Depends on: W19 merged; W20-02's editor API is not available in this wave: implement the view with its own minimal placement code reusing the same messages.
Facts: Same state and messages as the rooms (`rooms.layouts.garden` and `rooms.layouts.park`, `room_*` messages with `place`: garden or park), no wall rows. Top has a tab for Garden and Park (the other is locked and shows its price from `places`). A 'Go for a walk' button sends `walk { place }` and displays the walk scene banner/result illustration from `../../assets/world/walk_scenes.png` + `../../assets/world/walk_scenes.json` (128x48 frame for the chosen path, rendered with `image-rendering: pixelated` - G8 from docs/PLAN.md). Background: sky gradient that depends on the local hour (morning, day, evening, night), grass/soil/stone floor tiles from `../../assets/world/tiles.png` + `tiles.json` (G3), placed items drawn from `../../assets/world/atlas.png` + `atlas.json` with fallback to rectangles with glyphs if not loaded yet (G4), and pigs drawn with portraits/idle sprites (G5). The memory corner (id `memory_corner`) draws names of memorial pigs from `pigs.roster` as small text labels on a stone.
Steps:
1. Implement the view, tab switch, tile/atlas/walk-scene drawing (G3, G4, G5, G8), placement and the walk button; keyboard accessible.

## Item W20-05: Farm view: plots, planting menu, watering, harvest all
Files of this item: web/home/features/farm/feature.js, web/home/features/farm/feature.css
Goal: The player can run the farm from the Home page with pixel-art crop stage sprites.
Depends on: W19 merged (state key `farm`, messages `farm_*`, `orchard_*`).
Facts: Draw the plots as a grid (6 columns), each with state empty/growing/ripe, a small progress bar and a timer text from `secondsLeft` (the page counts down locally between state pushes, never decides ripeness itself). Click an empty plot opens a menu of unlocked crops with seeds owned and 'Plant'; click a growing plot waters it (`farm_water`); click a ripe plot harvests it. Buttons: 'Harvest all', 'Water all' (if the can allows), upgrades row (next plot pack, orchard slot, can, sprinkler with prices and disabled states). Orchard row with stock and 'Collect'. Locked crops show the padlock and 'N more harvests'.
G6 (Crop sprites and beds from docs/PLAN.md and docs/KONTRAKT_ASSETOW.md):
- Each farm plot renders its crop stage sprite from `../../assets/world/farm/farm.png` + `../../assets/world/farm/farm.json` (`plots.empty`, `plots.tilled`, `plots.watered`, `plots.withered`, and `crops[cropId][stage]` 32x32 frame) on a `<canvas width="32" height="32">` or CSS sprite sheet with `image-rendering: pixelated` (keeping text glyphs as fallback/sr-only label).
Text English.
Steps:
1. Implement the farm UI, plot grid, countdown timer, planting menu, watering and harvesting actions as described; no timers that send messages automatically; everything user-driven.
2. Render plot states and crop growth stages using sprites from `farm.png` + `farm.json` with fallback glyphs (G6).
