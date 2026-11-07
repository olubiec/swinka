# PK-P39c: Walk grid and pathfinding around blockers
Zmieniaj: web/home/canvas-pig.js, tools/qa/ux-p39-grid.js, docs/opt/log/PK-P39c.md
Wymagane: tools/qa/ux-p39-grid.js
Weryfikacja: node --check web/home/canvas-pig.js && node --check tools/qa/ux-p39-grid.js && node tools/qa/ux-p39-grid.js
Pytania: nie zadawaj pytań i nie czekaj na odpowiedź. Jeśli czegoś brakuje lub coś jest niejasne, sam wybierz najrozsądniejsze rozwiązanie zgodne z AGENTS.md, zapisz decyzję w logu i dokończ do końca.
Limity (twarde): maks. 45 wywołań narzędzi. Linię Weryfikacja uruchom maks. 2 razy. Czytaj tylko pliki z Zmieniaj/Wymagane oraz zakresy linii znalezione przez grep. Nie diagnozuj niczego spoza Zmieniaj. Gdy test pada na czymś, czego Twoja zmiana nie dotyka: zapisz nazwę testu i 5 linii błędu w logu, status BLOCKED, zakończ. Po błędzie we własnym kodzie wolno jedna poprawka i jeden ponowny bieg, potem zakończ jako BLOCKED. Nie uruchamiaj web-smoke.js (robi to paczka q).
Nie ruszaj: AGENTS.md, docs/archive/, tasks/*, every file not listed in Zmieniaj
Goal: The pig never steps into a blocker or a placed standing item; it walks around them (grid pathfinding) and a dropped pig snaps to a free cell.
Depends on: PK-P39a, PK-P34a merged (read docs/opt/log/PK-P34a.md).

## Kontekst (fakty, nie szukaj drugi raz)
- Docelowa wizja: każde miejsce (pokoje domku, ogród, park, farma, targ) to scena w głównym oknie Home (pseudo-3D: widok z przodu z góry, podłoga z głębią, świnka chodzi w x i y, skaluje się z głębią, y-sort). Sceny: `assets/data/place_scenes.json` (`bg`, `walk` [x0,y0,x1,y1], `depthScale`, wyjścia), moduł `web/home/features/places/{feature,scenes}.js`, płótno `web/home/canvas-pig.js` (API w logach `docs/opt/log/PK-P33a.md`, `PK-P34a.md`, `PK-P36a.md`).
- Test właściciela 7.11 (P31-P37 wdrożone): świnka chodzi przez fontannę i inne elementy tła; skala świnki do sceny jest zła; belka miejsc przycina scenę (drzewa w parku, domek na farmie nie widać); tła scen nie mają światła/ambientu (`lib/lights.js`, `assets/data/lights.json`), który jest w oknach ogrodu i farmy.

## Steps
1. Read `docs/opt/log/PK-P34a.md`. grep in `canvas-pig.js`: `pickTarget`, `setTarget`, `walkTo`, `targetX`, `walkBand`, `scene.walk`, the update step that moves the pig.
2. Build a free-cell grid (4 px cells) per scene on `setScene`/`setThings`: walk band cells minus every `scene.blockers` rect minus the footprint of each placed STANDING thing (width of its sprite x its bottom 4 px; flat things like rugs do not block). Expose `CanvasPig.debug().grid = {w,h,free:count}` and `CanvasPig.isFree(x,y)`.
3. Path: if the straight segment from the pig's feet to the target is free walk it directly; otherwise A* on the grid (8-neighbour, no corner cutting), smooth the path (drop collinear points), follow waypoints one after another in the existing walk animation (direction -> side/diagonal anim as now). Target picker chooses only free cells reachable from the pig's cell. If no path exists: pick another target.
4. Drag drop: dropping the pig onto a blocked cell moves the feet to the nearest free cell (BFS ring search), never outside the band.
5. Tests FIRST, `tools/qa/ux-p39-grid.js` (Playwright, mock `seven`, scenes with blockers from P39a; use `CanvasPig.fastForward(ms)`):
   - W1 `never-in-blocker`: for each scene `fastForward` 60 s in 0.5 s steps with random targets: feet never inside a blocker rect or standing-item footprint (assert on every step via `debug().pig`).
   - W2 `path-around`: target directly behind a blocker: reached (distance < 4 px) within 25 s, the path never enters it.
   - W3 `unreachable-target-rejected`: a target inside a blocker is never chosen.
   - W4 `drop-snaps`: drop on a blocker -> free cell within 12 px.
   - W5 `placed-item-blocks`: after `setThings` adds a tall standing item the pig avoids its footprint; removing it frees the cells.
   - W6 `perf`: the grid build for the 384x192 park plus 30 things takes < 20 ms, a frame with the pig walking < 4 ms (performance.now).
6. Run Weryfikacja; fix until green.

Prohibited: changing or deleting existing test assertions (poza wskazanymi w krokach), new dependencies, touching files outside "Zmieniaj", extra refactors.
Log: write `docs/opt/log/PK-P39c.md` (max 10 lines: decisions, exact API/field names others will use, differences from the plan, BLOCKED reason if any). Do not run git.
