# W20-04: Garden and park view with walks and the memory corner
Zmieniaj: web/home/features/garden/feature.js, web/home/features/garden/feature.css
Wymagane: web/home/features/garden/feature.js
Weryfikacja: node --check web/home/features/garden/feature.js && node tools/qa/web-smoke.js
Pytania: nie zadawaj pytań i nie czekaj na odpowiedź. Jeśli czegoś brakuje lub coś jest niejasne, sam wybierz najrozsądniejsze rozwiązanie zgodne z AGENTS.md, zapisz decyzję w opisie PR i dokończ zadanie do końca.
Nie ruszaj: src/*, AGENTS.md, docs/*, tasks/*, web/home/app.js, web/home/bridge.js
Goal: The player can decorate the garden and the park and send a pig for a walk.
Depends on: W19 merged; W20-02's editor API is not available in this wave: implement the view with its own minimal placement code reusing the same messages.
Facts: Same state and messages as the rooms (`rooms.layouts.garden` and `rooms.layouts.park`, `room_*` messages with `place`: garden or park), no wall rows. Top has a tab for Garden and Park (the other is locked and shows its price from `places`). A 'Go for a walk' button sends `walk { place }` (message added in this task's contract note: the feature `PlacesFeature` handles it in a later fix; until then the button toasts 'Soon' when the message is not acknowledged - check the contract and send it anyway). Background: sky gradient that depends on the local hour (morning, day, evening, night), grass base colour; items as rectangles with glyphs until art exists. The memory corner (id `memory_corner`) draws names of memorial pigs from `pigs.roster` as small text labels on a stone. Test rules: use `RepoFile(...)` for repo files, inject tables and `Random`/clock instead of assigning statics (`Current`), keep tests deterministic.
Steps:
1. Implement the view, tab switch, drawing, placement and the walk button; keyboard accessible.
Prohibited: changing or deleting existing test assertions, new dependencies, touching files outside "Zmieniaj". Names and signatures from earlier waves are given as planned. If the real code differs, use the real code, list each difference in the PR, and continue (do not stop, nobody will answer).
PR: what was done, decisions and why, how to check by hand.
