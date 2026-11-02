# W20-01: Places bar: navigation between house, garden, farm, park and market
Zmieniaj: web/home/app.js, web/home/style.css, web/home/features/index.json
Wymagane: web/home/app.js, web/home/features/index.json
Weryfikacja: node --check web/home/app.js && node tools/qa/web-smoke.js
Pytania: nie zadawaj pytań i nie czekaj na odpowiedź. Jeśli czegoś brakuje lub coś jest niejasne, sam wybierz najrozsądniejsze rozwiązanie zgodne z AGENTS.md, zapisz decyzję w opisie PR i dokończ zadanie do końca.
Nie ruszaj: src/*, AGENTS.md, docs/*, tasks/*, web/home/bridge.js, web/home/features/*
Goal: The Home page has a bar with the five places; locked ones show their price and unlock on click.
Depends on: W19 merged (state key `places`, messages `place_unlock`, `place_upgrade`).
Facts: Features are modules in `web/home/features/<id>/` registered in `features/index.json` (this task adds the four new ids `rooms`, `garden`, `farm`, `market` to that file; the feature folders are created by W20-02/04/05/06 in the same wave, so a missing folder must not break the page: the loader already skips unknown ids, check). Here: a bar element in the page chrome, built from state `places` (name, unlocked, level, unlockCost) and buttons that open the matching feature page: Home -> `rooms`, Garden/Park -> `garden` with a place argument, Farm -> `farm`, Market -> `market`. A locked place shows the padlock icon (existing `.icon-padlock`) and the price; clicking asks for confirmation then sends `place_unlock`. Text is English. Must pass `layoutProblems` at the smoke test sizes. Mock state comes in W20-08. Test rules: use `RepoFile(...)` for repo files, inject tables and `Random`/clock instead of assigning statics (`Current`), keep tests deterministic.
Steps:
1. Implement the bar and its styles (CSS variables only from the existing palette), keyboard accessible (arrow keys move between places, Enter opens), `aria-label` on every button.
2. Do not remove or rename any existing element or id used by other features or the smoke test.
Prohibited: changing or deleting existing test assertions, new dependencies, touching files outside "Zmieniaj". Names and signatures from earlier waves are given as planned. If the real code differs, use the real code, list each difference in the PR, and continue (do not stop, nobody will answer).
PR: what was done, decisions and why, how to check by hand.
