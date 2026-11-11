# PK-P44a: Drag the pig to the screen edge
Zmieniaj: web/home/canvas-pig.js, tools/qa/ux-p44-drag-edge.js, docs/opt/log/PK-P44a.md
Wymagane: tools/qa/ux-p44-drag-edge.js
Weryfikacja: node --check web/home/canvas-pig.js && node --check tools/qa/ux-p44-drag-edge.js && node tools/qa/ux-p44-drag-edge.js
Pytania: nie zadawaj pytań i nie czekaj na odpowiedź. Jeśli czegoś brakuje lub coś jest niejasne, sam wybierz najrozsądniejsze rozwiązanie zgodne z AGENTS.md, zapisz decyzję w logu i dokończ do końca.
Limity (twarde): maks. 45 wywołań narzędzi. Linię Weryfikacja uruchom maks. 2 razy. Czytaj tylko pliki z Zmieniaj/Wymagane oraz zakresy linii znalezione przez grep. Nie diagnozuj niczego spoza Zmieniaj. Gdy test pada na czymś, czego Twoja zmiana nie dotyka: zapisz nazwę testu i 5 linii błędu w logu, status BLOCKED, zakończ. Po błędzie we własnym kodzie wolno jedna poprawka i jeden ponowny bieg, potem zakończ jako BLOCKED. Nie uruchamiaj web-smoke.js (robi to paczka q).
Nie ruszaj: AGENTS.md, docs/archive/, tasks/*, every file not listed in Zmieniaj
Goal: While dragging the pig inside the window, holding it at the left/right edge for 600 ms requests the neighbouring scene and the drag continues there. Dragging out of the window (to the desktop) still works.
Depends on: PK-P39c, PK-P40b merged. Runs BEFORE wave P46 and P43 (all edit `canvas-pig.js`, one wave at a time; order fixed in `docs/PLAN_FAL_PRZEBUDOWA_11_11.md`).

## Kontekst (fakty, nie szukaj drugi raz)
- Docelowa wizja: każde miejsce (pokoje domku, ogród, park, farma, targ) to scena w głównym oknie Home (pseudo-3D: widok z przodu z góry, podłoga z głębią, świnka chodzi w x i y, skaluje się z głębią, y-sort). Sceny: `assets/data/place_scenes.json` (`bg`, `walk` [x0,y0,x1,y1], `depthScale`, wyjścia), moduł `web/home/features/places/{feature,scenes}.js`, płótno `web/home/canvas-pig.js` (API w logach `docs/opt/log/PK-P33a.md`, `PK-P34a.md`, `PK-P36a.md`).
- Test właściciela 7.11 (P31-P37 wdrożone): świnka chodzi przez fontannę i inne elementy tła; skala świnki do sceny jest zła; belka miejsc przycina scenę (drzewa w parku, domek na farmie nie widać); tła scen nie mają światła/ambientu (`lib/lights.js`, `assets/data/lights.json`), który jest w oknach ogrodu i farmy.

- Wiadomości mostka (fakty): pokój/ogród `room_place {place,itemId,x,y}`, `room_move {place,uid,x,y}`, `room_remove {place,uid}`, `room_flip {place,uid}`, `place_upgrade {id}`, `place_unlock {id}`; targ `market_quote/market_buy/market_sell {itemId,count}`, `market_stall`; farma `farm_plant {plot,cropId}`, `farm_water {plot}`, `farm_harvest {plot}`, `farm_harvest_all`, `farm_buy {what}`, `orchard_plant/orchard_harvest {slot}`; świnka `places.pigMove {pigId,to}`, `places.pigPin {pigId,pinned}`, `take_out`. Pole `place` to id sceny (`salon`, `pig:<id>`, `dorm`, `garden`, `park`, `farm`, `market`).
- Testy: Playwright przez `tools/qa/lib/ux.js` (helpery `openHome`, `openMore`, `openFromMore`), mock przeglądarkowy per funkcja (`features/<f>/mock.js`, `CuyScenesMock.state('seven')` daje 7 scen). Testy uruchamia `tools/qa/ux-all.js` (pliki `ux-pN-*.js`).

## Steps
1. grep `canvas-pig.js` drag code (lines ~530-575: `this.drag`, `take_out`, `suppressClick`).
2. Edge zone: the outer 12 px of the canvas left/right. While the pointer is in the zone for 600 ms (show a growing 1 px arrow/chevron indicator from the library arrow sprite at that edge) call `CanvasPig.onEdgeHold({side:'left'|'right'})` once, then wait for `CanvasPig.continueDrag(newSceneDef)`: the pig sprite stays on the pointer, the new scene is set, the pointer is moved inside by 16 px visually (pig x = edge + 16) and drag state is kept (`drag.moved` stays true). Re-arm after the pointer leaves the zone.
3. Also add `CanvasPig.onDrop({x,y})` (the canvas has no scene id; `places/feature.js` adds it in PK-P44b), fired on every drop that stays inside the window (after snapping). The 'dragged out of the window' rule (`take_out`) applies only above/below the window or beyond the edge zone by 40 px while NO neighbour exists on that side (no scene to switch to). Provide `CanvasPig.setEdgeNeighbours({left:bool,right:bool})`.
4. Tests FIRST, `tools/qa/ux-p44-drag-edge.js` (Playwright, mock; `page.mouse` with waits): G1 `hold-fires-once` (600 ms hold -> one `onEdgeHold`), G2 `short-pass-no-fire`, G3 `continue-keeps-drag` (after `continueDrag` further moves still move the pig; release drops it), G4 `no-neighbour-take-out` (no neighbour: drag beyond sends `take_out`), G5 `indicator-visible-while-holding`, G6 `rearm-after-leave`, G7 `drop-snaps-free-cell` (uses PK-P39c snapping).
5. Run Weryfikacja; fix until green.

Prohibited: changing or deleting existing test assertions (poza wskazanymi w krokach), new dependencies, touching files outside "Zmieniaj", extra refactors.
Log: write `docs/opt/log/PK-P44a.md` (max 10 lines: decisions, exact API/field names others will use, differences from the plan, BLOCKED reason if any). Do not run git.
