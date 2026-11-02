# W22-03: Web smoke: places bar, rooms, garden, farm and market screens
Zmieniaj: tools/qa/web-smoke.js
Wymagane: tools/qa/web-smoke.js
Weryfikacja: node tools/qa/web-smoke.js
Pytania: nie zadawaj pytań i nie czekaj na odpowiedź. Jeśli czegoś brakuje lub coś jest niejasne, sam wybierz najrozsądniejsze rozwiązanie zgodne z AGENTS.md, zapisz decyzję w opisie PR i dokończ zadanie do końca.
Nie ruszaj: src/*, web/*, AGENTS.md, docs/*, tasks/*
Goal: The smoke test visits the four new screens in the mock and checks layout and errors.
Depends on: W21 merged.
Facts: Use the mock switch `?world=1` (W20-08). Scenarios: the places bar shows five places; the rooms feature loads, canvas present, the drawer lists owned items, placing an item by simulated click updates the item count; the garden shows the walk button; the farm shows 4 plots, planting dandelion changes the plot state, 'Harvest all' is disabled when nothing is ripe; the market shows the cap bar, selling a mock item reduces the owned count and the cap left; no console errors; `layoutProblems` empty at all configured sizes. Do not change existing checks. Test rules: use `RepoFile(...)` for repo files, inject tables and `Random`/clock instead of assigning statics (`Current`), keep tests deterministic.
Steps:
1. Add the scenarios in a new function called from the existing runner; keep the runtime within 60 seconds.
Prohibited: changing or deleting existing test assertions, new dependencies, touching files outside "Zmieniaj". Names and signatures from earlier waves are given as planned. If the real code differs, use the real code, list each difference in the PR, and continue (do not stop, nobody will answer).
PR: what was done, decisions and why, how to check by hand.
