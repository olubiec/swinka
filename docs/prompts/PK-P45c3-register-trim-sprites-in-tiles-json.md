# PK-P45c3: Register trim sprites in tiles.json (wave P45b)
Zmieniaj: assets/world/tiles.json, tools/qa/ux-p45-trim-art.js, docs/opt/log/PK-P45c3.md
Wymagane: tools/qa/ux-p45-trim-art.js
Weryfikacja: node --check tools/qa/ux-p45-trim-art.js && node tools/qa/ux-p45-trim-art.js && node tools/qa/check-assets.js
Pytania: nie zadawaj pytań i nie czekaj na odpowiedź. Jeśli czegoś brakuje lub coś jest niejasne, sam wybierz najrozsądniejsze rozwiązanie zgodne z AGENTS.md, zapisz decyzję w logu i dokończ do końca.
Limity (twarde): maks. 30 wywołań narzędzi. Linię Weryfikacja uruchom maks. 2 razy. Czytaj tylko pliki z Zmieniaj/Wymagane oraz zakresy linii znalezione przez grep. Nie diagnozuj niczego spoza Zmieniaj. Gdy test pada na czymś, czego Twoja zmiana nie dotyka: zapisz nazwę testu i 5 linii błędu w logu, status BLOCKED, zakończ. Po błędzie we własnym kodzie wolno jedna poprawka i jeden ponowny bieg, potem zakończ jako BLOCKED. Nie uruchamiaj web-smoke.js (robi to paczka q).
Nie ruszaj: AGENTS.md, docs/archive/, tasks/*, every file not listed in Zmieniaj
Goal: Make the two trim sprites discoverable by tile id so the engine loads them with `CuyScenes.getTileUrl(id)` like every other room tile, and so `check-assets.js` and `style_check.py` validate them.
Depends on: PK-P45c1 and PK-P45c2 merged (both PNGs exist).
Produces (names other packages rely on): group `tiles` of `assets/world/tiles.json` gets `trim_baseboard` = `{"file":"house/trim_baseboard.png","size":[16,8]}` and `trim_floor_shadow` = `{"file":"house/trim_floor_shadow.png","size":[16,4]}`. PK-P45e2 reads them with `CuyScenes.getTileUrl('trim_baseboard')` / `getTileUrl('trim_floor_shadow')`. (A new top-level group would NOT be checked: `check-assets.js` only walks `bg`, `tiles`, `market`.)

## Kontekst perspektywy (fakty z pomiaru 8.11, nie szukaj ich drugi raz)
- Jedna kamera dla całej gry: **rzut ukośny z góry bez punktu zbiegu** (jak tła garden/farm/park). Skala rzeczy NIE zależy od głębi: grządka na y~80 ma ~32 px, ta sama na y~125 ma ~31 px. Świnka (sprite 64x64, ciało ok. 46x29, stopy w y=59, widok z boku) ma więc tylko lekką skalę głębi: `depthScale` = `[0.9375, 1.0]` (kroki 1/16, bo 64*k/16 to zawsze liczba całkowita).
- Pokój ma dziś dwa niezgodne układy: edytor i Core używają siatki `layout.cols x layout.rows` po 16 px (12x7 = 192x112, `wallRows` 2 = ściana 32 px), a płótno rysuje 240x130 ze ścianą 96 px (`drawHabitat`, `wallH=96`). `CuyScenes.placedThings` liczy y jako `y*16`. Zmieniamy płótno, NIE Core (`wallRows` jest stałą w C# i testach, nie ruszać).
- Okno Home pokazuje scenę przez `object-fit: cover` zakotwiczone do dołu; P39b przechodzi na całą scenę w całkowitej skali (`--scene-k`). Po P45 fala P47 zmienia okno na 640x400 i dopasowanie `contain` w `canvas-pig.js` (mapowanie wskaźnika `toScene`): tu go nie ruszaj i nie zakładaj szerokości okna 370 px.
- Kolejność: te pakiety biegną PO fali P39 (blockers, layout, grid, depth) i PRZED P40. Dane `blockers`, `behindLine`, `pigWidthFrac` pochodzą z P39; nie dubluj ich. Jeśli log P39 podaje inną nazwę, użyj prawdziwej i zapisz różnicę w logu.
- Plan całości i tabela fal: `docs/opt/PERSPECTIVE_PLAN.md` (nie czytaj, jeśli ten prompt wystarcza).

## Steps
1. Read `assets/world/tiles.json` (about 100 entries, indent 1, `size` arrays expanded over lines) and `checkTiles()` in `tools/qa/check-assets.js` (it validates the `file` of every entry of the groups `bg`, `tiles`, `market`).
2. Add the two entries to the `tiles` group exactly as above, appended after the last existing tile. Do it with a 5-line Node or Python script (`json` load, add, dump with indent 1, same trailing-newline state as now), then check that the diff only adds those lines. Do not edit `tools/art/tiles_art.py`; note in the log that re-running it would regenerate `tiles.json` without these entries (same as for the hand-drawn tiles).
3. Test `tools/qa/ux-p45-trim-art.js` (Node): TA1 `tiles.json` parses and still contains every key of every group it had before (keep the list of old keys inside the test, taken from the file now before you edit); TA2 both files exist and their IHDR size (bytes 16-24) equals the declared `size`; TA3 `check-assets.js` exits 0 (child process), and a fixture copy of the JSON with `house/missing.png` under `tiles.trim_baseboard` is reported by the same validation (proves the entry is really checked); TA4 `CuyScenes.getTileUrl('trim_baseboard')` is non-null after `await CuyScenes.load()` in Node (grep how `ux-p32-scenes-data.js` loads it).
4. Run Weryfikacja; fix until green.

Prohibited: changing or deleting existing test assertions, new dependencies, touching files outside "Zmieniaj", extra refactors, running git.
Log: write `docs/opt/log/PK-P45c3.md` (max 10 lines: decisions, exact API/field names others will use, differences from the plan, BLOCKED reason if any). Do not run git.
