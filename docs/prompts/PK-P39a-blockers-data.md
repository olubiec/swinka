# PK-P39a: Scene blockers data and checker
Zmieniaj: assets/data/place_scenes.json, tools/qa/place-scenes-check.js, tools/qa/ux-p39-blockers.js, docs/opt/log/PK-P39a.md
Wymagane: tools/qa/ux-p39-blockers.js
Weryfikacja: node --check tools/qa/place-scenes-check.js && node --check tools/qa/ux-p39-blockers.js && node tools/qa/ux-p39-blockers.js
Pytania: nie zadawaj pytań i nie czekaj na odpowiedź. Jeśli czegoś brakuje lub coś jest niejasne, sam wybierz najrozsądniejsze rozwiązanie zgodne z AGENTS.md, zapisz decyzję w logu i dokończ do końca.
Limity (twarde): maks. 45 wywołań narzędzi. Linię Weryfikacja uruchom maks. 2 razy. Czytaj tylko pliki z Zmieniaj/Wymagane oraz zakresy linii znalezione przez grep. Nie diagnozuj niczego spoza Zmieniaj. Gdy test pada na czymś, czego Twoja zmiana nie dotyka: zapisz nazwę testu i 5 linii błędu w logu, status BLOCKED, zakończ. Po błędzie we własnym kodzie wolno jedna poprawka i jeden ponowny bieg, potem zakończ jako BLOCKED. Nie uruchamiaj web-smoke.js (robi to paczka q).
Nie ruszaj: AGENTS.md, docs/archive/, tasks/*, every file not listed in Zmieniaj
Goal: Every outdoor scene gets `blockers`: footprints of standing background objects (fountain, trees, stalls, pond, barn, fences). The pig will path around them (next packages).
Depends on: PK-P31a merged.

## Kontekst (fakty, nie szukaj drugi raz)
- Docelowa wizja: każde miejsce (pokoje domku, ogród, park, farma, targ) to scena w głównym oknie Home (pseudo-3D: widok z przodu z góry, podłoga z głębią, świnka chodzi w x i y, skaluje się z głębią, y-sort). Sceny: `assets/data/place_scenes.json` (`bg`, `walk` [x0,y0,x1,y1], `depthScale`, wyjścia), moduł `web/home/features/places/{feature,scenes}.js`, płótno `web/home/canvas-pig.js` (API w logach `docs/opt/log/PK-P33a.md`, `PK-P34a.md`, `PK-P36a.md`).
- Test właściciela 7.11 (P31-P37 wdrożone): świnka chodzi przez fontannę i inne elementy tła; skala świnki do sceny jest zła; belka miejsc przycina scenę (drzewa w parku, domek na farmie nie widać); tła scen nie mają światła/ambientu (`lib/lights.js`, `assets/data/lights.json`), który jest w oknach ogrodu i farmy.

## Steps
1. Open each background PNG in `assets/world/bg/` (view the image; garden_day, park_day, farm, market) and estimate the BASE footprint of each standing object in scene pixels (256x144 or 384x192). Footprint = the part touching the ground (bottom 4-10 px of the object), not its whole height, so the pig can pass BEHIND tall objects whose base is above the walk line.
2. Add to each scene in `place_scenes.json`: `"blockers": [{"id":"fountain","rect":[x0,y0,x1,y1]}, ...]`. Garden: fountain, benches, tree trunks, flower beds if solid. Park: tree trunks, bridge posts, river banks, benches. Farm: barn base, fence line, troughs, well. Market: each stall base, crates, barrels. House rooms: `[]` (furniture handled by placed items). Also add `"behindLine": y` per scene when a whole band of objects (e.g. the market stall row) is above the walk band.
3. Extend `tools/qa/place-scenes-check.js` with rules: B1 each rect inside the scene; B2 no rect overlaps the spawn/entry points (left/right edge exits, x=8 and x=size-8 at walk mid height); B3 >= 60% of each `walk` band stays free; B4 the free area is ONE connected region (4 px grid flood fill) and both exits are reachable; B5 ids unique per scene; B6 rect order x0<x1,y0<y1.
4. Tests: `tools/qa/ux-p39-blockers.js` (Node) runs the checker on the data and ALSO on 3 invalid fixtures it builds in memory (overlapping spawn, disconnected region, out of bounds) which must be rejected.
5. Run Weryfikacja; fix until green. Log: list of blockers per scene (ids only).

Prohibited: changing or deleting existing test assertions (poza wskazanymi w krokach), new dependencies, touching files outside "Zmieniaj", extra refactors.
Log: write `docs/opt/log/PK-P39a.md` (max 10 lines: decisions, exact API/field names others will use, differences from the plan, BLOCKED reason if any). Do not run git.
