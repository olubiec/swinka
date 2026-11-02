# W20-03: Room editor extras: undo/redo, snapping, comfort meter, buy drawer
Zmieniaj: web/home/features/rooms/editor.js
Wymagane: web/home/features/rooms/editor.js
Weryfikacja: node --check web/home/features/rooms/editor.js && node tools/qa/web-smoke.js
Pytania: nie zadawaj pytań i nie czekaj na odpowiedź. Jeśli czegoś brakuje lub coś jest niejasne, sam wybierz najrozsądniejsze rozwiązanie zgodne z AGENTS.md, zapisz decyzję w opisie PR i dokończ zadanie do końca.
Nie ruszaj: src/*, AGENTS.md, docs/*, tasks/*, web/home/features/rooms/feature.js, web/home/features/rooms/feature.css, web/home/app.js, web/home/bridge.js
Goal: The editor gets undo/redo, a comfort meter, a shop drawer for buying items and filters.
Depends on: W20-02 is in the same wave: build on its planned exports (`window.RoomEditor` API: `onLayout(cb)`, `selected()`), or make the extras self-contained in `editor.js` that `feature.js` loads with a script tag; record how you integrated in the PR.
Facts: Undo/redo (30 steps) works by sending the inverse message (`room_remove` for a place, `room_move` back, ...); it only covers the current editor session. Comfort meter reads `rooms.comfort` (`score`, `cap`, `moodFactor`) and shows a bar with the text 'Comfort 42/100 - mood drops 6% slower'. Shop drawer: items with `owned == 0` and a price, filter by place and layer, 'Buy' sends `room_buy`; not-enough-clovers is a disabled button with the missing amount. Text English. Test rules: use `RepoFile(...)` for repo files, inject tables and `Random`/clock instead of assigning statics (`Current`), keep tests deterministic.
Steps:
1. Write `editor.js` exposing a small API on `window.RoomEditorExtras` (undo, redo, buy drawer, meter) used by `feature.js` (wiring happens in W20-02 through the script tag listed in `features/rooms/` only if it exists; otherwise leave a documented hook and list it in the PR).
Prohibited: changing or deleting existing test assertions, new dependencies, touching files outside "Zmieniaj". Names and signatures from earlier waves are given as planned. If the real code differs, use the real code, list each difference in the PR, and continue (do not stop, nobody will answer).
PR: what was done, decisions and why, how to check by hand.
