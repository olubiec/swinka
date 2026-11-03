# W20-04: Garden and park view with walks and the memory corner
Zmieniaj: web/home/features/garden/feature.js, web/home/features/garden/feature.css
Wymagane: web/home/features/garden/feature.js
Weryfikacja: node --check web/home/features/garden/feature.js && node tools/qa/web-smoke.js
Pytania: nie zadawaj pytań i nie czekaj na odpowiedź. Jeśli czegoś brakuje lub coś jest niejasne, sam wybierz najrozsądniejsze rozwiązanie zgodne z AGENTS.md, zapisz decyzję w opisie PR i dokończ zadanie do końca.
Nie ruszaj: src/*, AGENTS.md, docs/*, tasks/*, web/home/app.js, web/home/bridge.js
Goal: The player can decorate the garden and the park and send a pig for a walk.
Depends on: W19 merged; W20-02's editor API is not available in this wave: implement the view with its own minimal placement code reusing the same messages.
Facts: Same state and messages as the rooms (`rooms.layouts.garden` and `rooms.layouts.park`, `room_*` messages with `place`: garden or park), no wall rows. Top has a tab for Garden and Park (the other is locked and shows its price from `places`). A 'Go for a walk' button sends `walk { place }` and displays the walk scene banner/result illustration from `../../assets/world/walk_scenes.png` + `../../assets/world/walk_scenes.json` (128x48 frame for the chosen path, rendered with `image-rendering: pixelated` - G8 from docs/PLAN.md). Background: sky gradient that depends on the local hour (morning, day, evening, night), grass/soil/stone floor tiles from `../../assets/world/tiles.png` + `tiles.json` (G3), placed items drawn from `../../assets/world/atlas.png` + `atlas.json` with fallback to rectangles with glyphs if not loaded yet (G4), and pigs drawn with portraits/idle sprites (G5). The memory corner (id `memory_corner`) draws names of memorial pigs from `pigs.roster` as small text labels on a stone. Test rules: use `RepoFile(...)` for repo files, inject tables and `Random`/clock instead of assigning statics (`Current`), keep tests deterministic.
Steps:
1. Implement the view, tab switch, tile/atlas/walk-scene drawing (G3, G4, G5, G8), placement and the walk button; keyboard accessible.
Prohibited: changing or deleting existing test assertions, new dependencies, touching files outside "Zmieniaj". Names and signatures from earlier waves are given as planned. If the real code differs, use the real code, list each difference in the PR, and continue (do not stop, nobody will answer).
PR: what was done, decisions and why, how to check by hand.
