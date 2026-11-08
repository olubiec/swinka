# PK-P45e2: Room drawn from the grid with trim sprites (wave P45d)
Zmieniaj: web/home/canvas-pig.js, tools/qa/ux-p45-room-draw.js, docs/opt/log/PK-P45e2.md
Wymagane: tools/qa/ux-p45-room-draw.js
Weryfikacja: node --check web/home/canvas-pig.js && node --check tools/qa/ux-p45-room-draw.js && node tools/qa/ux-p45-room-draw.js && node tools/qa/ux-p33-scene-draw.js && node tools/qa/ux-p34-pig-walk.js
Pytania: nie zadawaj pytań i nie czekaj na odpowiedź. Jeśli czegoś brakuje lub coś jest niejasne, sam wybierz najrozsądniejsze rozwiązanie zgodne z AGENTS.md, zapisz decyzję w logu i dokończ do końca.
Limity (twarde): maks. 45 wywołań narzędzi. Linię Weryfikacja uruchom maks. 2 razy. Czytaj tylko pliki z Zmieniaj/Wymagane oraz zakresy linii znalezione przez grep. Nie diagnozuj niczego spoza Zmieniaj. Gdy test pada na czymś, czego Twoja zmiana nie dotyka: zapisz nazwę testu i 5 linii błędu w logu, status BLOCKED, zakończ. Po błędzie we własnym kodzie wolno jedna poprawka i jeden ponowny bieg, potem zakończ jako BLOCKED. Nie uruchamiaj web-smoke.js (robi to paczka q).
Nie ruszaj: AGENTS.md, docs/archive/, tasks/*, every file not listed in Zmieniaj
Goal: The canvas draws the room at the layout size with the layout wall height, the new baseboard and floor shadow sprites instead of hard-coded colours, and a single `floorLine()` instead of the magic `119`.
Depends on: PK-P45e1 (def with `wallH`) and PK-P45c3 (trim sprites registered) merged.
Produces (names other packages rely on): `CanvasPig.debug().wallH`, `CanvasPig.floorLine()` = bottom of the walk band; trim sprites loaded by `loadCachedImage`.

## Kontekst perspektywy (fakty z pomiaru 8.11, nie szukaj ich drugi raz)
- Jedna kamera dla całej gry: **rzut ukośny z góry bez punktu zbiegu** (jak tła garden/farm/park). Skala rzeczy NIE zależy od głębi: grządka na y~80 ma ~32 px, ta sama na y~125 ma ~31 px. Świnka (sprite 64x64, ciało ok. 46x29, stopy w y=59, widok z boku) ma więc tylko lekką skalę głębi: `depthScale` = `[0.9375, 1.0]` (kroki 1/16, bo 64*k/16 to zawsze liczba całkowita).
- Pokój ma dziś dwa niezgodne układy: edytor i Core używają siatki `layout.cols x layout.rows` po 16 px (12x7 = 192x112, `wallRows` 2 = ściana 32 px), a płótno rysuje 240x130 ze ścianą 96 px (`drawHabitat`, `wallH=96`). `CuyScenes.placedThings` liczy y jako `y*16`. Zmieniamy płótno, NIE Core (`wallRows` jest stałą w C# i testach, nie ruszać).
- Okno Home pokazuje scenę przez `object-fit: cover` zakotwiczone do dołu; P39b przechodzi na całą scenę w całkowitej skali (`--scene-k`).
- Kolejność: te pakiety biegną PO fali P39 (blockers, layout, grid, depth) i PRZED P40. Dane `blockers`, `behindLine`, `pigWidthFrac` pochodzą z P39; nie dubluj ich. Jeśli log P39 podaje inną nazwę, użyj prawdziwej i zapisz różnicę w logu.
- Plan całości i tabela fal: `docs/opt/PERSPECTIVE_PLAN.md` (nie czytaj, jeśli ten prompt wystarcza).

## Steps
1. grep `canvas-pig.js` for `drawHabitat`, `wallH`, `Horizontal wall trim`, `Shadow under wall trim`, `setScene`, `119`, `sceneWidth`, `loadCachedImage` and read only those ranges.
2. `setScene(def)` stores `def.wallH` (default 32 when absent for room scenes, unchanged for outdoor scenes that skip `drawHabitat`). `drawHabitat` uses `this.wallH`, `this.sceneWidth`, `this.sceneHeight` instead of 96/130/240; the wall and floor pattern code stays.
3. Replace the two trim blocks (`#c98d50`, `#6e4424`, `rgba(0,0,0,0.15)`) with `world/house/trim_baseboard.png` (repeat along x at y = wallH - 8) and `world/house/trim_floor_shadow.png` (repeat along x at y = wallH), both loaded with `loadCachedImage` using the `trim` keys from `world/tiles.json`. While an image is not loaded draw nothing (never the old colours). Whole pixels only.
4. Add `floorLine()` = bottom of the current walk band (`this.walk[3]`). Every hard-coded `119` that means "floor line" uses it (NOT the pig shadow `119 - pigY`: PK-P45f2 removes that code, leave it). Toys keep working.
5. Expose `wallH` in `debug()`.
6. Tests FIRST, `tools/qa/ux-p45-room-draw.js` (Playwright via `ux.js`, mock `seven`): RD1 salon `debug().wallH` = 32 and `sceneSize` = [192,112]; a 10x6 pig room gives wallH from its layout and [160,96]; RD2 the pig's feet stay inside `walk` for 10 s in a 12x7 and a 10x6 room; RD3 the canvas pixel at (4, wallH-4) is baseboard wood (one of the wood ramp colours), not `#c98d50`; RD4 no canvas pixel of a room equals `#6e4424` or `#c98d50`; RD5 outdoor scenes keep `sceneSize` from `place_scenes.json`; RD6 a placed floor item's feet are at `y >= wallH` in the debug things list.
7. Run Weryfikacja; the older P33/P34 tests must stay green without changing assertions.

Prohibited: changing or deleting existing test assertions, new dependencies, touching files outside "Zmieniaj", extra refactors, running git.
Log: write `docs/opt/log/PK-P45e2.md` (max 10 lines: decisions, exact API/field names others will use, differences from the plan, BLOCKED reason if any). Do not run git.
