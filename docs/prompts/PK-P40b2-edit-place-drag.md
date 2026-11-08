# PK-P40b2: Edit mode: drag from stash and drop on the scene
Zmieniaj: web/home/features/places/edit-panel.js, tools/qa/ux-p40-edit-place.js, docs/opt/log/PK-P40b2.md
Wymagane: tools/qa/ux-p40-edit-place.js
Weryfikacja: node --check web/home/features/places/edit-panel.js && node --check tools/qa/ux-p40-edit-place.js && node tools/qa/ux-p40-edit-place.js
Pytania: nie zadawaj pytań i nie czekaj na odpowiedź. Jeśli czegoś brakuje lub coś jest niejasne, sam wybierz najrozsądniejsze rozwiązanie zgodne z AGENTS.md, zapisz decyzję w logu i dokończ do końca.
Limity (twarde): maks. 40 wywołań narzędzi. Linię Weryfikacja uruchom maks. 2 razy. Czytaj tylko pliki z Zmieniaj/Wymagane oraz zakresy linii znalezione przez grep. Nie diagnozuj niczego spoza Zmieniaj. Gdy test pada na czymś, czego Twoja zmiana nie dotyka: zapisz nazwę testu i 5 linii błędu w logu, status BLOCKED, zakończ. Po błędzie we własnym kodzie wolno jedna poprawka i jeden ponowny bieg, potem zakończ jako BLOCKED. Nie uruchamiaj web-smoke.js (robi to paczka q).
Nie ruszaj: AGENTS.md, docs/archive/, tasks/*, every file not listed in Zmieniaj
Goal: Drag a stash card onto the scene: ghost preview, 4 px snapping, valid drop sends `room_place`, invalid or outside cancels.
Depends on: PK-P40a and PK-P40b merged (logs: drawer API `CuyEdit.*`; canvas `setGhost/pickAt/cellValid`).

## Kontekst (fakty, nie szukaj drugi raz)
- Docelowa wizja: każde miejsce (pokoje domku, ogród, park, farma, targ) to scena w głównym oknie Home (pseudo-3D: widok z przodu z góry, podłoga z głębią, świnka chodzi w x i y, skaluje się z głębią, y-sort). Sceny: `assets/data/place_scenes.json` (`bg`, `walk` [x0,y0,x1,y1], `depthScale`, wyjścia), moduł `web/home/features/places/{feature,scenes}.js`, płótno `web/home/canvas-pig.js` (API w logach `docs/opt/log/PK-P33a.md`, `PK-P34a.md`, `PK-P36a.md`).
- Test właściciela 7.11 (P31-P37 wdrożone): świnka chodzi przez fontannę i inne elementy tła; skala świnki do sceny jest zła; belka miejsc przycina scenę (drzewa w parku, domek na farmie nie widać); tła scen nie mają światła/ambientu (`lib/lights.js`, `assets/data/lights.json`), który jest w oknach ogrodu i farmy.

- Wiadomości mostka (fakty): pokój/ogród `room_place {place,itemId,x,y}`, `room_move {place,uid,x,y}`, `room_remove {place,uid}`, `room_flip {place,uid}`, `place_upgrade {id}`, `place_unlock {id}`; targ `market_quote/market_buy/market_sell {itemId,count}`, `market_stall`; farma `farm_plant {plot,cropId}`, `farm_water {plot}`, `farm_harvest {plot}`, `farm_harvest_all`, `farm_buy {what}`, `orchard_plant/orchard_harvest {slot}`; świnka `places.pigMove {pigId,to}`, `places.pigPin {pigId,pinned}`, `take_out`. Pole `place` to id sceny (`salon`, `pig:<id>`, `dorm`, `garden`, `park`, `farm`, `market`).
- Testy: Playwright przez `tools/qa/lib/ux.js` (helpery `openHome`, `openMore`, `openFromMore`), mock przeglądarkowy per funkcja (`features/<f>/mock.js`, `CuyScenesMock.state('seven')` daje 7 scen). Testy uruchamia `tools/qa/ux-all.js` (pliki `ux-pN-*.js`).


## Pliki i elementy (zweryfikowane w repo 8.11.2026; nie szukaj ich drugi raz)
- Line numbers below are from 8.11.2026, BEFORE waves P39 and P45 (they edit `canvas-pig.js`, `scenes.js`, `places/feature.js`, `index.html`). Find every function by name with grep, never by line.
- `web/home/features/places/edit-panel.js`: created by PK-P40a (`window.CuyEdit`: `open/close/toggle/isOpen/render/itemsFor`, cards `.edit-card[data-item]`, dimmed `is-empty`). Add pointer handling on the cards; document-level `pointermove/pointerup`; a DOM ghost (`.edit-drag-ghost`, library icon) only until the pointer enters the canvas `#pigCanvas`, then `CanvasPig.setGhost`.
- `web/home/canvas-pig.js`: read-only here: `CanvasPig.instance.toScene(e)` (pointer -> scene px), `setGhost({itemId,cx,cy,valid}|null)`, `cellValid(itemId,cx,cy)` (PK-P40b, CELL coordinates, cell = 16 px). Do NOT edit.
- Message: `bridge.send({type:"room_place", place:<scene id>, itemId, x:cx, y:cy})` where x,y are INTEGER CELLS of the footprint top-left (server contract, `RoomsFeature.cs` 350-372, `RoomsMessages.cs` range -1..200). NOT pixels and NOT 4 px. Conversion: with pointer = centre of the footprint, `cx = Math.round(px/16 - w/2)`, `cy = Math.round(py/16 - h/2)`, `w,h` from `state.rooms.catalog`. `place` = `CuyPlaces.getCurrentPlace()`; house scenes (`salon`, `dorm`, `pig:*`) use their own scene id as `place` (as `rooms/feature.js` `S.place`).
- Mock: `web/home/features/rooms/mock.js` handler `room_place` (~359) mutates `st.rooms.layouts[place].items` and raises `owned`/`placed`; the P6 test relies on it, so the test must call the real handler (no stub).
- `tools/qa/ux-p40-edit-place.js (NEW)`: Playwright, `page.mouse`, mock `seven`.

## Steps
1. Read `docs/opt/log/PK-P40a.md` and `PK-P40b.md` (exact API) first.
2. Tests FIRST: P1 `drop-valid-sends` (one `room_place` with place/itemId and integer cell x,y matching the drop point), P2 `drop-on-blocker-cancels` (garden fountain: nothing sent), P3 `drop-outside-cancels` (released over the drawer or outside canvas), P4 `ghost-shown-and-cleared` (`CanvasPig.debug().ghost` set while over canvas, null after), P5 `zero-owned-not-draggable` (card dimmed, no drag starts), P6 `placed-appears-and-blocks` (after the mock applies the place: `CanvasPig.cellValid` false at the footprint), P7 `indoor-cannot-drop-in-garden` (garden drawer has no indoor card; `cellValid` result irrelevant). Choose items from the mock catalog, never toys.
3. Implement; ghost `valid` from `CanvasPig.cellValid`; invalid ghost tinted red by the canvas.
4. Run Weryfikacja; fix until green.

## Zasady grafiki i interfejsu (obowiązkowe)
- Legenda stylu: `docs/STYL_SWIATA.md` (czytaj pkt 0-2 i 5, ok. 60 linii) i paleta `assets/data/style_palette.json` (42 kolory). Zakaz kolorów spoza palety, zakaz `#ffffff` i `#000000`, zakaz gradientów CSS, rozmycia i cieni z blur. `image-rendering: pixelated`, skala tylko całkowita, pozycje w pełnych pikselach.
- Biblioteka pixel artów: najpierw szukaj gotowego w `assets/world/`, `assets/ui/`, `assets/icons/`, `assets/props/`. Nowy sprite tylko gdy go tam naprawdę nie ma: skrypt w `tools/art/` + `python3 tools/art/style_check.py --baseline docs/album/stylbook/lint_baseline.txt` bez nowych błędów.
- Interfejs jak reszta gry: drewniane ramki i 9-slice z `assets/ui/`, kolory `--ui-*`, czcionka `--ui-font`. Zakaz własnych SVG i glifów tekstowych (✕ ← →).

Prohibited: changing or deleting existing test assertions, new dependencies, touching files outside "Zmieniaj", extra refactors, doing steps of other packages.
Log: write `docs/opt/log/PK-P40b2.md` (max 10 lines: decisions, exact API/field/message names others will use, differences from the plan, BLOCKED reason if any). Do not run git.
