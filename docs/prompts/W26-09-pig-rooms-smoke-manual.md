# W26-09: Smoke test and manual steps for pig rooms and the shared bedroom
Zmieniaj: tools/qa/web-smoke.js, TESTY_RECZNE.md
Wymagane: tools/qa/web-smoke.js, TESTY_RECZNE.md
Weryfikacja: node tools/qa/web-smoke.js
Pytania: nie zadawaj pytań i nie czekaj na odpowiedź. Jeśli czegoś brakuje lub coś jest niejasne, sam wybierz najrozsądniejsze rozwiązanie zgodne z AGENTS.md, zapisz decyzję w opisie PR i dokończ zadanie do końca.
Nie ruszaj: src/*, web/*, AGENTS.md, docs/*, tasks/*
Goal: The smoke test covers the new screens and the human has a checklist.
Depends on: W26-07 merged earlier? No: same wave, so write the smoke against the mock described in W25-07 and W26-07. Sub-wave W26c: start only after W26-06, W26-07 are merged (this task uses their code).
Facts: Smoke scenarios (mock, `?world=1`): the rooms page shows a tab per named pig; switching tabs changes the canvas room name; the customize panel appears and a variant swatch click changes the item's variant in the mock state; renaming the room updates the header; the storage list is visible; the shared bedroom tab shows the locked card; with the mock state unlocked the residents can be toggled; no console errors; `layoutProblems` empty at all sizes. `TESTY_RECZNE.md` (Polish): section 'Pokoje świnek i wspólna sypialnia' with numbered steps: each pig has its own room with its theme; recolour a sofa; rename; move an item between rooms; the comfort bar differs per pig; unlock the shared bedroom (needs two pigs, 1500), move two pigs in and out and check nothing was lost; the memory room wording; restart and check persistence. Test rules: use `RepoFile(...)` for repo files, inject tables and `Random`/clock instead of assigning statics (`Current`), keep tests deterministic.
Steps:
1. Add the scenarios in a new function called from the runner; add the manual section; edit nothing else.
Prohibited: changing or deleting existing test assertions, new dependencies, touching files outside "Zmieniaj". Names and signatures from earlier waves are given as planned. If the real code differs, use the real code, list each difference in the PR, and continue (do not stop, nobody will answer).
PR: what was done, decisions and why, how to check by hand.
