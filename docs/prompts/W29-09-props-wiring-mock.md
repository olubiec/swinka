# W29-09: Wire the tray into the rooms page and the mock
Zmieniaj: web/home/features/rooms/feature.js, web/home/bridge.js
Wymagane: web/home/features/rooms/feature.js, web/home/bridge.js
Weryfikacja: node --check web/home/features/rooms/feature.js && node --check web/home/bridge.js && node tools/qa/web-smoke.js
Pytania: nie zadawaj pytań i nie czekaj na odpowiedź. Jeśli czegoś brakuje lub coś jest niejasne, sam wybierz najrozsądniejsze rozwiązanie zgodne z AGENTS.md, zapisz decyzję w opisie PR i dokończ zadanie do końca.
Nie ruszaj: src/*, AGENTS.md, docs/*, tasks/*, web/home/app.js, web/home/features/rooms/tray.js
Goal: The rooms page shows the tray and the mock supports props.
Depends on: W29-08 merged (same wave; load only if present). Sub-wave W29b: start only after W29-08 is merged (this task uses their code).
Facts: `feature.js`: mount `PropTray` under the tabs and call `acceptDrop` for the current canvas (use the same pointer-to-cell function as placement). `bridge.js`: add `props` to the mock (ball, tunnel on the desktop; hay_ball free), handlers for the four messages with the limit 6 and cell checks, and the `prop_*` items in the mock catalog; keep all existing keys. Test rules: use `RepoFile(...)` for repo files, inject tables and `Random`/clock instead of assigning statics (`Current`), keep tests deterministic.
Steps:
1. Implement both files.
Prohibited: changing or deleting existing test assertions, new dependencies, touching files outside "Zmieniaj". Names and signatures from earlier waves are given as planned. If the real code differs, use the real code, list each difference in the PR, and continue (do not stop, nobody will answer).
PR: what was done, decisions and why, how to check by hand.
