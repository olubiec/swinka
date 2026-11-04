# PK-27b: House plan and wiring of plan and home chips
Zmieniaj: web/home/features/rooms/plan.js, web/home/features/rooms/plan.css, web/home/features/rooms/feature.js, web/home/features/rooms/mock.js
Wymagane: web/home/features/rooms/plan.js, web/home/features/rooms/feature.js, web/home/features/rooms/mock.js
Weryfikacja: node --check web/home/features/rooms/plan.js && node --check web/home/features/rooms/feature.js && node --check web/home/features/rooms/mock.js && node tools/qa/web-smoke.js
Pytania: nie zadawaj pytań i nie czekaj na odpowiedź. Jeśli czegoś brakuje lub coś jest niejasne, sam wybierz najrozsądniejsze rozwiązanie zgodne z AGENTS.md, zapisz decyzję w opisie PR i dokończ do końca.
Nie ruszaj: AGENTS.md, docs/archive/, tasks/*, every file not listed in Zmieniaj
Items (in this order): W27-06, W27-08
Goal: House plan and wiring of plan and home chips.
Steps: work the items below in order; after each item run the quick check (the Weryfikacja line, or only the part that concerns the item), fix, then make one commit "[<item id>] <item title>". If time runs out, finish and commit the current item and list the unfinished items in the PR. Earlier stages are "merged" = present in the repo now. Where an item has a "Package override", it wins over any conflicting file or step in the item text; the `Zmieniaj` line of this package is authoritative.
Prohibited: changing or deleting existing test assertions, new dependencies, touching files outside "Zmieniaj". Names and signatures from earlier waves are given as planned. If the real code differs, use the real code, list each difference in the PR, and continue (do not stop, nobody will answer).
Test rules: use `RepoFile(...)` for repo files, inject tables and `Random`/clock instead of assigning statics (`Current`), keep tests deterministic.
PR: one pull request for the package; for each item what was done, decisions and why, how to check by hand; a screenshot for visual changes; anything left undone.

## Item W27-06: House plan: a flat cutaway to switch rooms
Files of this item: web/home/features/rooms/plan.js, web/home/features/rooms/plan.css
Goal: The rooms page can show a 2D plan of the house with a live miniature of every room and the pigs in them.
Depends on: W26 merged; wiring in W27-08 (same wave).
Facts: Export `window.HousePlan = { mount(container, ctx) }` with `ctx = { state, select(roomId), homes }` (`state` = the `rooms` object, `homes` = the `homes` object). Draw one canvas: a flat cutaway of the house (roof band and walls as simple shapes in the palette from `docs/STYL_SWIATA.md`/`assets/data/style_palette.json`, no new art needed; art may replace the frame later through `assets/world/house_frame.png` if it exists) with one window per room: shared rooms in the lower row, pig rooms in the upper row(s), the dorm as a wide window. Each window shows a miniature of the room (wallpaper and floor colours or tiles, items as small rectangles or atlas sprites drawn at half size with image smoothing off) and the portraits (16x16) of the pigs whose `location` is that room. Click or Enter selects the room (`select(roomId)`); hover shows the name and the comfort; locked rooms are dimmed with a padlock and price. Keyboard accessible; text English.
Steps:
1. Implement the plan, the miniatures and the pig dots; no messages are sent from here.

## Item W27-08: Wire the plan, residents and home chips into the rooms page and the mock
Files of this item: web/home/features/rooms/feature.js, web/home/features/rooms/mock.js
Goal: The rooms page shows the plan, the pigs inside the rooms and a home switch per pig.
Depends on: W27-06 and W27-07 merged in the same wave (load them only if present).
Facts: `feature.js`: a button 'House plan' opens `HousePlan.mount` in an overlay (Esc closes) and selecting a room switches the tab; when a room is shown call `RoomResidents.attach` for the pigs with `homes.pigs[i].room == roomId`; clicking a pig (event `room-pig`) opens a small card with its portrait, the activity text ('Napping', 'Snacking', ...) and a switch 'Roam the house / Stay in <room>' sending `pig_home`. `bridge.js`: add `homes` to the mock (deterministic slot-based locations like `PigWander`, simplified), the `pig_home` handler with validation, and keep every existing mock key and `?world=1`.
Steps:
1. Implement both files; keep the existing behaviour of the editor.
2. No console errors in the mock.
Package override (wins over anything above): Do not edit `bridge.js`: the homes mock goes into `features/rooms/mock.js`. The pigs-walking-in-the-editor item (W27-07, `residents.js`) is deferred: wire only the plan and the home chips and skip anything that needs `residents.js`.
