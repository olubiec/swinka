# W27-08: Wire the plan, residents and home chips into the rooms page and the mock
Zmieniaj: web/home/features/rooms/feature.js, web/home/bridge.js
Wymagane: web/home/features/rooms/feature.js, web/home/bridge.js
Weryfikacja: node --check web/home/features/rooms/feature.js && node --check web/home/bridge.js && node tools/qa/web-smoke.js
Pytania: nie zadawaj pytań i nie czekaj na odpowiedź. Jeśli czegoś brakuje lub coś jest niejasne, sam wybierz najrozsądniejsze rozwiązanie zgodne z AGENTS.md, zapisz decyzję w opisie PR i dokończ zadanie do końca.
Nie ruszaj: src/*, AGENTS.md, docs/*, tasks/*, web/home/app.js, web/home/features/rooms/plan.js, web/home/features/rooms/residents.js
Goal: The rooms page shows the plan, the pigs inside the rooms and a home switch per pig.
Depends on: W27-06 and W27-07 merged in the same wave (load them only if present).
Facts: `feature.js`: a button 'House plan' opens `HousePlan.mount` in an overlay (Esc closes) and selecting a room switches the tab; when a room is shown call `RoomResidents.attach` for the pigs with `homes.pigs[i].room == roomId`; clicking a pig (event `room-pig`) opens a small card with its portrait, the activity text ('Napping', 'Snacking', ...) and a switch 'Roam the house / Stay in <room>' sending `pig_home`. `bridge.js`: add `homes` to the mock (deterministic slot-based locations like `PigWander`, simplified), the `pig_home` handler with validation, and keep every existing mock key and `?world=1`. Test rules: use `RepoFile(...)` for repo files, inject tables and `Random`/clock instead of assigning statics (`Current`), keep tests deterministic.
Steps:
1. Implement both files; keep the existing behaviour of the editor.
2. No console errors in the mock.
Prohibited: changing or deleting existing test assertions, new dependencies, touching files outside "Zmieniaj". Names and signatures from earlier waves are given as planned. If the real code differs, use the real code, list each difference in the PR, and continue (do not stop, nobody will answer).
PR: what was done, decisions and why, how to check by hand.
