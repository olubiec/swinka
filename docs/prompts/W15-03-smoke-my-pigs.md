# W15-03: Web smoke: My Pigs with five pigs and offers
Zmieniaj: tools/qa/web-smoke.js
Wymagane: tools/qa/web-smoke.js
Weryfikacja: node tools/qa/web-smoke.js
Pytania: nie zadawaj pytań i nie czekaj na odpowiedź. Jeśli czegoś brakuje lub coś jest niejasne, sam wybierz najrozsądniejsze rozwiązanie zgodne z AGENTS.md, zapisz decyzję w opisie PR i dokończ zadanie do końca.
Nie ruszaj: src/*, web/*, AGENTS.md, docs/*, tasks/*
Goal: The smoke test opens My Pigs in the mock with the collection and checks it renders without layout problems or console errors.
Depends on: W14 merged.
Facts: `tools/qa/web-smoke.js` already opens each feature page in mock mode and checks errors, missing files and layout. Add a scenario: open the pigs feature, assert that the roster has Kuki and Ned, three offer cards (locked) are visible, the 'Adopt both' button is not shown (already adopted), the padlock appears on locked offers; click the memorial toggle on a pig and assert the confirmation appears; no console errors, `layoutProblems` empty at the sizes the file already tests. Test rules: use `RepoFile(...)` for repo files, inject tables and `Random`/clock instead of assigning statics (`Current`), keep tests deterministic.
Steps:
1. Add the scenario without changing any existing check; keep runtime under the file's current budget.
Prohibited: changing or deleting existing test assertions, new dependencies, touching files outside "Zmieniaj". Names and signatures from earlier waves are given as planned. If the real code differs, use the real code, list each difference in the PR, and continue (do not stop, nobody will answer).
PR: what was done, decisions and why, how to check by hand.
