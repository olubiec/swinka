# PK-P45d2: Scene data: calibrate walk bands from the overlay (wave P45c)
Zmieniaj: assets/data/place_scenes.json, tools/qa/ux-p45-walk-bands.js, docs/qa/calibration/MEASURED.md, docs/qa/calibration/garden.png, docs/qa/calibration/park.png, docs/qa/calibration/farm.png, docs/qa/calibration/market.png, docs/qa/calibration/room.png, docs/opt/log/PK-P45d2.md
Wymagane: tools/qa/ux-p45-walk-bands.js, docs/qa/calibration/MEASURED.md
Weryfikacja: node --check tools/qa/ux-p45-walk-bands.js && node tools/qa/ux-p45-walk-bands.js && node tools/qa/place-scenes-check.js && node tools/qa/ux-p45-scene-data.js
Pytania: nie zadawaj pytań i nie czekaj na odpowiedź. Jeśli czegoś brakuje lub coś jest niejasne, sam wybierz najrozsądniejsze rozwiązanie zgodne z AGENTS.md, zapisz decyzję w logu i dokończ do końca.
Limity (twarde): maks. 40 wywołań narzędzi. Linię Weryfikacja uruchom maks. 2 razy. Czytaj tylko pliki z Zmieniaj/Wymagane oraz zakresy linii znalezione przez grep. Nie diagnozuj niczego spoza Zmieniaj. Gdy test pada na czymś, czego Twoja zmiana nie dotyka: zapisz nazwę testu i 5 linii błędu w logu, status BLOCKED, zakończ. Po błędzie we własnym kodzie wolno jedna poprawka i jeden ponowny bieg, potem zakończ jako BLOCKED. Nie uruchamiaj web-smoke.js (robi to paczka q).
Nie ruszaj: AGENTS.md, docs/archive/, tasks/*, every file not listed in Zmieniaj
Goal: Make each walk band sit on the real ground of its background, and record the measured same-object width ratios that justify the shallow depth scale.
Depends on: PK-P45a2 merged (overlay with crop and pig) and PK-P45d1 merged.
Produces (names other packages rely on): Final `walk` per scene in `place_scenes.json`; `docs/qa/calibration/MEASURED.md` (ratios and final bands); the 5 calibration PNGs.

## Kontekst perspektywy (fakty z pomiaru 8.11, nie szukaj ich drugi raz)
- Jedna kamera dla całej gry: **rzut ukośny z góry bez punktu zbiegu** (jak tła garden/farm/park). Skala rzeczy NIE zależy od głębi: grządka na y~80 ma ~32 px, ta sama na y~125 ma ~31 px. Świnka (sprite 64x64, ciało ok. 46x29, stopy w y=59, widok z boku) ma więc tylko lekką skalę głębi: `depthScale` = `[0.9375, 1.0]` (kroki 1/16, bo 64*k/16 to zawsze liczba całkowita).
- Pokój ma dziś dwa niezgodne układy: edytor i Core używają siatki `layout.cols x layout.rows` po 16 px (12x7 = 192x112, `wallRows` 2 = ściana 32 px), a płótno rysuje 240x130 ze ścianą 96 px (`drawHabitat`, `wallH=96`). `CuyScenes.placedThings` liczy y jako `y*16`. Zmieniamy płótno, NIE Core (`wallRows` jest stałą w C# i testach, nie ruszać).
- Okno Home pokazuje scenę przez `object-fit: cover` zakotwiczone do dołu; P39b przechodzi na całą scenę w całkowitej skali (`--scene-k`).
- Kolejność: te pakiety biegną PO fali P39 (blockers, layout, grid, depth) i PRZED P40. Dane `blockers`, `behindLine`, `pigWidthFrac` pochodzą z P39; nie dubluj ich. Jeśli log P39 podaje inną nazwę, użyj prawdziwej i zapisz różnicę w logu.
- Plan całości i tabela fal: `docs/opt/PERSPECTIVE_PLAN.md` (nie czytaj, jeśli ten prompt wystarcza).

## Steps
1. Run `node tools/qa/scene-overlay.js` (all default scenes) and VIEW `docs/qa/calibration/{garden,park,farm,market,room}.png` (the "do not read assets binaries" rule is lifted for these images).
2. Per outdoor scene measure two objects of the same type at different depths (garden: the two flower beds; park: two benches or trees; farm: fence posts; market: stall counters), compute width ratio far/near and write them in `docs/qa/calibration/MEASURED.md` (table: scene, object, y far, y near, width far, width near, ratio). Expect ~1.0. If a ratio is outside 0.9-1.1, say so in the log and do not change `depth_scale` (owner decides).
3. Re-tune each outdoor `walk` in `place_scenes.json` from the overlay: top edge at least 6 px below the ground line of the farthest standing object; bottom edge at least 4 px above the bottom of the image; the band must lie on visible ground and not cross any `blockers` rect fully (blockers may intersect the band, they are handled by P39). Market: widen the band upward only if the overlay shows free floor in front of the stalls; never cross a stall base. Re-run the overlay and look again after the change. Do NOT touch the room entry (done in PK-P45d1) or `depth_scale`.
4. Write the final calibration PNGs by running the overlay once more (default output `docs/qa/calibration`). Write the final `walk` per scene into MEASURED.md.
5. Test `tools/qa/ux-p45-walk-bands.js` (Node): WB1 for every scene the `walk` is inside `size`, height >= 12, bottom <= height - 4 (outdoors); WB2 walk width >= 60; WB3 `MEASURED.md` exists and mentions every outdoor scene id.
6. Run Weryfikacja; fix until green.

Prohibited: changing or deleting existing test assertions, new dependencies, touching files outside "Zmieniaj", extra refactors, running git.
Log: write `docs/opt/log/PK-P45d2.md` (max 10 lines: decisions, exact API/field names others will use, differences from the plan, BLOCKED reason if any). Do not run git.
