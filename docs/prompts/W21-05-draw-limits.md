# W21-05: Canvas limits: cap drawn items and animation work
Zmieniaj: web/home/canvas-pig.js
Wymagane: web/home/canvas-pig.js
Weryfikacja: node --check web/home/canvas-pig.js && node tools/qa/web-smoke.js
Pytania: nie zadawaj pytań i nie czekaj na odpowiedź. Jeśli czegoś brakuje lub coś jest niejasne, sam wybierz najrozsądniejsze rozwiązanie zgodne z AGENTS.md, zapisz decyzję w opisie PR i dokończ zadanie do końca.
Nie ruszaj: src/*, AGENTS.md, docs/*, tasks/*, web/home/app.js, web/home/bridge.js, web/home/features/*
Goal: Big gardens and parks stay smooth: the canvas draws only what is visible and caps animated items.
Depends on: W20 merged.
Facts: `canvas-pig.js` draws the pigs in the Home page. Add a small shared helper `drawBudget` used by editors to skip off-screen items and to limit simultaneously animated sprites to 24, plus `requestAnimationFrame` throttling to 30 fps when the window is hidden. Keep every existing export unchanged. Test rules: use `RepoFile(...)` for repo files, inject tables and `Random`/clock instead of assigning statics (`Current`), keep tests deterministic.
Steps:
1. Implement the helper and use it only inside this file's own drawing loop; document the API in a comment block for the editors.
Prohibited: changing or deleting existing test assertions, new dependencies, touching files outside "Zmieniaj". Names and signatures from earlier waves are given as planned. If the real code differs, use the real code, list each difference in the PR, and continue (do not stop, nobody will answer).
PR: what was done, decisions and why, how to check by hand.
