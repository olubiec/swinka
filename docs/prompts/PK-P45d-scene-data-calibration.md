# PK-P45d: Calibrate walk bands and depth scale in the scene data (wave P45b)
Zmieniaj: assets/data/place_scenes.json, tools/qa/place-scenes-check.js, tools/qa/ux-p45-scene-data.js, docs/opt/log/PK-P45d.md
Wymagane: tools/qa/ux-p45-scene-data.js
Weryfikacja: node --check tools/qa/place-scenes-check.js && node --check tools/qa/ux-p45-scene-data.js && node tools/qa/ux-p45-scene-data.js && node tools/qa/place-scenes-check.js
Pytania: nie zadawaj pytań i nie czekaj na odpowiedź. Jeśli czegoś brakuje lub coś jest niejasne, sam wybierz najrozsądniejsze rozwiązanie zgodne z AGENTS.md, zapisz decyzję w logu i dokończ do końca.
Limity (twarde): maks. 45 wywołań narzędzi. Linię Weryfikacja uruchom maks. 2 razy. Czytaj tylko pliki z Zmieniaj/Wymagane oraz zakresy linii znalezione przez grep. Nie diagnozuj niczego spoza Zmieniaj. Gdy test pada na czymś, czego Twoja zmiana nie dotyka: zapisz nazwę testu i 5 linii błędu w logu, status BLOCKED, zakończ. Po błędzie we własnym kodzie wolno jedna poprawka i jeden ponowny bieg, potem zakończ jako BLOCKED. Nie uruchamiaj web-smoke.js (robi to paczka q).
Nie ruszaj: AGENTS.md, docs/archive/, tasks/*, every file not listed in Zmieniaj
Goal: Put the measured perspective into the data: shallow `depth_scale`, walk bands that match the real ground of each background, and the room entry that says its size comes from the layout.
Depends on: PK-P45a merged (overlay tool), PK-P39a merged (blockers).

## Kontekst perspektywy (fakty z pomiaru 8.11, nie szukaj ich drugi raz)
- Jedna kamera dla całej gry: **rzut ukośny z góry bez punktu zbiegu** (jak tła garden/farm/park). Skala rzeczy NIE zależy od głębi: grządka na y~80 ma ~32 px, ta sama na y~125 ma ~31 px. Świnka (sprite 64x64, ciało ok. 46x29, stopy w y=59, widok z boku) ma więc tylko lekką skalę głębi: `depthScale` = `[0.9375, 1.0]` (kroki 1/16, bo 64*k/16 to zawsze liczba całkowita).
- Pokój ma dziś dwa niezgodne układy: edytor i Core używają siatki `layout.cols x layout.rows` po 16 px (12x7 = 192x112, `wallRows` 2 = ściana 32 px), a płótno rysuje 240x130 ze ścianą 96 px (`drawHabitat`, `wallH=96`). `CuyScenes.placedThings` liczy y jako `y*16`. Zmieniamy płótno, NIE Core (`wallRows` jest stałą w C# i testach, nie ruszać).
- Okno Home pokazuje scenę przez `object-fit: cover` zakotwiczone do dołu; P39b przechodzi na całą scenę w całkowitej skali (`--scene-k`).
- Kolejność: te pakiety biegną PO fali P39 (blockers, layout, grid, depth) i PRZED P40. Dane `blockers`, `behindLine`, `pigWidthFrac` pochodzą z P39; nie dubluj ich.

## Steps
1. Run `node tools/qa/scene-overlay.js` and VIEW `docs/qa/calibration/{garden,park,farm,market}.png` (the "do not read assets binaries" rule is lifted for these images).
2. Measure, per outdoor scene, two objects of the same type at different depths (garden: the two flower beds; park: two benches or two trees; farm: fence posts; market: stall counters) and write the width ratio in the log. Expect ~1.0 (no foreshortening).
3. Edit `place_scenes.json`: `depth_scale` = `[0.9375, 1.0]` for room, garden, park, farm and market (1/16 steps; the pig keeps a hint of depth but never a different pixel grid; keep far < near so D1 of P39e still holds). Keep every other existing key (`blockers`, `behindLine`, `pigWidthFrac`, exits, `hotspots` if present).
4. Re-tune each `walk` band from the overlay: top edge at least 6 px below the ground line of the farthest standing object, bottom edge at least 4 px above the bottom of the image, and fully inside the lower ~90 px for 144-high scenes only if P39b shows a cropped window (with whole-scene fit P39b makes this moot: then ignore the crop and keep the band on real ground). Market: widen the band upward to the top of the cobble strip only if the overlay shows free floor in front of the stalls; never cross a stall base.
5. Room: change `scenes.room` to `"size_from_layout": true` (keep `size` as the 192x112 fallback and `walk` as the fallback band) and set `size` to `[192,112]`, `walk` to `[8,40,184,110]`.
6. Extend `place-scenes-check.js`: R1 `depth_scale` far >= 0.9 and <= near <= 1.0 for every scene; R2 `walk` height >= 12 and bottom edge <= size height - 2; R3 a scene with `size_from_layout` has a fallback `size` and `walk`. Update only checks that your change makes wrong and list them in the log.
7. `tools/qa/ux-p45-scene-data.js` (Node): the data passes the checker, and 3 in-memory invalid fixtures (depth_scale 0.6, walk bottom beyond the image, `size_from_layout` without `size`) are rejected.
8. Run Weryfikacja; fix until green. Log the measured ratios and the final `walk` per scene.

Prohibited: changing or deleting existing test assertions, new dependencies, touching files outside "Zmieniaj", extra refactors.
Log: write `docs/opt/log/PK-P45d.md` (max 10 lines: decisions, exact API/field names others will use, differences from the plan, BLOCKED reason if any). Do not run git.
