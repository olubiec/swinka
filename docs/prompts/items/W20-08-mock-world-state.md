# W20-08: Mock bridge: state and messages for places, rooms, farm, market
Zmieniaj: web/home/bridge.js
Wymagane: web/home/bridge.js
Weryfikacja: node --check web/home/bridge.js && node tools/qa/web-smoke.js
Pytania: nie zadawaj pytań i nie czekaj na odpowiedź. Jeśli czegoś brakuje lub coś jest niejasne, sam wybierz najrozsądniejsze rozwiązanie zgodne z AGENTS.md, zapisz decyzję w opisie PR i dokończ zadanie do końca.
Nie ruszaj: src/*, AGENTS.md, docs/*, tasks/*, web/home/app.js, web/home/features/*
Goal: The browser mock reproduces the four new features so they can be tested without the desktop app.
Depends on: W19 merged.
Facts: Follow how `bridge.js` mocks the existing features (state object plus message handlers that mutate it and re-post state). Implement simplified but faithful logic for: places (garden locked 400, farm 600, park 1200), rooms (a 12x7 salon with two items, ownership, collision refusal with the toast text), farm (4 plots, crops with `secondsLeft` that elapse using `Date.now()`, watering, harvest into a mock inventory, upgrades), market (`capLeft` 30 with the demand drop 0.1 per unit and recover on reload, two orders, three specials, quote answers). Numbers can be hard-coded in the mock; the real ones come from Core. Test rules: use `RepoFile(...)` for repo files, inject tables and `Random`/clock instead of assigning statics (`Current`), keep tests deterministic.
Steps:
1. Extend the mock without changing existing mock keys; add `market_quote_result` handling.
2. Provide a `?world=1` query switch that starts the mock with everything unlocked for screenshots.
Prohibited: changing or deleting existing test assertions, new dependencies, touching files outside "Zmieniaj". Names and signatures from earlier waves are given as planned. If the real code differs, use the real code, list each difference in the PR, and continue (do not stop, nobody will answer).
PR: what was done, decisions and why, how to check by hand.
