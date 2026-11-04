# W21-04: My Pigs: memory corner link and walk button
Zmieniaj: web/home/features/pigs/feature.js
Wymagane: web/home/features/pigs/feature.js
Weryfikacja: node --check web/home/features/pigs/feature.js && node tools/qa/web-smoke.js
Pytania: nie zadawaj pytań i nie czekaj na odpowiedź. Jeśli czegoś brakuje lub coś jest niejasne, sam wybierz najrozsądniejsze rozwiązanie zgodne z AGENTS.md, zapisz decyzję w opisie PR i dokończ zadanie do końca.
Nie ruszaj: src/*, AGENTS.md, docs/*, tasks/*, web/home/app.js, web/home/bridge.js, web/home/features/pigs/feature.css
Goal: My Pigs links to the garden's memory corner for pigs in memorial mode and offers a walk for the others.
Depends on: W20 merged.
Facts: For a pig with `memorial` true add a small link 'Visit the memory corner' that opens the garden feature (same navigation call the places bar uses, read `app.js`). For other pigs, when the garden is unlocked, a 'Go for a walk' button sending `walk { place: 'garden' }`. Text English, warm. Test rules: use `RepoFile(...)` for repo files, inject tables and `Random`/clock instead of assigning statics (`Current`), keep tests deterministic.
Steps:
1. Add both controls; hide them when the garden is locked.
Prohibited: changing or deleting existing test assertions, new dependencies, touching files outside "Zmieniaj". Names and signatures from earlier waves are given as planned. If the real code differs, use the real code, list each difference in the PR, and continue (do not stop, nobody will answer).
PR: what was done, decisions and why, how to check by hand.
