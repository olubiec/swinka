# PK-P45e: The room scene is drawn from the layout grid (wave P45c)
Zmieniaj: web/home/canvas-pig.js, web/home/features/places/scenes.js, tools/qa/ux-p45-room-scene.js, docs/opt/log/PK-P45e.md
Wymagane: tools/qa/ux-p45-room-scene.js
Weryfikacja: node --check web/home/canvas-pig.js && node --check web/home/features/places/scenes.js && node --check tools/qa/ux-p45-room-scene.js && node tools/qa/ux-p45-room-scene.js && node tools/qa/ux-p33-scene-draw.js && node tools/qa/ux-p34-pig-walk.js
Pytania: nie zadawaj pytań i nie czekaj na odpowiedź. Jeśli czegoś brakuje lub coś jest niejasne, sam wybierz najrozsądniejsze rozwiązanie zgodne z AGENTS.md, zapisz decyzję w logu i dokończ do końca.
Limity (twarde): maks. 45 wywołań narzędzi. Linię Weryfikacja uruchom maks. 2 razy. Czytaj tylko pliki z Zmieniaj/Wymagane oraz zakresy linii znalezione przez grep. Nie diagnozuj niczego spoza Zmieniaj. Gdy test pada na czymś, czego Twoja zmiana nie dotyka: zapisz nazwę testu i 5 linii błędu w logu, status BLOCKED, zakończ. Po błędzie we własnym kodzie wolno jedna poprawka i jeden ponowny bieg, potem zakończ jako BLOCKED. Nie uruchamiaj web-smoke.js (robi to paczka q).
Nie ruszaj: AGENTS.md, docs/archive/, tasks/*, every file not listed in Zmieniaj
Goal: Main window room = the editor room: scene size, wall height, floor, walk band and placed furniture all come from the layout grid (16 px cells), with the new trim sprites instead of hard-coded colours.
Depends on: PK-P45b, PK-P45c, PK-P45d merged (and the whole P39 wave).

## Kontekst perspektywy (fakty z pomiaru 8.11, nie szukaj ich drugi raz)
- Jedna kamera dla całej gry: **rzut ukośny z góry bez punktu zbiegu** (jak tła garden/farm/park). Skala rzeczy NIE zależy od głębi: grządka na y~80 ma ~32 px, ta sama na y~125 ma ~31 px. Świnka (sprite 64x64, ciało ok. 46x29, stopy w y=59, widok z boku) ma więc tylko lekką skalę głębi: `depthScale` = `[0.9375, 1.0]` (kroki 1/16, bo 64*k/16 to zawsze liczba całkowita).
- Pokój ma dziś dwa niezgodne układy: edytor i Core używają siatki `layout.cols x layout.rows` po 16 px (12x7 = 192x112, `wallRows` 2 = ściana 32 px), a płótno rysuje 240x130 ze ścianą 96 px (`drawHabitat`, `wallH=96`). `CuyScenes.placedThings` liczy y jako `y*16`. Zmieniamy płótno, NIE Core (`wallRows` jest stałą w C# i testach, nie ruszać).
- Okno Home pokazuje scenę przez `object-fit: cover` zakotwiczone do dołu; P39b przechodzi na całą scenę w całkowitej skali (`--scene-k`).
- Kolejność: te pakiety biegną PO fali P39 (blockers, layout, grid, depth) i PRZED P40. Dane `blockers`, `behindLine`, `pigWidthFrac` pochodzą z P39; nie dubluj ich.

## Steps
1. grep `canvas-pig.js` for `drawHabitat`, `wallH`, `floorY`, `Horizontal wall trim`, `Shadow under wall trim`, `setScene`, `walk` and read only those ranges. grep `scenes.js` for `function def`, `placedThings`.
2. `scenes.js`: `def(sceneId, time, state)` for room scenes (salon, `pig:*`, dorm) now takes the layout from `state.rooms.layouts` (same lookup `placedThings` uses; extract that lookup into one local function and call it from both) and returns `size`, `wallH`, `walk` from `CuyRoomGeometry.geometry(layout)` when the scene has `size_from_layout`. `placedThings` uses `CuyRoomGeometry.cellToPx` (identical numbers to before: keep the old results for the same layouts).
3. `canvas-pig.js`: `setScene(def)` accepts `def.wallH`; `drawHabitat` uses `this.wallH` instead of 96 and `this.sceneWidth/Height`; the wall/floor pattern code stays. Replace the two trim blocks with `world/house/trim_baseboard.png` (repeat along x at y = wallH - 8) and `world/house/trim_floor_shadow.png` (repeat at y = wallH), loaded with `loadCachedImage`; if an image is not loaded yet draw nothing (never the old colours). Hard-coded `119` floor lines (grep `119`) use `this.floorLine()` = bottom of the walk band; toy code keeps working.
4. Keep every non-room scene byte-for-byte as before. Old saves: layouts already carry cols/rows/wallRows, so nothing to migrate.
5. Tests FIRST, `tools/qa/ux-p45-room-scene.js` (Playwright via `ux.js`, mock `seven`): RS1 salon debug `sceneSize` equals `[cols*16, rows*16]` of its layout and a 10x6 pig room gives `[160,96]`; RS2 `debug().wallH` equals `wallRows*16`; RS3 a placed floor item at cell (2,3) has its bottom on the floor (debug `things[].y >= wallH`) and the same y the editor formula gives; RS4 the pig's feet stay inside `walk` for 10 s in a 12x7 and a 10x6 room; RS5 the pixel at (4, wallH-4) is baseboard wood, not the old `#c98d50`, and no canvas pixel has the old trim colours; RS6 outdoor scenes unchanged (`sceneSize` per `place_scenes.json`).
6. Run Weryfikacja (includes the older P33/P34 tests: they must stay green without changing their assertions; if one hard-codes 240x130 for the room, record it in the log and keep the assertion: make the code satisfy it through the `size` fallback only when no layout exists).

Prohibited: changing or deleting existing test assertions, new dependencies, touching files outside "Zmieniaj", extra refactors.
Log: write `docs/opt/log/PK-P45e.md` (max 10 lines: decisions, exact API/field names others will use, differences from the plan, BLOCKED reason if any). Do not run git.
