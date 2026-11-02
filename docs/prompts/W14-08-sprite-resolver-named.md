# W14-08: Home sprite resolver: baked sheets for named pigs
Zmieniaj: web/home/lib/sprites.js
Wymagane: web/home/lib/sprites.js
Weryfikacja: node --check web/home/lib/sprites.js && node tools/qa/web-smoke.js
Pytania: nie zadawaj pytań i nie czekaj na odpowiedź. Jeśli czegoś brakuje lub coś jest niejasne, sam wybierz najrozsądniejsze rozwiązanie zgodne z AGENTS.md, zapisz decyzję w opisie PR i dokończ zadanie do końca.
Nie ruszaj: src/*, AGENTS.md, docs/*, tasks/*, web/home/app.js, web/home/canvas-pig.js, assets/*
Goal: The Home page draws named pigs from their baked sheets and everyone else from shape + palette as before.
Depends on: W13 merged. Art exists: assets/sprites/pigs/pigs.json and sheets.
Facts: `sheet(breed, stage, paletteId)` (~line 40) builds the sprite sheet URL/image for a pig. Add an optional fourth argument or a new `namedSheet(pigId, stage)`; the caller keys are `namedId` and `stage` from the state. `assets/sprites/pigs/pigs.json` lists which ids have baked sheets and where; read it once and cache. A missing file or id falls back to the existing path. Do not change the existing call signature's behaviour for callers that pass three arguments. Test rules: use `RepoFile(...)` for repo files, inject tables and `Random`/clock instead of assigning statics (`Current`), keep tests deterministic.
Steps:
1. Implement the resolver and export it next to `sheet`; add a tiny self-check at the bottom guarded like the file's existing patterns, or none if the file has none.
2. Callers (outside this task's files) will use it later; keep it backwards compatible.
Prohibited: changing or deleting existing test assertions, new dependencies, touching files outside "Zmieniaj". Names and signatures from earlier waves are given as planned. If the real code differs, use the real code, list each difference in the PR, and continue (do not stop, nobody will answer).
PR: what was done, decisions and why, how to check by hand.
