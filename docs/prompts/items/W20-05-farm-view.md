# W20-05: Farm view: plots, planting menu, watering, harvest all
Zmieniaj: web/home/features/farm/feature.js, web/home/features/farm/feature.css
Wymagane: web/home/features/farm/feature.js
Weryfikacja: node --check web/home/features/farm/feature.js && node tools/qa/web-smoke.js
Pytania: nie zadawaj pytań i nie czekaj na odpowiedź. Jeśli czegoś brakuje lub coś jest niejasne, sam wybierz najrozsądniejsze rozwiązanie zgodne z AGENTS.md, zapisz decyzję w opisie PR i dokończ zadanie do końca.
Nie ruszaj: src/*, AGENTS.md, docs/*, tasks/*, web/home/app.js, web/home/bridge.js
Goal: The player can run the farm from the Home page with pixel-art crop stage sprites.
Depends on: W19 merged (state key `farm`, messages `farm_*`, `orchard_*`).
Facts: Draw the plots as a grid (6 columns), each with state empty/growing/ripe, a small progress bar and a timer text from `secondsLeft` (the page counts down locally between state pushes, never decides ripeness itself). Click an empty plot opens a menu of unlocked crops with seeds owned and 'Plant'; click a growing plot waters it (`farm_water`); click a ripe plot harvests it. Buttons: 'Harvest all', 'Water all' (if the can allows), upgrades row (next plot pack, orchard slot, can, sprinkler with prices and disabled states). Orchard row with stock and 'Collect'. Locked crops show the padlock and 'N more harvests'.
G6 (Crop sprites and beds from docs/PLAN.md and docs/KONTRAKT_ASSETOW.md):
- Each farm plot renders its crop stage sprite from `../../assets/world/farm/farm.png` + `../../assets/world/farm/farm.json` (`plots.empty`, `plots.tilled`, `plots.watered`, `plots.withered`, and `crops[cropId][stage]` 32x32 frame) on a `<canvas width="32" height="32">` or CSS sprite sheet with `image-rendering: pixelated` (keeping text glyphs as fallback/sr-only label).
Text English. Test rules: use `RepoFile(...)` for repo files, inject tables and `Random`/clock instead of assigning statics (`Current`), keep tests deterministic.
Steps:
1. Implement the farm UI, plot grid, countdown timer, planting menu, watering and harvesting actions as described; no timers that send messages automatically; everything user-driven.
2. Render plot states and crop growth stages using sprites from `farm.png` + `farm.json` with fallback glyphs (G6).
Prohibited: changing or deleting existing test assertions, new dependencies, touching files outside "Zmieniaj". Names and signatures from earlier waves are given as planned. If the real code differs, use the real code, list each difference in the PR, and continue (do not stop, nobody will answer).
PR: what was done, decisions and why, how to check by hand.
