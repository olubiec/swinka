# PK-P39a: Obstacles, walk physics and pig scale
Zmieniaj: assets/data/place_scenes.json, tools/qa/place-scenes-check.js, web/home/canvas-pig.js, web/home/features/places/scenes.js, tools/qa/ux-p39-physics.js, docs/opt/log/PK-P39a.md
Wymagane: tools/qa/ux-p39-physics.js, assets/data/place_scenes.json
Weryfikacja: node --check web/home/canvas-pig.js && node --check web/home/features/places/scenes.js && node tools/qa/place-scenes-check.js && node --check tools/qa/ux-p39-physics.js && node tools/qa/ux-p39-physics.js
Pytania: nie zadawaj pytań i nie czekaj na odpowiedź. Jeśli czegoś brakuje lub coś jest niejasne, sam wybierz najrozsądniejsze rozwiązanie zgodne z AGENTS.md, zapisz decyzję w logu i dokończ do końca.
Limity (twarde): maks. 45 wywołań narzędzi. Linię Weryfikacja uruchom maks. 2 razy. Czytaj tylko pliki z Zmieniaj/Wymagane oraz zakresy linii znalezione przez grep. Nie diagnozuj niczego spoza Zmieniaj. Gdy test pada na czymś, czego Twoja zmiana nie dotyka: zapisz nazwę testu i 5 linii błędu w logu, status BLOCKED, zakończ. Po błędzie we własnym kodzie wolno jedna poprawka i jeden ponowny bieg, potem zakończ jako BLOCKED. Nie uruchamiaj web-smoke.js (robi to paczka q).
Nie ruszaj: AGENTS.md, docs/archive/, tasks/*, every file not listed in Zmieniaj
Goal: The pig must not walk through scenery (fountain, stalls, pond, barn, trees, fences) and must be scaled correctly to each scene's perspective. Add per-scene blockers and a walkable area test, fix pig size vs depth.
Depends on: PK-P33a, PK-P34a merged.

## Kontekst (fakty, nie szukaj drugi raz)
- Docelowa wizja: każde miejsce (pokoje domku, ogród, park, farma, targ) to scena w głównym oknie Home (pseudo-3D: widok z przodu z góry, podłoga z głębią, świnka chodzi w x i y, skaluje się z głębią, y-sort). Sceny: `assets/data/place_scenes.json` (`bg`, `walk` [x0,y0,x1,y1], `depthScale`, wyjścia), moduł `web/home/features/places/{feature,scenes}.js`, płótno `web/home/canvas-pig.js` (API w logach `docs/opt/log/PK-P33a.md`, `PK-P34a.md`, `PK-P36a.md`).
- Test właściciela 7.11 (P31-P37 wdrożone): świnka chodzi przez fontannę i inne elementy tła; skala świnki do sceny jest zła; belka miejsc przycina scenę (drzewa w parku, domek na farmie nie widać); tła scen nie mają światła/ambientu (`lib/lights.js`, `assets/data/lights.json`), który jest w oknach ogrodu i farmy.

## Steps
1. Data: in `place_scenes.json` add per scene `blockers`: list of `{id, rect:[x0,y0,x1,y1]}` in scene pixels covering the BASE (feet footprint) of every standing background object: garden fountain, benches, trees; park trees, bridge posts, pond/river banks; farm barn, fences, troughs; market stalls; house rooms: leave empty (furniture is handled by placed items). Read the PNGs in `assets/world/bg/` to place them (view the image, estimate boxes, keep them tight to the base so the pig can pass BEHIND objects whose base is above the walk line). Extend `tools/qa/place-scenes-check.js`: every blocker lies inside the scene, no blocker covers the pig's spawn point, at least 60% of each `walk` band stays free, free area is one connected region (grid flood fill, 4 px cells).
2. Engine (`canvas-pig.js`): the pig's target picker and the walker use a 4 px grid of free cells (walk band minus blockers minus the footprints of placed standing items, footprint = sprite width x 4 px at the bottom). Path: straight line if free, else grid A* (or simple BFS) with the path smoothed; never step into a blocked cell. Pig dragged and dropped onto a blocked cell snaps to the nearest free cell. Standing things sort by feet Y (existing y-sort): when the pig walks behind an object (feet Y smaller than the object's base) the object covers the pig.
3. Scale: define per scene `pigBaseHeight` (px height of the pig at depthScale 1.0 relative to the scene, default from `depthScale[1]`) so the pig is believable against doors, stalls, fountain: pig body length about 1/6 of a 256 px wide scene at the bottom of the walk band, scaled linearly to `depthScale[0]` at the top; rounded to 1/8 steps (existing rule). Write the chosen sizes in the log.
4. Tests FIRST, `tools/qa/ux-p39-physics.js`:
   - Ph1 `never-in-blocker`: in each scene run `fastForward` 60 s with random targets: the pig's feet never inside a blocker rect (sample each tick via `debug().pig`).
   - Ph2 `path-around`: place a target behind a blocker: the pig reaches it (distance < 4 px within 20 s) without entering it.
   - Ph3 `behind-covered`: `debug().renderOrder` puts the blocker object after the pig when the pig's feet Y < object's base Y.
   - Ph4 `scale-monotonic`: scale at top < scale at bottom, within `depthScale`, and the pig is 12-20% of the scene width at the bottom.
   - Ph5 `drop-snaps`: dropping on a blocker ends in a free cell.
5. Run Weryfikacja; fix until green.
## Zasady grafiki i interfejsu (obowiązkowe)
- Legenda stylu: `docs/STYL_SWIATA.md` (czytaj pkt 0-2 i 5, ok. 60 linii) i paleta `assets/data/style_palette.json` (42 kolory). Zakaz kolorów spoza palety, zakaz `#ffffff` i `#000000`, zakaz gradientów CSS, rozmycia i cieni z blur. `image-rendering: pixelated`, skala tylko całkowita, pozycje w pełnych pikselach.
- Biblioteka pixel artów: najpierw szukaj gotowego w `assets/world/`, `assets/ui/`, `assets/icons/`, `assets/props/`. Nowy sprite tylko gdy go tam naprawdę nie ma: skrypt w `tools/art/` + `python3 tools/art/style_check.py --baseline docs/album/stylbook/lint_baseline.txt` bez nowych błędów.
- Interfejs jak reszta gry: drewniane ramki i 9-slice z `assets/ui/`, kolory `--ui-*`, czcionka `--ui-font`. Zakaz własnych SVG i glifów tekstowych (✕ ← →).

Prohibited: changing or deleting existing test assertions (poza wskazanymi w krokach), new dependencies, touching files outside "Zmieniaj", extra refactors.
Log: write `docs/opt/log/PK-P39a.md` (max 10 lines: decisions, exact API/field names others will use, differences from the plan, BLOCKED reason if any). Do not run git.
