# PK-P43d: Farm: plots interact in the scene
Zmieniaj: web/home/features/farm/feature.js, web/home/features/farm/feature.css, tools/qa/ux-p43-farm-scene.js, docs/opt/log/PK-P43d.md
Wymagane: tools/qa/ux-p43-farm-scene.js
Weryfikacja: node --check web/home/features/farm/feature.js && node --check tools/qa/ux-p43-farm-scene.js && node tools/qa/ux-p43-farm-scene.js
Pytania: nie zadawaj pytań i nie czekaj na odpowiedź. Jeśli czegoś brakuje lub coś jest niejasne, sam wybierz najrozsądniejsze rozwiązanie zgodne z AGENTS.md, zapisz decyzję w logu i dokończ do końca.
Limity (twarde): maks. 40 wywołań narzędzi. Linię Weryfikacja uruchom maks. 2 razy. Czytaj tylko pliki z Zmieniaj/Wymagane oraz zakresy linii znalezione przez grep. Nie diagnozuj niczego spoza Zmieniaj. Gdy test pada na czymś, czego Twoja zmiana nie dotyka: zapisz nazwę testu i 5 linii błędu w logu, status BLOCKED, zakończ. Po błędzie we własnym kodzie wolno jedna poprawka i jeden ponowny bieg, potem zakończ jako BLOCKED. Nie uruchamiaj web-smoke.js (robi to paczka q).
Nie ruszaj: AGENTS.md, docs/archive/, tasks/*, every file not listed in Zmieniaj
Goal: Clicking a plot hotspot on the farm scene plants, waters or harvests it; plot state shown as DOM markers. Orchard, shop and bulk buttons are PK-P43g.
Depends on: PK-P43a and PK-P43b merged.

## Kontekst (fakty, nie szukaj drugi raz)
- Docelowa wizja: każde miejsce (pokoje domku, ogród, park, farma, targ) to scena w głównym oknie Home (pseudo-3D: widok z przodu z góry, podłoga z głębią, świnka chodzi w x i y, skaluje się z głębią, y-sort). Sceny: `assets/data/place_scenes.json` (`bg`, `walk` [x0,y0,x1,y1], `depthScale`, wyjścia), moduł `web/home/features/places/{feature,scenes}.js`, płótno `web/home/canvas-pig.js` (API w logach `docs/opt/log/PK-P33a.md`, `PK-P34a.md`, `PK-P36a.md`).
- Test właściciela 7.11 (P31-P37 wdrożone): świnka chodzi przez fontannę i inne elementy tła; skala świnki do sceny jest zła; belka miejsc przycina scenę (drzewa w parku, domek na farmie nie widać); tła scen nie mają światła/ambientu (`lib/lights.js`, `assets/data/lights.json`), który jest w oknach ogrodu i farmy.

- Wiadomości mostka (fakty): pokój/ogród `room_place {place,itemId,x,y}`, `room_move {place,uid,x,y}`, `room_remove {place,uid}`, `room_flip {place,uid}`, `place_upgrade {id}`, `place_unlock {id}`; targ `market_quote/market_buy/market_sell {itemId,count}`, `market_stall`; farma `farm_plant {plot,cropId}`, `farm_water {plot}`, `farm_harvest {plot}`, `farm_harvest_all`, `farm_buy {what}`, `orchard_plant/orchard_harvest {slot}`; świnka `places.pigMove {pigId,to}`, `places.pigPin {pigId,pinned}`, `take_out`. Pole `place` to id sceny (`salon`, `pig:<id>`, `dorm`, `garden`, `park`, `farm`, `market`).
- Testy: Playwright przez `tools/qa/lib/ux.js` (helpery `openHome`, `openMore`, `openFromMore`), mock przeglądarkowy per funkcja (`features/<f>/mock.js`, `CuyScenesMock.state('seven')` daje 7 scen). Testy uruchamia `tools/qa/ux-all.js` (pliki `ux-pN-*.js`).


## Pliki i elementy (zweryfikowane w repo 8.11.2026; nie szukaj ich drugi raz)
- `web/home/features/farm/feature.js`: 345 lines. `render()` (122), `drawPlot(canvas,plot,crop)` (60), `cropOf` (85), `plotLabel` (89), `fmt(sec)` (96), `tick()` (104), `send(msg)` (120). Messages already at lines 242 (`farm_water`), 244 (`farm_harvest`), 251 (`farm_plant {plot, cropId}`); plot state fields `watered`, `ready`, `crop`. Subscribe to `CanvasPig.onHotspot` (PK-P43b) for ids `plot:<n>` when the scene is `farm`.
- `assets/data/place_scenes.json`: hotspot ids `plot:0..N-1`, `orchard:*`, `shop` (PK-P43a log).
- `markers`: DOM `<img>` from the icon library (water drop, basket), `pointer-events:none`, positioned over the hotspot rect; remove on scene change.

## Steps
1. Read PK-P43a/PK-P43b logs.
2. Click logic by state: empty -> crop menu panel anchored at the plot (`farm_plant {plot,cropId}`); planted+dry -> `farm_water {plot}`; ready -> `farm_harvest {plot}`; growing+watered -> tooltip with time left (`fmt`).
3. Tests FIRST (`ux-p43-farm-scene.js`): F1 `empty-plot-menu-plants`, F2 `dry-plot-click-waters`, F3 `ready-plot-click-harvests`, F4 `growing-tooltip`, F5 `markers-follow-state`, F6 `panels-inside-window`.
4. Old farm window stays until PK-P43f; both show the same data.
5. Run Weryfikacja; fix until green.
## Zasady grafiki i interfejsu (obowiązkowe)
- Legenda stylu: `docs/STYL_SWIATA.md` (czytaj pkt 0-2 i 5, ok. 60 linii) i paleta `assets/data/style_palette.json` (42 kolory). Zakaz kolorów spoza palety, zakaz `#ffffff` i `#000000`, zakaz gradientów CSS, rozmycia i cieni z blur. `image-rendering: pixelated`, skala tylko całkowita, pozycje w pełnych pikselach.
- Biblioteka pixel artów: najpierw szukaj gotowego w `assets/world/`, `assets/ui/`, `assets/icons/`, `assets/props/`. Nowy sprite tylko gdy go tam naprawdę nie ma: skrypt w `tools/art/` + `python3 tools/art/style_check.py --baseline docs/album/stylbook/lint_baseline.txt` bez nowych błędów.
- Interfejs jak reszta gry: drewniane ramki i 9-slice z `assets/ui/`, kolory `--ui-*`, czcionka `--ui-font`. Zakaz własnych SVG i glifów tekstowych (✕ ← →).

Prohibited: changing or deleting existing test assertions, new dependencies, touching files outside "Zmieniaj", extra refactors, doing steps of other packages.
Log: write `docs/opt/log/PK-P43d.md` (max 10 lines: decisions, exact API/field/message names others will use, differences from the plan, BLOCKED reason if any). Do not run git.
