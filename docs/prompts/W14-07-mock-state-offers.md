# W14-07: Mock state with five pigs and offers; welcome toast
Zmieniaj: web/home/bridge.js, web/home/app.js
Wymagane: web/home/bridge.js
Weryfikacja: node --check web/home/bridge.js && node --check web/home/app.js && node tools/qa/web-smoke.js
Pytania: nie zadawaj pytań i nie czekaj na odpowiedź. Jeśli czegoś brakuje lub coś jest niejasne, sam wybierz najrozsądniejsze rozwiązanie zgodne z AGENTS.md, zapisz decyzję w opisie PR i dokończ zadanie do końca.
Nie ruszaj: src/*, AGENTS.md, docs/*, tasks/*, web/home/features/*
Goal: The browser mock shows the roster and offers so the screens can be tested without the desktop app.
Depends on: W13 merged.
Facts: `bridge.js` has a mock mode used by `tools/qa/web-smoke.js` (find how mock state and messages are produced). Add the same fields PigsFeature publishes (W13-05) to the mock: roster of Kuki (adult) and Ned (junior), offers for james (locked, 12 days left), glen (locked), racuch (locked) and the starter group already adopted; handle `adopt_named`, `adopt_group`, `set_memorial` in the mock by updating the mock state and posting a toast. `app.js` only needs to display the 'toast' message type the app already supports (check; add nothing if it exists). Test rules: use `RepoFile(...)` for repo files, inject tables and `Random`/clock instead of assigning statics (`Current`), keep tests deterministic.
Steps:
1. Extend the mock state and message handling as described; keep every existing mock key unchanged.
2. Make sure the mock returns plausible `ageYears`, `stage` and `modifiers` for each pig.
Prohibited: changing or deleting existing test assertions, new dependencies, touching files outside "Zmieniaj". Names and signatures from earlier waves are given as planned. If the real code differs, use the real code, list each difference in the PR, and continue (do not stop, nobody will answer).
PR: what was done, decisions and why, how to check by hand.
