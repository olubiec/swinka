# W26-07: Wire the shared bedroom into the rooms page and the mock
Zmieniaj: web/home/features/rooms/feature.js, web/home/bridge.js
Wymagane: web/home/features/rooms/feature.js, web/home/bridge.js
Weryfikacja: node --check web/home/features/rooms/feature.js && node --check web/home/bridge.js && node tools/qa/web-smoke.js
Pytania: nie zadawaj pytań i nie czekaj na odpowiedź. Jeśli czegoś brakuje lub coś jest niejasne, sam wybierz najrozsądniejsze rozwiązanie zgodne z AGENTS.md, zapisz decyzję w opisie PR i dokończ zadanie do końca.
Nie ruszaj: src/*, AGENTS.md, docs/*, tasks/*, web/home/app.js, web/home/features/rooms/dorm.js, web/home/features/rooms/customize.js
Goal: The rooms page has a 'Shared bedroom' tab and the mock supports it.
Depends on: W26-06 merged (same wave: load `dorm.js` only if present). Sub-wave W26b: start only after W26-06 is merged (this task uses their code).
Facts: `feature.js`: add a tab after the pig tabs: 'Shared bedroom' (locked tab shows the price). The tab shows `DormPanel.mount` above the canvas and, when unlocked and the pig has residents, the dorm layout (`layouts.dorm`, grid 16x8..) edited like any other room. Pig tabs of residents show a small 'moved in' badge and open the dorm. `bridge.js`: add the `dorm` state and handlers (unlock 1500 needs 2 pigs, upgrade 1100/1800, move in/out with simple merging: put all items of the residents into the dorm layout side by side, anything beyond 16x8 goes to `storage`). Test rules: use `RepoFile(...)` for repo files, inject tables and `Random`/clock instead of assigning statics (`Current`), keep tests deterministic.
Steps:
1. Implement both files; keep existing mock keys and `?world=1`.
Prohibited: changing or deleting existing test assertions, new dependencies, touching files outside "Zmieniaj". Names and signatures from earlier waves are given as planned. If the real code differs, use the real code, list each difference in the PR, and continue (do not stop, nobody will answer).
PR: what was done, decisions and why, how to check by hand.
