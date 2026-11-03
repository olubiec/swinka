# W28-08: Mock bridge: the garden run
Zmieniaj: web/home/bridge.js
Wymagane: web/home/bridge.js
Weryfikacja: node --check web/home/bridge.js && node tools/qa/web-smoke.js
Pytania: nie zadawaj pytań i nie czekaj na odpowiedź. Jeśli czegoś brakuje lub coś jest niejasne, sam wybierz najrozsądniejsze rozwiązanie zgodne z AGENTS.md, zapisz decyzję w opisie PR i dokończ zadanie do końca.
Nie ruszaj: src/*, AGENTS.md, docs/*, tasks/*, web/home/app.js, web/home/features/*
Goal: The browser mock supports the run.
Depends on: W27 merged. Sub-wave W28a: no dependency on other tasks of the wave.
Facts: Add `run` state to the mock: validity computed from the mock garden layout with a simplified flood fill (same rules as `RunCheck`), a capacity, `run_out`/`run_in` handlers, a weather switch `?weather=rain` that makes the verdict not ok, hours credited with `Date.now()`. Keep all existing keys and the other query switches. Test rules: use `RepoFile(...)` for repo files, inject tables and `Random`/clock instead of assigning statics (`Current`), keep tests deterministic.
Steps:
1. Implement without changing existing mock keys.
Prohibited: changing or deleting existing test assertions, new dependencies, touching files outside "Zmieniaj". Names and signatures from earlier waves are given as planned. If the real code differs, use the real code, list each difference in the PR, and continue (do not stop, nobody will answer).
PR: what was done, decisions and why, how to check by hand.
