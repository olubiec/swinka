# W27-07: Pigs walking inside the room editor
Zmieniaj: web/home/features/rooms/residents.js
Wymagane: web/home/features/rooms/residents.js
Weryfikacja: node --check web/home/features/rooms/residents.js && node tools/qa/web-smoke.js
Pytania: nie zadawaj pytań i nie czekaj na odpowiedź. Jeśli czegoś brakuje lub coś jest niejasne, sam wybierz najrozsądniejsze rozwiązanie zgodne z AGENTS.md, zapisz decyzję w opisie PR i dokończ zadanie do końca.
Nie ruszaj: src/*, AGENTS.md, docs/*, tasks/*, web/home/app.js
Goal: The pigs that are in the viewed room walk and rest on its floor, avoiding furniture.
Depends on: W26 merged; wiring in W27-08 (same wave).
Facts: Export `window.RoomResidents = { attach(canvasCtx, ctx) , update(dt), draw() , detach() }` with `ctx = { layout (cols, rows, wallRows, items), cell (px), pigs: [ { pigId, activity, stage, breed, palette } ], blockedCells(layout) }`. Pigs are drawn with the existing sheet resolver `lib/sprites.js` (`Sprites` API: read the file) using the `walk`/`idle`/`sleep`/`eat` animations by `activity` (use animation ids from `assets/sprites/<stage>/animations.json`; unknown ones fall back to `idle`). Movement: a pig picks a random free floor cell (not under a floor item, not on the wall rows), walks there at about 1 cell per second, pauses 2-6 seconds, repeats; a sleeping pig lies next to a bed or cushion item if one exists (items with ids `cushion_big`, `cosy_nook`, `sig_*`), otherwise in the nearest free corner. Respect `prefers-reduced-motion` (pigs stand still). Cap at 6 pigs per room. Clicking a pig dispatches `CustomEvent('room-pig', { detail: { pigId } })` on `document`. Test rules: use `RepoFile(...)` for repo files, inject tables and `Random`/clock instead of assigning statics (`Current`), keep tests deterministic.
Steps:
1. Implement the module; it must not send messages and must not throw when a sheet is missing.
Prohibited: changing or deleting existing test assertions, new dependencies, touching files outside "Zmieniaj". Names and signatures from earlier waves are given as planned. If the real code differs, use the real code, list each difference in the PR, and continue (do not stop, nobody will answer).
PR: what was done, decisions and why, how to check by hand.
