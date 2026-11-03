# W25-06: My Pigs: 'Visit room' link
Zmieniaj: web/home/features/pigs/feature.js
Wymagane: web/home/features/pigs/feature.js
Weryfikacja: node --check web/home/features/pigs/feature.js && node tools/qa/web-smoke.js
Pytania: nie zadawaj pytań i nie czekaj na odpowiedź. Jeśli czegoś brakuje lub coś jest niejasne, sam wybierz najrozsądniejsze rozwiązanie zgodne z AGENTS.md, zapisz decyzję w opisie PR i dokończ zadanie do końca.
Nie ruszaj: src/*, AGENTS.md, docs/*, tasks/*, web/home/app.js, web/home/bridge.js, web/home/features/pigs/feature.css
Goal: Every pig card links to its own room (or memory room).
Depends on: W24 merged.
Facts: State `pigs.roster[]` gets `roomId` from `rooms.pigRooms` (join by pigId in JS). Add a small link 'Visit my room' (for memorial pigs 'Visit the memory room') that opens the rooms feature on that tab (use the navigation call used by the places bar in `app.js`, W20-01, with `{ feature: 'rooms', room: roomId }`; read `app.js` for the real call). Hide the link when `rooms.pigRooms` is missing. Test rules: use `RepoFile(...)` for repo files, inject tables and `Random`/clock instead of assigning statics (`Current`), keep tests deterministic.
Steps:
1. Add the link; text English, warm.
Prohibited: changing or deleting existing test assertions, new dependencies, touching files outside "Zmieniaj". Names and signatures from earlier waves are given as planned. If the real code differs, use the real code, list each difference in the PR, and continue (do not stop, nobody will answer).
PR: what was done, decisions and why, how to check by hand.
