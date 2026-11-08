# PK-P40c: Edit mode: select, toolbar, flip and remove
Zmieniaj: web/home/features/places/edit-panel.js, web/home/canvas-pig.js, tools/qa/ux-p40-edit-move.js, docs/opt/log/PK-P40c.md
Wymagane: tools/qa/ux-p40-edit-move.js
Weryfikacja: node --check web/home/features/places/edit-panel.js && node --check web/home/canvas-pig.js && node --check tools/qa/ux-p40-edit-move.js && node tools/qa/ux-p40-edit-move.js
Pytania: nie zadawaj pytań i nie czekaj na odpowiedź. Jeśli czegoś brakuje lub coś jest niejasne, sam wybierz najrozsądniejsze rozwiązanie zgodne z AGENTS.md, zapisz decyzję w logu i dokończ do końca.
Limity (twarde): maks. 45 wywołań narzędzi. Linię Weryfikacja uruchom maks. 2 razy. Czytaj tylko pliki z Zmieniaj/Wymagane oraz zakresy linii znalezione przez grep. Nie diagnozuj niczego spoza Zmieniaj. Gdy test pada na czymś, czego Twoja zmiana nie dotyka: zapisz nazwę testu i 5 linii błędu w logu, status BLOCKED, zakończ. Po błędzie we własnym kodzie wolno jedna poprawka i jeden ponowny bieg, potem zakończ jako BLOCKED. Nie uruchamiaj web-smoke.js (robi to paczka q).
Nie ruszaj: AGENTS.md, docs/archive/, tasks/*, every file not listed in Zmieniaj
Goal: In edit mode a placed item can be selected (outline), flipped and removed with a small toolbar or Delete. Moving by drag comes in PK-P40c2.
Depends on: PK-P40b2 merged.

## Kontekst (fakty, nie szukaj drugi raz)
- Docelowa wizja: każde miejsce (pokoje domku, ogród, park, farma, targ) to scena w głównym oknie Home (pseudo-3D: widok z przodu z góry, podłoga z głębią, świnka chodzi w x i y, skaluje się z głębią, y-sort). Sceny: `assets/data/place_scenes.json` (`bg`, `walk` [x0,y0,x1,y1], `depthScale`, wyjścia), moduł `web/home/features/places/{feature,scenes}.js`, płótno `web/home/canvas-pig.js` (API w logach `docs/opt/log/PK-P33a.md`, `PK-P34a.md`, `PK-P36a.md`).
- Test właściciela 7.11 (P31-P37 wdrożone): świnka chodzi przez fontannę i inne elementy tła; skala świnki do sceny jest zła; belka miejsc przycina scenę (drzewa w parku, domek na farmie nie widać); tła scen nie mają światła/ambientu (`lib/lights.js`, `assets/data/lights.json`), który jest w oknach ogrodu i farmy.

- Wiadomości mostka (fakty): pokój/ogród `room_place {place,itemId,x,y}`, `room_move {place,uid,x,y}`, `room_remove {place,uid}`, `room_flip {place,uid}`, `place_upgrade {id}`, `place_unlock {id}`; targ `market_quote/market_buy/market_sell {itemId,count}`, `market_stall`; farma `farm_plant {plot,cropId}`, `farm_water {plot}`, `farm_harvest {plot}`, `farm_harvest_all`, `farm_buy {what}`, `orchard_plant/orchard_harvest {slot}`; świnka `places.pigMove {pigId,to}`, `places.pigPin {pigId,pinned}`, `take_out`. Pole `place` to id sceny (`salon`, `pig:<id>`, `dorm`, `garden`, `park`, `farm`, `market`).
- Testy: Playwright przez `tools/qa/lib/ux.js` (helpery `openHome`, `openMore`, `openFromMore`), mock przeglądarkowy per funkcja (`features/<f>/mock.js`, `CuyScenesMock.state('seven')` daje 7 scen). Testy uruchamia `tools/qa/ux-all.js` (pliki `ux-pN-*.js`).

## Pliki i elementy (zweryfikowane w repo 8.11.2026; nie szukaj ich drugi raz)
- Line numbers below are from 8.11.2026, BEFORE waves P39 and P45 (they edit `canvas-pig.js`, `scenes.js`, `places/feature.js`, `index.html`). Find every function by name with grep, never by line.
- `web/home/features/places/edit-panel.js`: from PK-P40a/PK-P40b2 (`CuyEdit`, drag code). Add selection, floating toolbar (`#editToolbar`, buttons `.edit-tool-flip`, `.edit-tool-remove`), Delete/Backspace and Esc keys.
- `web/home/canvas-pig.js`: the ONLY allowed edit is `setSelection(uid|null)` (max 25 lines; 1 px palette outline around the sprite rect; add `selection` (uid or null) to `debug()` next to `ghost` from PK-P40b; delegate in the wrappers like `setGhost`). `pickAt`, `setGhost`, `cellValid` come from PK-P40b (cell API, see its log).
- Things carry `id` = layout item `uid` (`scenes.js` `placedThings`: `id: it.uid || ...`) and `itemId`; the toolbar position comes from the picked thing's `x`, `y`, `anchorX`, `anchorY` in scene px, converted to CSS px with `CanvasPig.instance.toScene` inverse (rect and cover scale as in `toScene`).
- Edit mode must swallow canvas input: in edit mode (`CuyEdit.isOpen()`), attach `pointerdown` and `click` listeners to `#pigCanvas` in the CAPTURE phase and call `stopImmediatePropagation()` so the pig is not petted or dragged (pig drag lives in `canvas-pig.js` `bindEvents`, ~675-730). Outside edit mode do nothing.
- Icons: `assets/icons/icons.json` has `flip` (146) and `trash` (147): use the library icon resolver (same as other features' pixel icons), not glyphs.
- Messages (server contract `RoomsFeature.cs`): `room_flip {place,uid}`, `room_remove {place,uid}` (mock handlers in `rooms/mock.js` ~397-410).

## Steps
1. Read `docs/opt/log/PK-P40b.md` and `PK-P40b2.md` for `pickAt`, `setGhost`, `cellValid`, `CuyEdit`.
2. Tests FIRST, `tools/qa/ux-p40-edit-move.js` (Playwright, mock; keep the file for PK-P40c2 to extend): M1 `select-shows-toolbar` (click a placed item in edit mode: `debug().selection` is its uid, toolbar visible), M2 `flip-sends` (`room_flip`), M3 `remove-button-sends` (`room_remove`), M4 `delete-key-removes`, M5 `esc-deselects` (selection null, toolbar hidden), M6 `only-in-edit-mode` (outside edit mode clicking an item does not select it), M7 `click-empty-deselects`, M8 `pig-not-petted-in-edit-mode`.
3. Implement `setSelection` in `canvas-pig.js` and selection/toolbar/keys in `edit-panel.js`.
4. Run Weryfikacja; fix until green. Moving and drag-to-drawer are done in PK-P40c2, not here.

## Zasady grafiki i interfejsu (obowiązkowe)
- Legenda stylu: `docs/STYL_SWIATA.md` (czytaj pkt 0-2 i 5, ok. 60 linii) i paleta `assets/data/style_palette.json` (42 kolory). Zakaz kolorów spoza palety, zakaz `#ffffff` i `#000000`, zakaz gradientów CSS, rozmycia i cieni z blur. `image-rendering: pixelated`, skala tylko całkowita, pozycje w pełnych pikselach.
- Biblioteka pixel artów: najpierw szukaj gotowego w `assets/world/`, `assets/ui/`, `assets/icons/`, `assets/props/`. Nowy sprite tylko gdy go tam naprawdę nie ma: skrypt w `tools/art/` + `python3 tools/art/style_check.py --baseline docs/album/stylbook/lint_baseline.txt` bez nowych błędów.
- Interfejs jak reszta gry: drewniane ramki i 9-slice z `assets/ui/`, kolory `--ui-*`, czcionka `--ui-font`. Zakaz własnych SVG i glifów tekstowych (✕ ← →).

Prohibited: changing or deleting existing test assertions (poza wskazanymi w krokach), new dependencies, touching files outside "Zmieniaj", extra refactors.
Log: write `docs/opt/log/PK-P40c.md` (max 10 lines: decisions, exact API/field names others will use, differences from the plan, BLOCKED reason if any). Do not run git.
