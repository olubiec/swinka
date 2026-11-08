# PK-P40b: Edit mode: canvas ghost, pick and cell check
Zmieniaj: web/home/canvas-pig.js, tools/qa/ux-p40-edit-engine.js, docs/opt/log/PK-P40b.md
Wymagane: tools/qa/ux-p40-edit-engine.js
Weryfikacja: node --check web/home/canvas-pig.js && node --check tools/qa/ux-p40-edit-engine.js && node tools/qa/ux-p40-edit-engine.js
Pytania: nie zadawaj pytań i nie czekaj na odpowiedź. Jeśli czegoś brakuje lub coś jest niejasne, sam wybierz najrozsądniejsze rozwiązanie zgodne z AGENTS.md, zapisz decyzję w logu i dokończ do końca.
Limity (twarde): maks. 40 wywołań narzędzi. Linię Weryfikacja uruchom maks. 2 razy. Czytaj tylko pliki z Zmieniaj/Wymagane oraz zakresy linii znalezione przez grep. Nie diagnozuj niczego spoza Zmieniaj. Gdy test pada na czymś, czego Twoja zmiana nie dotyka: zapisz nazwę testu i 5 linii błędu w logu, status BLOCKED, zakończ. Po błędzie we własnym kodzie wolno jedna poprawka i jeden ponowny bieg, potem zakończ jako BLOCKED. Nie uruchamiaj web-smoke.js (robi to paczka q).
Nie ruszaj: AGENTS.md, docs/archive/, tasks/*, every file not listed in Zmieniaj
Goal: Canvas API for edit mode: `setGhost`, `pickAt`, `cellValid`. No UI, no messages.
Depends on: PK-P39c merged (blockers, walk grid, `isFree`; see docs/opt/log/PK-P39c.md).

## Kontekst (fakty, nie szukaj drugi raz)
- Docelowa wizja: każde miejsce (pokoje domku, ogród, park, farma, targ) to scena w głównym oknie Home (pseudo-3D: widok z przodu z góry, podłoga z głębią, świnka chodzi w x i y, skaluje się z głębią, y-sort). Sceny: `assets/data/place_scenes.json` (`bg`, `walk` [x0,y0,x1,y1], `depthScale`, wyjścia), moduł `web/home/features/places/{feature,scenes}.js`, płótno `web/home/canvas-pig.js` (API w logach `docs/opt/log/PK-P33a.md`, `PK-P34a.md`, `PK-P36a.md`).
- Test właściciela 7.11 (P31-P37 wdrożone): świnka chodzi przez fontannę i inne elementy tła; skala świnki do sceny jest zła; belka miejsc przycina scenę (drzewa w parku, domek na farmie nie widać); tła scen nie mają światła/ambientu (`lib/lights.js`, `assets/data/lights.json`), który jest w oknach ogrodu i farmy.

- Wiadomości mostka (fakty): pokój/ogród `room_place {place,itemId,x,y}`, `room_move {place,uid,x,y}`, `room_remove {place,uid}`, `room_flip {place,uid}`, `place_upgrade {id}`, `place_unlock {id}`; targ `market_quote/market_buy/market_sell {itemId,count}`, `market_stall`; farma `farm_plant {plot,cropId}`, `farm_water {plot}`, `farm_harvest {plot}`, `farm_harvest_all`, `farm_buy {what}`, `orchard_plant/orchard_harvest {slot}`; świnka `places.pigMove {pigId,to}`, `places.pigPin {pigId,pinned}`, `take_out`. Pole `place` to id sceny (`salon`, `pig:<id>`, `dorm`, `garden`, `park`, `farm`, `market`).
- Testy: Playwright przez `tools/qa/lib/ux.js` (helpery `openHome`, `openMore`, `openFromMore`), mock przeglądarkowy per funkcja (`features/<f>/mock.js`, `CuyScenesMock.state('seven')` daje 7 scen). Testy uruchamia `tools/qa/ux-all.js` (pliki `ux-pN-*.js`).


## Pliki i elementy (zweryfikowane w repo 8.11.2026; nie szukaj ich drugi raz)
- `web/home/canvas-pig.js`: `toScene(e)` (line 662, pointer -> scene coords), `addLayer(name,z,drawFn)` (line 351, draw layers), `setThings`, `getOrderedThings()` (y-sorted, used by `debug()` line 572), `things` entries with `{id,x,y,flat,...}`; `debug()` (572) returns the render list: add `ghost` and `selection` fields there. Add to the `CanvasPig`/`PigCanvas` wrappers (lines ~1596-1664) the same way `setScene`/`debug` are delegated.
- `API to add`: `setGhost({itemId,x,y,valid}|null)` - 50% checker dither sprite in the standing layer, palette red tint when invalid; `pickAt(x,y)` -> topmost thing under the point by sprite rect ignoring transparent pixels, else null; `cellValid(itemId,x,y)` -> footprint inside `walk` band, off blockers, not overlapping standing things (flat may overlap), uses the P39c grid.
- `assets/data/world_items.json`: `items[]` with `w`,`h` (cells), `layer` (`ground|floor|wall`), `place` (`house|garden|park|farm`): footprint source.

## Steps
1. Read `docs/opt/log/PK-P39c.md` for the grid/blocker API and use it.
2. Tests FIRST (`ux-p40-edit-engine.js`, Playwright, mock `seven`): E1 `ghost-set-and-cleared` (`debug().ghost`), E2 `pickAt-topmost`, E3 `pickAt-transparent-pixel-null`, E4 `cell-valid-free`, E5 `cell-invalid-on-blocker` (garden fountain), E6 `cell-invalid-overlap-standing`, E7 `flat-overlap-allowed`, E8 `cell-invalid-outside-walk`.
3. Implement the three methods + wrappers; max ~120 lines added.
4. Run Weryfikacja; fix until green. Log exact signatures.
## Zasady grafiki i interfejsu (obowiązkowe)
- Legenda stylu: `docs/STYL_SWIATA.md` (czytaj pkt 0-2 i 5, ok. 60 linii) i paleta `assets/data/style_palette.json` (42 kolory). Zakaz kolorów spoza palety, zakaz `#ffffff` i `#000000`, zakaz gradientów CSS, rozmycia i cieni z blur. `image-rendering: pixelated`, skala tylko całkowita, pozycje w pełnych pikselach.
- Biblioteka pixel artów: najpierw szukaj gotowego w `assets/world/`, `assets/ui/`, `assets/icons/`, `assets/props/`. Nowy sprite tylko gdy go tam naprawdę nie ma: skrypt w `tools/art/` + `python3 tools/art/style_check.py --baseline docs/album/stylbook/lint_baseline.txt` bez nowych błędów.
- Interfejs jak reszta gry: drewniane ramki i 9-slice z `assets/ui/`, kolory `--ui-*`, czcionka `--ui-font`. Zakaz własnych SVG i glifów tekstowych (✕ ← →).

Prohibited: changing or deleting existing test assertions, new dependencies, touching files outside "Zmieniaj", extra refactors, doing steps of other packages.
Log: write `docs/opt/log/PK-P40b.md` (max 10 lines: decisions, exact API/field/message names others will use, differences from the plan, BLOCKED reason if any). Do not run git.
