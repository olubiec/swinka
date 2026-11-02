# W20-02: Room editor: place, move, flip and remove items on the grid
Zmieniaj: web/home/features/rooms/feature.js, web/home/features/rooms/feature.css
Wymagane: web/home/features/rooms/feature.js
Weryfikacja: node --check web/home/features/rooms/feature.js && node tools/qa/web-smoke.js
Pytania: nie zadawaj pytań i nie czekaj na odpowiedź. Jeśli czegoś brakuje lub coś jest niejasne, sam wybierz najrozsądniejsze rozwiązanie zgodne z AGENTS.md, zapisz decyzję w opisie PR i dokończ zadanie do końca.
Nie ruszaj: src/*, AGENTS.md, docs/*, tasks/*, web/home/app.js, web/home/bridge.js
Goal: The player can arrange items in a room on a visible grid.
Depends on: W19 merged (state key `rooms`, messages `room_*`).
Facts: State: `rooms.layouts[place]` with `cols`, `rows`, `wallRows`, `wallpaper`, `floor`, `items[]`; `rooms.catalog[]` (items with `w`, `h`, `layer`, `owned`, `placed`, `price`, `icon`). Draw on a `<canvas>` at integer scale (nearest neighbour, 16 px cells), wallpaper/floor from the existing decor look data (`look` fields in `items_decor.json` via the existing drawing code of the `decor` feature - reuse, read `features/decor/feature.js`). Item sprites come later (S2-S4); until then draw each item as a coloured rectangle with its Twemoji/emoji glyph or name abbreviation. Interactions: click an owned item in the drawer, then click a cell to place (ghost preview green/red from a local copy of the collision rules, the server decides); drag to move; right click or `Delete` removes; `F` flips; messages `room_place`, `room_move`, `room_flip`, `room_remove`. Text English. Test rules: use `RepoFile(...)` for repo files, inject tables and `Random`/clock instead of assigning statics (`Current`), keep tests deterministic.
Steps:
1. Implement the canvas grid, drawer with owned items, ghost preview, drag-move and the four actions.
2. Layout must pass the smoke checks; no console errors in mock mode.
Prohibited: changing or deleting existing test assertions, new dependencies, touching files outside "Zmieniaj". Names and signatures from earlier waves are given as planned. If the real code differs, use the real code, list each difference in the PR, and continue (do not stop, nobody will answer).
PR: what was done, decisions and why, how to check by hand.
