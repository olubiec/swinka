# PK-P45a: Scene calibration overlay tool (wave P45a)
Zmieniaj: tools/qa/scene-overlay.js, tools/qa/ux-p45-overlay.js, docs/qa/calibration/README.md, docs/opt/log/PK-P45a.md
Wymagane: tools/qa/ux-p45-overlay.js
Weryfikacja: node --check tools/qa/scene-overlay.js && node --check tools/qa/ux-p45-overlay.js && node tools/qa/ux-p45-overlay.js
Pytania: nie zadawaj pytań i nie czekaj na odpowiedź. Jeśli czegoś brakuje lub coś jest niejasne, sam wybierz najrozsądniejsze rozwiązanie zgodne z AGENTS.md, zapisz decyzję w logu i dokończ do końca.
Limity (twarde): maks. 45 wywołań narzędzi. Linię Weryfikacja uruchom maks. 2 razy. Czytaj tylko pliki z Zmieniaj/Wymagane oraz zakresy linii znalezione przez grep. Nie diagnozuj niczego spoza Zmieniaj. Gdy test pada na czymś, czego Twoja zmiana nie dotyka: zapisz nazwę testu i 5 linii błędu w logu, status BLOCKED, zakończ. Po błędzie we własnym kodzie wolno jedna poprawka i jeden ponowny bieg, potem zakończ jako BLOCKED. Nie uruchamiaj web-smoke.js (robi to paczka q).
Nie ruszaj: AGENTS.md, docs/archive/, tasks/*, every file not listed in Zmieniaj
Goal: Give every later package one picture to calibrate against: each scene background at 4x with the walk band, blockers, exits, the visible window crop and the pig drawn at the top and bottom of the band.
Depends on: PK-P39q merged (data from P39a, layout from P39b).

## Kontekst perspektywy (fakty z pomiaru 8.11, nie szukaj ich drugi raz)
- Jedna kamera dla całej gry: **rzut ukośny z góry bez punktu zbiegu** (jak tła garden/farm/park). Skala rzeczy NIE zależy od głębi: grządka na y~80 ma ~32 px, ta sama na y~125 ma ~31 px. Świnka (sprite 64x64, ciało ok. 46x29, stopy w y=59, widok z boku) ma więc tylko lekką skalę głębi: `depthScale` = `[0.9375, 1.0]` (kroki 1/16, bo 64*k/16 to zawsze liczba całkowita).
- Pokój ma dziś dwa niezgodne układy: edytor i Core używają siatki `layout.cols x layout.rows` po 16 px (12x7 = 192x112, `wallRows` 2 = ściana 32 px), a płótno rysuje 240x130 ze ścianą 96 px (`drawHabitat`, `wallH=96`). `CuyScenes.placedThings` liczy y jako `y*16`. Zmieniamy płótno, NIE Core (`wallRows` jest stałą w C# i testach, nie ruszać).
- Okno Home pokazuje scenę przez `object-fit: cover` zakotwiczone do dołu; P39b przechodzi na całą scenę w całkowitej skali (`--scene-k`).
- Kolejność: te pakiety biegną PO fali P39 (blockers, layout, grid, depth) i PRZED P40. Dane `blockers`, `behindLine`, `pigWidthFrac` pochodzą z P39; nie dubluj ich.

## Steps
1. Read `tools/qa/lib/ux.js` (`startServer`, `openHome`) and the `CuyScenes.def` shape in `web/home/features/places/scenes.js` (grep `function def`). Do not read canvas-pig.js.
2. `tools/qa/scene-overlay.js` (Node, Playwright, exports `renderOverlay(sceneId, outPath)` and has a CLI `node tools/qa/scene-overlay.js [sceneId...] [--out docs/qa/calibration]`): for garden, park, farm, market (time `day`) and one room (size from `CuyScenes.def('salon')`): draw the bg 4x (nearest neighbour) on an offscreen page canvas; overlay with 1-px (scaled) outlines: walk band, each `blockers[].rect`, `behindLine`, exits (small mark at `exits.*.x`), and the visible crop of the Home window (scene area shown at the P39b `--scene-k`, 370 px wide window; draw the region that falls outside as a dither of 2 palette colors). Draw the pig silhouette (rectangle 46x29 scaled by `depthScale` top and bottom, feet on the band edge, centre x) so the owner can judge proportion. Colors only from `assets/data/style_palette.json`. A `--grid` flag adds a 16 px grid.
3. Output PNGs to `docs/qa/calibration/<scene>.png`; write `docs/qa/calibration/README.md` (10 lines: how to run, what each colour means).
4. Test `tools/qa/ux-p45-overlay.js`: O1 every scene produces a PNG; O2 PNG size equals scene size x 4; O3 two runs give byte-identical files; O4 a scene without `blockers` still renders. Run the Weryfikacja line, fix until green.
5. Log the command line and output folder.

Prohibited: changing or deleting existing test assertions, new dependencies, touching files outside "Zmieniaj", extra refactors.
Log: write `docs/opt/log/PK-P45a.md` (max 10 lines: decisions, exact API/field names others will use, differences from the plan, BLOCKED reason if any). Do not run git.
