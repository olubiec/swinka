# PK-P45d3: Calibration overlay PNGs (wave P45d)
Zmieniaj: docs/qa/calibration/garden.png, docs/qa/calibration/park.png, docs/qa/calibration/farm.png, docs/qa/calibration/market.png, docs/qa/calibration/room.png, tools/qa/ux-p45-calibration.js, docs/opt/log/PK-P45d3.md
Wymagane: tools/qa/ux-p45-calibration.js
Weryfikacja: node --check tools/qa/ux-p45-calibration.js && node tools/qa/scene-overlay.js && node tools/qa/ux-p45-calibration.js
Pytania: nie zadawaj pytań i nie czekaj na odpowiedź. Jeśli czegoś brakuje lub coś jest niejasne, sam wybierz najrozsądniejsze rozwiązanie zgodne z AGENTS.md, zapisz decyzję w logu i dokończ do końca.
Limity (twarde): maks. 20 wywołań narzędzi. Linię Weryfikacja uruchom maks. 2 razy. Czytaj tylko pliki z Zmieniaj/Wymagane oraz zakresy linii znalezione przez grep. Nie diagnozuj niczego spoza Zmieniaj. Gdy test pada na czymś, czego Twoja zmiana nie dotyka: zapisz nazwę testu i 5 linii błędu w logu, status BLOCKED, zakończ. Po błędzie we własnym kodzie wolno jedna poprawka i jeden ponowny bieg, potem zakończ jako BLOCKED. Nie uruchamiaj web-smoke.js (robi to paczka q).
Nie ruszaj: AGENTS.md, docs/archive/, tasks/*, every file not listed in Zmieniaj
Goal: Commit the five final calibration pictures (bg 4x with walk band, blockers, exits, crop and pig) as the QA record of wave P45. QA only, never shipped in `assets/`.
Depends on: PK-P45d2 merged (final `walk` bands) and PK-P45a2 merged (all layers). Room geometry packages (P45e1/e2) run in parallel and are not needed: the room picture uses the JSON fallback size 192x112.
Produces (names other packages rely on): `docs/qa/calibration/{garden,park,farm,market,room}.png`.

## Kontekst perspektywy (fakty z pomiaru 8.11, nie szukaj ich drugi raz)
- Jedna kamera dla całej gry: **rzut ukośny z góry bez punktu zbiegu** (jak tła garden/farm/park). Skala rzeczy NIE zależy od głębi: grządka na y~80 ma ~32 px, ta sama na y~125 ma ~31 px. Świnka (sprite 64x64, ciało ok. 46x29, stopy w y=59, widok z boku) ma więc tylko lekką skalę głębi: `depthScale` = `[0.9375, 1.0]` (kroki 1/16, bo 64*k/16 to zawsze liczba całkowita).
- Pokój ma dziś dwa niezgodne układy: edytor i Core używają siatki `layout.cols x layout.rows` po 16 px (12x7 = 192x112, `wallRows` 2 = ściana 32 px), a płótno rysuje 240x130 ze ścianą 96 px (`drawHabitat`, `wallH=96`). `CuyScenes.placedThings` liczy y jako `y*16`. Zmieniamy płótno, NIE Core (`wallRows` jest stałą w C# i testach, nie ruszać).
- Okno Home pokazuje scenę przez `object-fit: cover` zakotwiczone do dołu; P39b przechodzi na całą scenę w całkowitej skali (`--scene-k`). Po P45 fala P47 zmienia okno na 640x400 i dopasowanie `contain` w `canvas-pig.js` (mapowanie wskaźnika `toScene`): tu go nie ruszaj i nie zakładaj szerokości okna 370 px.
- Kolejność: te pakiety biegną PO fali P39 (blockers, layout, grid, depth) i PRZED P40. Dane `blockers`, `behindLine`, `pigWidthFrac` pochodzą z P39; nie dubluj ich. Jeśli log P39 podaje inną nazwę, użyj prawdziwej i zapisz różnicę w logu.
- Plan całości i tabela fal: `docs/opt/PERSPECTIVE_PLAN.md` (nie czytaj, jeśli ten prompt wystarcza).


## Steps
1. Run `node tools/qa/scene-overlay.js` (default scenes, default layers, default output `docs/qa/calibration`) once. VIEW the five PNGs (the "do not read assets binaries" rule is lifted for them).
2. Check by eye that: the walk outline lies on visible ground, the pig silhouettes at band top and bottom sit inside the band and are not an ant or a giant next to the nearest bench/stall, the blockers do not cut the band in two. If one picture is clearly wrong, write the scene and the reason in the log (status NEEDS_REVIEW); do NOT edit `place_scenes.json` (PK-P45d2 owns it).
3. Test `tools/qa/ux-p45-calibration.js` (Node, read-only): CP1 the five files exist; CP2 each IHDR width/height = scene size x 4 (sizes from `place_scenes.json`); CP3 running the overlay into `os.tmpdir()` gives byte-identical files to the committed ones.
4. Run Weryfikacja; fix until green.

Prohibited: changing or deleting existing test assertions, new dependencies, touching files outside "Zmieniaj", extra refactors, running git.
Log: write `docs/opt/log/PK-P45d3.md` (max 10 lines: decisions, one sentence per scene on how the picture looks, BLOCKED reason if any). Do not run git.
