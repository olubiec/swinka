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
- Line numbers below are from 8.11.2026, BEFORE waves P39 and P45 (they edit `canvas-pig.js`, `scenes.js`, `places/feature.js`, `index.html`). Find every function by name with grep, never by line.
- `web/home/canvas-pig.js` (class around `CanvasPig.instance`, line ~341): `toScene(e)` (~662, pointer -> scene px, object-fit cover), `window.CuyRoom.addLayer(name,z,drawFn)` (~351, draw layers), `setThings(list)` (~421), `getOrderedThings()` (~565, flats first then standing sorted by y), `debug()` (~572: add `ghost` and `selection` fields), `drawThing(ctx, thing)` (~606), draw passes for flats/standing (~1049-1078). Wrappers: `CanvasPig`/`PigCanvas` object (~1596-1664) delegates to `inst` (`setScene`, `setThings`, `debug`): add the three new methods the same way (both `CanvasPig.x` and `PigCanvas.x`).
- A thing (built by `CuyScenes.placedThings`, `places/scenes.js` ~364-445) is `{id: uid, itemId, url, img, x, y, anchorX, anchorY, flat, flip}`: x = centre of footprint, y = BOTTOM of footprint (pixels). Layout cell = 16 px: pixel x = `cx*16 + w*8`, y = `(cy + h)*16`. Server `room_place` / `room_move` take INTEGER CELL coordinates `cx,cy` of the footprint top-left (`src/Cuy/dotNet/Features/RoomsFeature.cs` 350-390, validated 0..200 in `RoomsMessages.cs`), so the new API works in CELLS, not pixels.
- Footprint `w,h` (cells) and `layer` (`floor|wall|ground`): from `lastState.rooms.catalog[]` (same data the drawer uses, field `w`,`h`,`layer`, `repeatable`); fallback 1x1. Do NOT edit `scenes.js`. To draw the ghost sprite use `CuyScenes.placedThings({places:{layouts:{__ghost:{items:[{itemId,x:cx,y:cy}]}}}}, '__ghost')[0]` (it reads `state.places.layouts[sceneId]`), then draw it with `drawThing` under `globalAlpha`/checker mask.
- `pickAt(x,y)` pixel test: cache an offscreen canvas per `img` and read alpha with `getImageData`; if that throws (tainted) fall back to the sprite rect and say so in the log.
- Walk band `this.walk = [x0,y0,x1,y1]`, blockers/grid/`isFree`: from PK-P39c (read `docs/opt/log/PK-P39c.md`). Wave P45 (merged before this wave) changes scene size, depth scale and room geometry in `canvas-pig.js`/`scenes.js`: take size, `walk` and footprint from the live fields (`this.sceneWidth`, `this.walk`), no constants.

## Steps
1. Read `docs/opt/log/PK-P39c.md` (grid/blocker API, use it) and the newest `docs/opt/log/PK-P45*.md` that mention `canvas-pig.js` (only the 10 lines each).
2. Tests FIRST (`ux-p40-edit-engine.js`, Playwright, mock `seven`, call `CanvasPig` methods through `page.evaluate`): E1 `ghost-set-and-cleared` (`debug().ghost`), E2 `pickAt-topmost`, E3 `pickAt-transparent-pixel-null`, E4 `cell-valid-free`, E5 `cell-invalid-on-blocker` (garden fountain blocker from `place_scenes.json`), E6 `cell-invalid-overlap-standing` (and `ignoreUid` makes the same cell valid), E7 `flat-overlap-allowed`, E8 `cell-invalid-outside-walk`. Pick items from `state.rooms.catalog` of the mock, no hard-coded toy ids.
3. Implement `setGhost({itemId,cx,cy,valid}|null)` (50% checker dither of the sprite in the standing y-sort pass; palette red tint when `valid === false`; no CSS blur), `pickAt(x,y)` (x,y scene px, returns the `uid` string `thing.id` or null), `cellValid(itemId,cx,cy,ignoreUid)` (optional 4th arg: a placed thing's uid to ignore, needed by PK-P40c2 to move an item onto its own cells; footprint inside `walk` band, off blockers, not overlapping standing things; flat things may be overlapped; wall-layer items skip the walk-band test and only collide with other wall things, say so in the log). Max ~120 lines added.
4. Run Weryfikacja; fix until green. Log exact signatures.

## Zasady grafiki i interfejsu (obowiązkowe)
- Legenda stylu: `docs/STYL_SWIATA.md` (czytaj pkt 0-2 i 5, ok. 60 linii) i paleta `assets/data/style_palette.json` (42 kolory). Zakaz kolorów spoza palety, zakaz `#ffffff` i `#000000`, zakaz gradientów CSS, rozmycia i cieni z blur. `image-rendering: pixelated`, skala tylko całkowita, pozycje w pełnych pikselach.
- Biblioteka pixel artów: najpierw szukaj gotowego w `assets/world/`, `assets/ui/`, `assets/icons/`, `assets/props/`. Nowy sprite tylko gdy go tam naprawdę nie ma: skrypt w `tools/art/` + `python3 tools/art/style_check.py --baseline docs/album/stylbook/lint_baseline.txt` bez nowych błędów.
- Interfejs jak reszta gry: drewniane ramki i 9-slice z `assets/ui/`, kolory `--ui-*`, czcionka `--ui-font`. Zakaz własnych SVG i glifów tekstowych (✕ ← →).

Prohibited: changing or deleting existing test assertions, new dependencies, touching files outside "Zmieniaj", extra refactors, doing steps of other packages.
Log: write `docs/opt/log/PK-P40b.md` (max 10 lines: decisions, exact API/field/message names others will use, differences from the plan, BLOCKED reason if any). Do not run git.
