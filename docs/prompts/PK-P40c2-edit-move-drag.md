# PK-P40c2: Edit mode: move placed items and drag them back to the drawer
Zmieniaj: web/home/features/places/edit-panel.js, tools/qa/ux-p40-edit-move-drag.js, docs/opt/log/PK-P40c2.md
Wymagane: tools/qa/ux-p40-edit-move-drag.js
Weryfikacja: node --check web/home/features/places/edit-panel.js && node --check tools/qa/ux-p40-edit-move-drag.js && node tools/qa/ux-p40-edit-move-drag.js
Pytania: nie zadawaj pytań i nie czekaj na odpowiedź. Jeśli czegoś brakuje lub coś jest niejasne, sam wybierz najrozsądniejsze rozwiązanie zgodne z AGENTS.md, zapisz decyzję w logu i dokończ do końca.
Limity (twarde): maks. 45 wywołań narzędzi. Linię Weryfikacja uruchom maks. 2 razy. Czytaj tylko pliki z Zmieniaj/Wymagane oraz zakresy linii znalezione przez grep. Nie diagnozuj niczego spoza Zmieniaj. Gdy test pada na czymś, czego Twoja zmiana nie dotyka: zapisz nazwę testu i 5 linii błędu w logu, status BLOCKED, zakończ. Po błędzie we własnym kodzie wolno jedna poprawka i jeden ponowny bieg, potem zakończ jako BLOCKED. Nie uruchamiaj web-smoke.js (robi to paczka q).
Nie ruszaj: AGENTS.md, docs/archive/, tasks/*, every file not listed in Zmieniaj
Goal: In edit mode a selected or pressed placed item can be dragged to a new valid cell (`room_move`) or dropped on the drawer to return it to the stash (`room_remove`).
Depends on: PK-P40c merged.

## Kontekst (fakty, nie szukaj drugi raz)
- Docelowa wizja: każde miejsce (pokoje domku, ogród, park, farma, targ) to scena w głównym oknie Home (pseudo-3D: widok z przodu z góry, podłoga z głębią, świnka chodzi w x i y, skaluje się z głębią, y-sort). Sceny: `assets/data/place_scenes.json` (`bg`, `walk` [x0,y0,x1,y1], `depthScale`, wyjścia), moduł `web/home/features/places/{feature,scenes}.js`, płótno `web/home/canvas-pig.js` (API w logach `docs/opt/log/PK-P33a.md`, `PK-P34a.md`, `PK-P36a.md`).
- Test właściciela 7.11 (P31-P37 wdrożone): świnka chodzi przez fontannę i inne elementy tła; skala świnki do sceny jest zła; belka miejsc przycina scenę (drzewa w parku, domek na farmie nie widać); tła scen nie mają światła/ambientu (`lib/lights.js`, `assets/data/lights.json`), który jest w oknach ogrodu i farmy.

- Wiadomości mostka (fakty): pokój/ogród `room_place {place,itemId,x,y}`, `room_move {place,uid,x,y}`, `room_remove {place,uid}`, `room_flip {place,uid}`, `place_upgrade {id}`, `place_unlock {id}`; targ `market_quote/market_buy/market_sell {itemId,count}`, `market_stall`; farma `farm_plant {plot,cropId}`, `farm_water {plot}`, `farm_harvest {plot}`, `farm_harvest_all`, `farm_buy {what}`, `orchard_plant/orchard_harvest {slot}`; świnka `places.pigMove {pigId,to}`, `places.pigPin {pigId,pinned}`, `take_out`. Pole `place` to id sceny (`salon`, `pig:<id>`, `dorm`, `garden`, `park`, `farm`, `market`).
- Testy: Playwright przez `tools/qa/lib/ux.js` (helpery `openHome`, `openMore`, `openFromMore`), mock przeglądarkowy per funkcja (`features/<f>/mock.js`, `CuyScenesMock.state('seven')` daje 7 scen). Testy uruchamia `tools/qa/ux-all.js` (pliki `ux-pN-*.js`).

## Pliki i elementy (zweryfikowane w repo 8.11.2026; nie szukaj ich drugi raz)
- Line numbers below are from 8.11.2026, BEFORE waves P39 and P45. Find functions by name.
- `web/home/features/places/edit-panel.js`: from PK-P40a/b2/c (`CuyEdit`, selection, toolbar, capture-phase canvas listeners). Add a move drag for a picked thing. `web/home/canvas-pig.js` is read-only here: `pickAt`, `setGhost`, `setSelection`, `cellValid` (CELL API, cell = 16 px, see `docs/opt/log/PK-P40b.md`, `PK-P40c.md`).
- Messages (server contract `RoomsFeature.cs` ~385-410): `room_move {place,uid,x,y}` with x,y = INTEGER CELLS of the footprint top-left (same conversion as PK-P40b2: `cx = Math.round(px/16 - w/2)`), `room_remove {place,uid}`. Mock handlers in `web/home/features/rooms/mock.js` (~385-410) mutate `st.rooms.layouts[place].items`.
- Own cells: call `CanvasPig.cellValid(itemId,cx,cy,uid)` with the moved item's uid as 4th argument (PK-P40b adds `ignoreUid`; if its log says otherwise, follow the log).
- Drawer element `#editDrawer` (PK-P40a): hit test with `getBoundingClientRect()` of the drawer.

## Steps
1. Read `docs/opt/log/PK-P40b.md`, `PK-P40b2.md`, `PK-P40c.md`.
2. Tests FIRST, `tools/qa/ux-p40-edit-move-drag.js` (Playwright, mock, `page.mouse`): D1 `move-valid-sends-move` (one `room_move` with integer cells), D2 `move-invalid-returns` (no message, thing position unchanged, selection kept), D3 `drag-to-drawer-removes` (`room_remove`), D4 `ghost-while-moving` (`debug().ghost` set, cleared after), D5 `click-without-move-sends-nothing` (a click below the 6 px drag threshold only selects), D6 `move-onto-own-cells-valid` (small shift of a big item is valid).
3. Implement; item is hidden or dimmed while the ghost shows it; drop outside canvas and outside drawer cancels.
4. Run Weryfikacja; fix until green.

## Zasady grafiki i interfejsu (obowiązkowe)
- Legenda stylu: `docs/STYL_SWIATA.md` (czytaj pkt 0-2 i 5, ok. 60 linii) i paleta `assets/data/style_palette.json` (42 kolory). Zakaz kolorów spoza palety, zakaz `#ffffff` i `#000000`, zakaz gradientów CSS, rozmycia i cieni z blur. `image-rendering: pixelated`, skala tylko całkowita, pozycje w pełnych pikselach.
- Biblioteka pixel artów: najpierw szukaj gotowego w `assets/world/`, `assets/ui/`, `assets/icons/`, `assets/props/`. Nowy sprite tylko gdy go tam naprawdę nie ma: skrypt w `tools/art/` + `python3 tools/art/style_check.py --baseline docs/album/stylbook/lint_baseline.txt` bez nowych błędów.
- Interfejs jak reszta gry: drewniane ramki i 9-slice z `assets/ui/`, kolory `--ui-*`, czcionka `--ui-font`. Zakaz własnych SVG i glifów tekstowych (✕ ← →).

Prohibited: changing or deleting existing test assertions (poza wskazanymi w krokach), new dependencies, touching files outside "Zmieniaj", extra refactors.
Log: write `docs/opt/log/PK-P40c2.md` (max 10 lines: decisions, exact API/field names others will use, differences from the plan, BLOCKED reason if any). Do not run git.
