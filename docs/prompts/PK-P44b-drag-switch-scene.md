# PK-P44b: Drag switches the scene and moves the pig
Zmieniaj: web/home/features/places/feature.js, tools/qa/ux-p44-drag-switch.js, docs/opt/log/PK-P44b.md
Wymagane: tools/qa/ux-p44-drag-switch.js
Weryfikacja: node --check web/home/features/places/feature.js && node --check tools/qa/ux-p44-drag-switch.js && node tools/qa/ux-p44-drag-switch.js
Pytania: nie zadawaj pytań i nie czekaj na odpowiedź. Jeśli czegoś brakuje lub coś jest niejasne, sam wybierz najrozsądniejsze rozwiązanie zgodne z AGENTS.md, zapisz decyzję w logu i dokończ do końca.
Limity (twarde): maks. 45 wywołań narzędzi. Linię Weryfikacja uruchom maks. 2 razy. Czytaj tylko pliki z Zmieniaj/Wymagane oraz zakresy linii znalezione przez grep. Nie diagnozuj niczego spoza Zmieniaj. Gdy test pada na czymś, czego Twoja zmiana nie dotyka: zapisz nazwę testu i 5 linii błędu w logu, status BLOCKED, zakończ. Po błędzie we własnym kodzie wolno jedna poprawka i jeden ponowny bieg, potem zakończ jako BLOCKED. Nie uruchamiaj web-smoke.js (robi to paczka q).
Nie ruszaj: AGENTS.md, docs/archive/, tasks/*, every file not listed in Zmieniaj
Goal: Wire the edge hold to the places ring: the bar switches to the neighbour, the pig is dropped there and its location is saved with `places.pigMove`.
Depends on: PK-P44a, PK-P38a merged.

## Kontekst (fakty, nie szukaj drugi raz)
- Docelowa wizja: każde miejsce (pokoje domku, ogród, park, farma, targ) to scena w głównym oknie Home (pseudo-3D: widok z przodu z góry, podłoga z głębią, świnka chodzi w x i y, skaluje się z głębią, y-sort). Sceny: `assets/data/place_scenes.json` (`bg`, `walk` [x0,y0,x1,y1], `depthScale`, wyjścia), moduł `web/home/features/places/{feature,scenes}.js`, płótno `web/home/canvas-pig.js` (API w logach `docs/opt/log/PK-P33a.md`, `PK-P34a.md`, `PK-P36a.md`).
- Test właściciela 7.11 (P31-P37 wdrożone): świnka chodzi przez fontannę i inne elementy tła; skala świnki do sceny jest zła; belka miejsc przycina scenę (drzewa w parku, domek na farmie nie widać); tła scen nie mają światła/ambientu (`lib/lights.js`, `assets/data/lights.json`), który jest w oknach ogrodu i farmy.

- Wiadomości mostka (fakty): pokój/ogród `room_place {place,itemId,x,y}`, `room_move {place,uid,x,y}`, `room_remove {place,uid}`, `room_flip {place,uid}`, `place_upgrade {id}`, `place_unlock {id}`; targ `market_quote/market_buy/market_sell {itemId,count}`, `market_stall`; farma `farm_plant {plot,cropId}`, `farm_water {plot}`, `farm_harvest {plot}`, `farm_harvest_all`, `farm_buy {what}`, `orchard_plant/orchard_harvest {slot}`; świnka `places.pigMove {pigId,to}`, `places.pigPin {pigId,pinned}`, `take_out`. Pole `place` to id sceny (`salon`, `pig:<id>`, `dorm`, `garden`, `park`, `farm`, `market`).
- Testy: Playwright przez `tools/qa/lib/ux.js` (helpery `openHome`, `openMore`, `openFromMore`), mock przeglądarkowy per funkcja (`features/<f>/mock.js`, `CuyScenesMock.state('seven')` daje 7 scen). Testy uruchamia `tools/qa/ux-all.js` (pliki `ux-pN-*.js`).

## Pliki i elementy (zweryfikowane w repo 8.11.2026; nie szukaj ich drugi raz)
- `web/home/features/places/feature.js`: `handlePigExit(ev)` (196, currently sends `places.pigMove` at 220), `bindCanvasExits()` (227), `computeNeighbourScene(current,dir,st)` (102), `applyScene` (275), `next/prev` (373/392). Reuse the existing toast helper.
- `CuyScenes.neighbor(id, dir, state)` in `scenes.js` (271).

## Steps
1. Read `docs/opt/log/PK-P44a.md` and `PK-P38a.md` (neighbour lookup, locked handling).
2. In `places/feature.js`: set `CanvasPig.setEdgeNeighbours` on every scene change (neighbour exists and is unlocked). On `onEdgeHold({side})`: neighbour = `CuyScenes.neighbor(current, side)`; if locked or none -> a small toast (existing toast helper) `Locked: <hint>` and the drag simply continues in the same scene; else switch the scene (`applyScene`), call `CanvasPig.continueDrag(def)`.
3. On `CanvasPig.onDrop` (from PK-P44a) send `places.pigMove {pigId, to}` once. Pinned pigs: dragging still allowed, location updated and stays pinned there.
4. Cancel: if the drag is released outside the canvas (take_out) nothing is sent.
5. Tests FIRST, `tools/qa/ux-p44-drag-switch.js` (Playwright, mock with all scenes unlocked): T1 `edge-hold-switches-bar-title`, T2 `drop-sends-pigMove-once` (right pigId/to), T3 `locked-neighbour-toast-no-switch`, T4 `drag-across-three-scenes` (hold twice, drop: only one pigMove with the final scene), T5 `chip-consistent` (P38 chip not shown in the pig's new scene), T6 `pinned-stays-pinned`, T7 `take-out-sends-nothing-else`.
6. Run Weryfikacja; fix until green.

Prohibited: changing or deleting existing test assertions (poza wskazanymi w krokach), new dependencies, touching files outside "Zmieniaj", extra refactors.
Log: write `docs/opt/log/PK-P44b.md` (max 10 lines: decisions, exact API/field names others will use, differences from the plan, BLOCKED reason if any). Do not run git.
