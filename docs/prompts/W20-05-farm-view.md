# W20-05: Farm view: plots, planting menu, watering, harvest all
Zmieniaj: web/home/features/farm/feature.js, web/home/features/farm/feature.css
Wymagane: web/home/features/farm/feature.js
Weryfikacja: node --check web/home/features/farm/feature.js && node tools/qa/web-smoke.js
Pytania: nie zadawaj pytań i nie czekaj na odpowiedź. Jeśli czegoś brakuje lub coś jest niejasne, sam wybierz najrozsądniejsze rozwiązanie zgodne z AGENTS.md, zapisz decyzję w opisie PR i dokończ zadanie do końca.
Nie ruszaj: src/*, AGENTS.md, docs/*, tasks/*, web/home/app.js, web/home/bridge.js
Goal: The player can run the farm from the Home page.
Depends on: W19 merged (state key `farm`, messages `farm_*`, `orchard_*`).
Facts: Draw the plots as a grid (6 columns), each with state empty/growing/ripe, a small progress bar and a timer text from `secondsLeft` (the page counts down locally between state pushes, never decides ripeness itself). Click an empty plot opens a menu of unlocked crops with seeds owned and 'Plant'; click a growing plot waters it (`farm_water`); click a ripe plot harvests it. Buttons: 'Harvest all', 'Water all' (if the can allows), upgrades row (next plot pack, orchard slot, can, sprinkler with prices and disabled states). Orchard row with stock and 'Collect'. Locked crops show the padlock and 'N more harvests'. Crop sprites come later (S1); use emoji glyphs by crop id until then. Text English. Test rules: use `RepoFile(...)` for repo files, inject tables and `Random`/clock instead of assigning statics (`Current`), keep tests deterministic.
Steps:
1. Implement as described; no timers that send messages automatically; everything user-driven.
Prohibited: changing or deleting existing test assertions, new dependencies, touching files outside "Zmieniaj". Names and signatures from earlier waves are given as planned. If the real code differs, use the real code, list each difference in the PR, and continue (do not stop, nobody will answer).
PR: what was done, decisions and why, how to check by hand.
