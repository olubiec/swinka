# PK-P45d1: Scene data: depth_scale, room size_from_layout, checker rules (wave P45b)
Zmieniaj: assets/data/place_scenes.json, tools/qa/place-scenes-check.js, tools/qa/ux-p45-scene-data.js, docs/opt/log/PK-P45d1.md
Wymagane: tools/qa/ux-p45-scene-data.js
Weryfikacja: node --check tools/qa/place-scenes-check.js && node --check tools/qa/ux-p45-scene-data.js && node tools/qa/ux-p45-scene-data.js && node tools/qa/place-scenes-check.js && node tools/qa/ux-p32-scenes-data.js
Pytania: nie zadawaj pytań i nie czekaj na odpowiedź. Jeśli czegoś brakuje lub coś jest niejasne, sam wybierz najrozsądniejsze rozwiązanie zgodne z AGENTS.md, zapisz decyzję w logu i dokończ do końca.
Limity (twarde): maks. 30 wywołań narzędzi. Linię Weryfikacja uruchom maks. 2 razy. Czytaj tylko pliki z Zmieniaj/Wymagane oraz zakresy linii znalezione przez grep. Nie diagnozuj niczego spoza Zmieniaj. Gdy test pada na czymś, czego Twoja zmiana nie dotyka: zapisz nazwę testu i 5 linii błędu w logu, status BLOCKED, zakończ. Po błędzie we własnym kodzie wolno jedna poprawka i jeden ponowny bieg, potem zakończ jako BLOCKED. Nie uruchamiaj web-smoke.js (robi to paczka q).
Nie ruszaj: AGENTS.md, docs/archive/, tasks/*, every file not listed in Zmieniaj
Goal: Put the measured perspective into the data: shallow `depth_scale` for every scene and the room entry that says its size comes from the layout. Walk bands stay as they are (PK-P45d2 tunes them).
Depends on: PK-P39q merged (data from P39a: it also edits `place_scenes.json` and `place-scenes-check.js`, so re-read both and keep its `blockers`/`behindLine`/B1-B6). Overlap: P43a (hotspots) edits the same JSON AFTER this wave; do not add hotspots. Until PK-P45e1/e2 land the room data (192x112) and the canvas room (240x130 constants) disagree; that is expected inside this wave sequence and is not fixed here.
Produces (names other packages rely on): `scenes.<id>.depth_scale = [0.9375, 1.0]` for room, garden, park, farm, market; `scenes.room.size_from_layout = true` with fallback `size [192,112]`, `walk [8,40,184,110]`; checker rules C8-C10 (the next free numbers after C1-C7; P39a added B1-B6; check the file).

## Kontekst perspektywy (fakty z pomiaru 8.11, nie szukaj ich drugi raz)
- Jedna kamera dla całej gry: **rzut ukośny z góry bez punktu zbiegu** (jak tła garden/farm/park). Skala rzeczy NIE zależy od głębi: grządka na y~80 ma ~32 px, ta sama na y~125 ma ~31 px. Świnka (sprite 64x64, ciało ok. 46x29, stopy w y=59, widok z boku) ma więc tylko lekką skalę głębi: `depthScale` = `[0.9375, 1.0]` (kroki 1/16, bo 64*k/16 to zawsze liczba całkowita).
- Pokój ma dziś dwa niezgodne układy: edytor i Core używają siatki `layout.cols x layout.rows` po 16 px (12x7 = 192x112, `wallRows` 2 = ściana 32 px), a płótno rysuje 240x130 ze ścianą 96 px (`drawHabitat`, `wallH=96`). `CuyScenes.placedThings` liczy y jako `y*16`. Zmieniamy płótno, NIE Core (`wallRows` jest stałą w C# i testach, nie ruszać).
- Okno Home pokazuje scenę przez `object-fit: cover` zakotwiczone do dołu; P39b przechodzi na całą scenę w całkowitej skali (`--scene-k`). Po P45 fala P47 zmienia okno na 640x400 i dopasowanie `contain` w `canvas-pig.js` (mapowanie wskaźnika `toScene`): tu go nie ruszaj i nie zakładaj szerokości okna 370 px.
- Kolejność: te pakiety biegną PO fali P39 (blockers, layout, grid, depth) i PRZED P40. Dane `blockers`, `behindLine`, `pigWidthFrac` pochodzą z P39; nie dubluj ich. Jeśli log P39 podaje inną nazwę, użyj prawdziwej i zapisz różnicę w logu.
- Plan całości i tabela fal: `docs/opt/PERSPECTIVE_PLAN.md` (nie czytaj, jeśli ten prompt wystarcza).

## Steps
1. Read `assets/data/place_scenes.json` and `tools/qa/place-scenes-check.js` fully. Today the data has `depth_scale` 0.88 (room), 0.82 (garden, farm), 0.78 (park), 0.92 (market) and room `size [240,130]`, `walk [10,96,230,126]`; the JSON key is snake_case `depth_scale` (`scenes.js` maps it to `depthScale`).
2. Set `depth_scale` = `[0.9375, 1.0]` for room, garden, park, farm and market (far < near so D1 of P39e still holds). Keep every other key (`blockers`, `behindLine`, `pigWidthFrac`, exits, `hotspots`).
3. Room: `"size_from_layout": true`, `size` `[192,112]`, `walk` `[8,40,184,110]` (these are the fallback when no layout is known).
4. Extend `place-scenes-check.js` (existing C6 only requires far <= near <= 1.0): C8 `depth_scale` far >= 0.9 and far < near <= 1.0 for every scene; C9 `walk` height >= 12 and bottom edge <= size height - 2; C10 a scene with `size_from_layout` has a fallback `size` and `walk`. Change an old check only if your data change makes it wrong and list it in the log.
5. Test `tools/qa/ux-p45-scene-data.js` (Node): SD1 the real data passes the checker (child process); SD2-SD4 three in-memory invalid fixtures are rejected (depth_scale `[0.6,1]`; walk bottom beyond the image; `size_from_layout` without `size`); SD5 every scene's `depth_scale` steps are multiples of 1/16 (`s*16` is an integer).
6. Run Weryfikacja; fix until green.

Prohibited: changing or deleting existing test assertions, new dependencies, touching files outside "Zmieniaj", extra refactors, running git.
Log: write `docs/opt/log/PK-P45d1.md` (max 10 lines: decisions, exact API/field names others will use, differences from the plan, BLOCKED reason if any). Do not run git.
