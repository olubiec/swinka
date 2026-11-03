# W25-07: Mock bridge: pig rooms, variants, storage, transfer
Zmieniaj: web/home/bridge.js
Wymagane: web/home/bridge.js
Weryfikacja: node --check web/home/bridge.js && node tools/qa/web-smoke.js
Pytania: nie zadawaj pytań i nie czekaj na odpowiedź. Jeśli czegoś brakuje lub coś jest niejasne, sam wybierz najrozsądniejsze rozwiązanie zgodne z AGENTS.md, zapisz decyzję w opisie PR i dokończ zadanie do końca.
Nie ruszaj: src/*, AGENTS.md, docs/*, tasks/*, web/home/app.js, web/home/features/*
Goal: The browser mock reproduces the pig rooms.
Depends on: W24 merged.
Facts: Extend the mock of W20-08. Add `rooms.pigRooms` for the five named pigs (Kuki and Ned adopted, one memorial in a `?memorial=1` switch), their layouts (10x6, starter items and the signature item at fixed cells), `variantNames`, `storage` with 3 spare items, and handlers `room_variant`, `room_rename` (24 chars), `room_transfer`, `place_upgrade` for `pig:` ids (costs 400, 900). Keep `?world=1` working and add the same state to it. Test rules: use `RepoFile(...)` for repo files, inject tables and `Random`/clock instead of assigning statics (`Current`), keep tests deterministic.
Steps:
1. Implement without changing existing mock keys.
Prohibited: changing or deleting existing test assertions, new dependencies, touching files outside "Zmieniaj". Names and signatures from earlier waves are given as planned. If the real code differs, use the real code, list each difference in the PR, and continue (do not stop, nobody will answer).
PR: what was done, decisions and why, how to check by hand.
