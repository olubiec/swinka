# PK-P40b: Edit mode: drag from stash onto the scene
Zmieniaj: web/home/features/places/edit-panel.js, web/home/canvas-pig.js, tools/qa/ux-p40-edit-place.js, docs/opt/log/PK-P40b.md
Wymagane: tools/qa/ux-p40-edit-place.js
Weryfikacja: node --check web/home/features/places/edit-panel.js && node --check web/home/canvas-pig.js && node --check tools/qa/ux-p40-edit-place.js && node tools/qa/ux-p40-edit-place.js
Pytania: nie zadawaj pytań i nie czekaj na odpowiedź. Jeśli czegoś brakuje lub coś jest niejasne, sam wybierz najrozsądniejsze rozwiązanie zgodne z AGENTS.md, zapisz decyzję w logu i dokończ do końca.
Limity (twarde): maks. 45 wywołań narzędzi. Linię Weryfikacja uruchom maks. 2 razy. Czytaj tylko pliki z Zmieniaj/Wymagane oraz zakresy linii znalezione przez grep. Nie diagnozuj niczego spoza Zmieniaj. Gdy test pada na czymś, czego Twoja zmiana nie dotyka: zapisz nazwę testu i 5 linii błędu w logu, status BLOCKED, zakończ. Po błędzie we własnym kodzie wolno jedna poprawka i jeden ponowny bieg, potem zakończ jako BLOCKED. Nie uruchamiaj web-smoke.js (robi to paczka q).
Nie ruszaj: AGENTS.md, docs/archive/, tasks/*, every file not listed in Zmieniaj
Goal: Drag an item from the stash onto the scene to place it: ghost preview, snapping, only on valid free cells, sends `room_place`.
Depends on: PK-P40a, PK-P39c merged.

## Kontekst (fakty, nie szukaj drugi raz)
- Docelowa wizja: każde miejsce (pokoje domku, ogród, park, farma, targ) to scena w głównym oknie Home (pseudo-3D: widok z przodu z góry, podłoga z głębią, świnka chodzi w x i y, skaluje się z głębią, y-sort). Sceny: `assets/data/place_scenes.json` (`bg`, `walk` [x0,y0,x1,y1], `depthScale`, wyjścia), moduł `web/home/features/places/{feature,scenes}.js`, płótno `web/home/canvas-pig.js` (API w logach `docs/opt/log/PK-P33a.md`, `PK-P34a.md`, `PK-P36a.md`).
- Test właściciela 7.11 (P31-P37 wdrożone): świnka chodzi przez fontannę i inne elementy tła; skala świnki do sceny jest zła; belka miejsc przycina scenę (drzewa w parku, domek na farmie nie widać); tła scen nie mają światła/ambientu (`lib/lights.js`, `assets/data/lights.json`), który jest w oknach ogrodu i farmy.

- Wiadomości mostka (fakty): pokój/ogród `room_place {place,itemId,x,y}`, `room_move {place,uid,x,y}`, `room_remove {place,uid}`, `room_flip {place,uid}`, `place_upgrade {id}`, `place_unlock {id}`; targ `market_quote/market_buy/market_sell {itemId,count}`, `market_stall`; farma `farm_plant {plot,cropId}`, `farm_water {plot}`, `farm_harvest {plot}`, `farm_harvest_all`, `farm_buy {what}`, `orchard_plant/orchard_harvest {slot}`; świnka `places.pigMove {pigId,to}`, `places.pigPin {pigId,pinned}`, `take_out`. Pole `place` to id sceny (`salon`, `pig:<id>`, `dorm`, `garden`, `park`, `farm`, `market`).
- Testy: Playwright przez `tools/qa/lib/ux.js` (helpery `openHome`, `openMore`, `openFromMore`), mock przeglądarkowy per funkcja (`features/<f>/mock.js`, `CuyScenesMock.state('seven')` daje 7 scen). Testy uruchamia `tools/qa/ux-all.js` (pliki `ux-pN-*.js`).

## Steps
1. Read `docs/opt/log/PK-P40a.md`. grep in `canvas-pig.js` for the scene mouse mapping `toScene` (PK-P33a) and the draw layer system (`addLayer`).
2. Engine (`canvas-pig.js`): `CanvasPig.setGhost({itemId, x, y, valid} | null)` draws a semi-transparent (dither, 50% checker, no alpha blur) sprite at the position in the standing-thing layer; `CanvasPig.pickAt(x,y)` returns the topmost placed thing under the point (by sprite rect, transparent pixels ignored) or null; `CanvasPig.cellValid(itemId,x,y)` = footprint inside the walk band, not on blockers, not overlapping other standing things (flat items may overlap).
3. `edit-panel.js`: pointer-down on a card starts a drag (document-level pointer events, a small DOM ghost only until the pointer enters the canvas, then `setGhost`). Snap x,y to 4 px. Valid -> ghost normal; invalid -> ghost tinted with the palette's red. Release on a valid cell: `bridge.send({type:'room_place', place: <scene id>, itemId, x, y})`; release elsewhere: cancel, nothing sent. Items with 0 owned cannot be dragged (card dimmed).
4. Tests FIRST, `tools/qa/ux-p40-edit-place.js` (Playwright, mock; use `page.mouse`): P1 `drop-valid-sends` (exactly one `room_place` with the right place/itemId/x/y snapped to 4), P2 `drop-on-blocker-cancels` (garden fountain: nothing sent), P3 `drop-outside-cancels`, P4 `ghost-shown-and-cleared` (`debug().ghost` set during drag, null after), P5 `zero-owned-not-draggable`, P6 `placed-item-appears-and-blocks-pig` (mock applies the place: `placedThings` grows and `CanvasPig.isFree` is false at the footprint), P7 `scene-kinds` (indoor item cannot be dropped in the garden).
5. Run Weryfikacja; fix until green.

Prohibited: changing or deleting existing test assertions (poza wskazanymi w krokach), new dependencies, touching files outside "Zmieniaj", extra refactors.
Log: write `docs/opt/log/PK-P40b.md` (max 10 lines: decisions, exact API/field names others will use, differences from the plan, BLOCKED reason if any). Do not run git.
