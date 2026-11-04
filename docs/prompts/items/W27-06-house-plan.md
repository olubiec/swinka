# W27-06: House plan: a flat cutaway to switch rooms
Zmieniaj: web/home/features/rooms/plan.js, web/home/features/rooms/plan.css
Wymagane: web/home/features/rooms/plan.js
Weryfikacja: node --check web/home/features/rooms/plan.js && node tools/qa/web-smoke.js
Pytania: nie zadawaj pytań i nie czekaj na odpowiedź. Jeśli czegoś brakuje lub coś jest niejasne, sam wybierz najrozsądniejsze rozwiązanie zgodne z AGENTS.md, zapisz decyzję w opisie PR i dokończ zadanie do końca.
Nie ruszaj: src/*, AGENTS.md, docs/*, tasks/*, web/home/app.js
Goal: The rooms page can show a 2D plan of the house with a live miniature of every room and the pigs in them.
Depends on: W26 merged; wiring in W27-08 (same wave). Sub-wave W27a: no dependency on other tasks of the wave.
Facts: Export `window.HousePlan = { mount(container, ctx) }` with `ctx = { state, select(roomId), homes }` (`state` = the `rooms` object, `homes` = the `homes` object). Draw one canvas: a flat cutaway of the house (roof band and walls as simple shapes in the palette from `docs/STYL_SWIATA.md`/`assets/data/style_palette.json`, no new art needed; art may replace the frame later through `assets/world/house_frame.png` if it exists) with one window per room: shared rooms in the lower row, pig rooms in the upper row(s), the dorm as a wide window. Each window shows a miniature of the room (wallpaper and floor colours or tiles, items as small rectangles or atlas sprites drawn at half size with image smoothing off) and the portraits (16x16) of the pigs whose `location` is that room. Click or Enter selects the room (`select(roomId)`); hover shows the name and the comfort; locked rooms are dimmed with a padlock and price. Keyboard accessible; text English. Test rules: use `RepoFile(...)` for repo files, inject tables and `Random`/clock instead of assigning statics (`Current`), keep tests deterministic.
Steps:
1. Implement the plan, the miniatures and the pig dots; no messages are sent from here.
Prohibited: changing or deleting existing test assertions, new dependencies, touching files outside "Zmieniaj". Names and signatures from earlier waves are given as planned. If the real code differs, use the real code, list each difference in the PR, and continue (do not stop, nobody will answer).
PR: what was done, decisions and why, how to check by hand.
