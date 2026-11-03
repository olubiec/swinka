# W25-04: Rooms page: one tab per room with portraits and level-up
Zmieniaj: web/home/features/rooms/feature.js, web/home/features/rooms/feature.css
Wymagane: web/home/features/rooms/feature.js
Weryfikacja: node --check web/home/features/rooms/feature.js && node tools/qa/web-smoke.js
Pytania: nie zadawaj pytań i nie czekaj na odpowiedź. Jeśli czegoś brakuje lub coś jest niejasne, sam wybierz najrozsądniejsze rozwiązanie zgodne z AGENTS.md, zapisz decyzję w opisie PR i dokończ zadanie do końca.
Nie ruszaj: src/*, AGENTS.md, docs/*, tasks/*, web/home/app.js, web/home/bridge.js, web/home/features/rooms/customize.js
Goal: The rooms page shows tabs for the shared rooms and for every pig's room.
Depends on: W24 merged; state from W25-01 is planned (`rooms.pigRooms`).
Facts: The page `features/rooms/feature.js` (W20-02) draws one room at a time. Add a tab row above the canvas: shared rooms first (Living room, Bedroom, Playroom when unlocked), then one tab per entry of `rooms.pigRooms` (portrait 24x24 circle from `portrait`, name from `displayName`; memorial rooms get a small candle icon `.icon-candle`, quiet colours). Tab click switches the edited layout (`rooms.layouts[roomId]`). Above the canvas show the room name (click opens rename in `customize.js`) and a level button 'Bigger room - N clovers' that sends `place_upgrade { id: roomId }` (disabled with the missing amount). The customize panel is loaded from `customize.js` (W25-05, same wave): call `window.RoomCustomize && RoomCustomize.mount(container, ctx)` after each render, `ctx = { state, roomId, send }`; when it does not exist nothing breaks. Keyboard accessible (arrow keys between tabs, `role='tablist'`). Text English. Test rules: use `RepoFile(...)` for repo files, inject tables and `Random`/clock instead of assigning statics (`Current`), keep tests deterministic.
Steps:
1. Implement the tabs, name header and level button; keep all existing behaviour of the editor.
2. No layout problems at the smoke sizes.
Prohibited: changing or deleting existing test assertions, new dependencies, touching files outside "Zmieniaj". Names and signatures from earlier waves are given as planned. If the real code differs, use the real code, list each difference in the PR, and continue (do not stop, nobody will answer).
PR: what was done, decisions and why, how to check by hand.
