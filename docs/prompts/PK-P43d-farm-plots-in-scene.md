# PK-P43d: Farm: plots interact in the scene
Zmieniaj: web/home/features/farm/feature.js, web/home/features/farm/feature.css, tools/qa/ux-p43-farm-scene.js, docs/opt/log/PK-P43d.md
Wymagane: tools/qa/ux-p43-farm-scene.js
Weryfikacja: node --check web/home/features/farm/feature.js && node --check tools/qa/ux-p43-farm-scene.js && node tools/qa/ux-p43-farm-scene.js
Pytania: nie zadawaj pytań i nie czekaj na odpowiedź. Jeśli czegoś brakuje lub coś jest niejasne, sam wybierz najrozsądniejsze rozwiązanie zgodne z AGENTS.md, zapisz decyzję w logu i dokończ do końca.
Limity (twarde): maks. 45 wywołań narzędzi. Linię Weryfikacja uruchom maks. 2 razy. Czytaj tylko pliki z Zmieniaj/Wymagane oraz zakresy linii znalezione przez grep. Nie diagnozuj niczego spoza Zmieniaj. Gdy test pada na czymś, czego Twoja zmiana nie dotyka: zapisz nazwę testu i 5 linii błędu w logu, status BLOCKED, zakończ. Po błędzie we własnym kodzie wolno jedna poprawka i jeden ponowny bieg, potem zakończ jako BLOCKED. Nie uruchamiaj web-smoke.js (robi to paczka q).
Nie ruszaj: AGENTS.md, docs/archive/, tasks/*, every file not listed in Zmieniaj
Goal: Clicking a plot on the farm scene plants, waters or harvests it directly; orchard slots and the shop work through small panels; no separate farm window.
Depends on: pliki badawcze F2-1: `docs/opt/foundations/R30.md` sekcja 4 i sekcja 3 (kontrakt `lib/hotspots.js`), `R43.md` sekcje 3-5. Silnik hotspotów (PK-P43ab) i `CanvasPig.onHotspot` (PK-CV2) powstają RÓWNOLEGLE lub później: w testach używaj atrapy.

## Praca równoległa (obowiązkowe)
Ta paczka startuje w tym samym kroku co kilkanaście innych paczek, a każda edytuje inne pliki. Nie czekaj na nie i nie czytaj ich testów ani logów. Stan kodu to `main` z początku kroku: API innych paczek tego kroku jeszcze nie istnieje. Dane testowe buduj we WŁASNYM pliku testu; API rodzeństwa bierz z kontraktu w pliku badawczym wskazanym w "Czytaj" i w testach zastępuj atrapą (komunikat `STUB <nazwa>`). Plików sklejających (`index.html`, `app.js`, `features/index.json`, `canvas-pig.js`, `places/feature.js`, `edit-panel.js`) nie edytujesz, jeśli nie ma ich w Zmieniaj: wpina je krok F2-4. Gdy "Prompt fixes" w pliku badawczym przeczą krokom tego promptu, wygrywa plik badawczy; różnicę zapisz w logu.


## Kontekst (fakty, nie szukaj drugi raz)
- Docelowa wizja: każde miejsce (pokoje domku, ogród, park, farma, targ) to scena w głównym oknie Home (pseudo-3D: widok z przodu z góry, podłoga z głębią, świnka chodzi w x i y, skaluje się z głębią, y-sort). Sceny: `assets/data/place_scenes.json` (`bg`, `walk` [x0,y0,x1,y1], `depthScale`, wyjścia), moduł `web/home/features/places/{feature,scenes}.js`, płótno `web/home/canvas-pig.js` (API w logach `docs/opt/log/PK-P33a.md`, `PK-P34a.md`, `PK-P36a.md`).
- Test właściciela 7.11 (P31-P37 wdrożone): świnka chodzi przez fontannę i inne elementy tła; skala świnki do sceny jest zła; belka miejsc przycina scenę (drzewa w parku, domek na farmie nie widać); tła scen nie mają światła/ambientu (`lib/lights.js`, `assets/data/lights.json`), który jest w oknach ogrodu i farmy.

- Wiadomości mostka (fakty): pokój/ogród `room_place {place,itemId,x,y}`, `room_move {place,uid,x,y}`, `room_remove {place,uid}`, `room_flip {place,uid}`, `place_upgrade {id}`, `place_unlock {id}`; targ `market_quote/market_buy/market_sell {itemId,count}`, `market_stall`; farma `farm_plant {plot,cropId}`, `farm_water {plot}`, `farm_harvest {plot}`, `farm_harvest_all`, `farm_buy {what}`, `orchard_plant/orchard_harvest {slot}`; świnka `places.pigMove {pigId,to}`, `places.pigPin {pigId,pinned}`, `take_out`. Pole `place` to id sceny (`salon`, `pig:<id>`, `dorm`, `garden`, `park`, `farm`, `market`).
- Testy: Playwright przez `tools/qa/lib/ux.js` (helpery `openHome`, `openMore`, `openFromMore`), mock przeglądarkowy per funkcja (`features/<f>/mock.js`, `CuyScenesMock.state('seven')` daje 7 scen). Testy uruchamia `tools/qa/ux-all.js` (pliki `ux-pN-*.js`).

## Poprawki 17.11 (praca równoległa)
- `CanvasPig.onHotspot` i `CuyHotspots` jeszcze nie istnieją: w teście zastąp je atrapą (`window.CanvasPig = window.CanvasPig || {}; CanvasPig.onHotspot = fn => handlers.push(fn);`, wywołanie `handlers.forEach(h => h({id, kind, rect}))`) i drukuj `STUB onHotspot`. Rejestracja w kodzie: `if (window.CanvasPig && CanvasPig.onHotspot) CanvasPig.onHotspot(fn)`.
- Przesuwalność obiektu w Edit (PK-P46c/PK-PE2) testuje PK-T3; tu panel dostaje kotwicę z `rect` hotspotu.

## Steps
1. Read `docs/opt/foundations/R30.md` sections 3-4 (contract; the hotspot module and the canvas API are not merged yet). grep in `farm/feature.js` lines ~140-280: plot render (`watered`, `ready`, `crop`), `farm_plant/water/harvest`, orchard, shop, `place_unlock`.
2. Plot click logic (state-based): empty plot -> small crop menu panel anchored at the plot (`farm_plant {plot,cropId}`); planted not watered -> `farm_water {plot}` immediately; ready -> `farm_harvest {plot}`; growing and watered -> small tooltip with time left. Plot visuals (`canvas-pig.js` is not in this package): render plot state as DOM markers (library icons: water drop when dry, basket when ready) positioned over the hotspot rect with `pointer-events:none`.
3. Buttons for bulk actions (`farm_harvest_all`, water all) as two small library buttons in a strip under the scene bar visible only on the farm. Orchard slot hotspots -> `orchard_plant/orchard_harvest`; `shop` hotspot -> panel with `farm_buy` items.
4. Old farm window entry stays until PK-APP2 removes it (F2-4); same data.
5. Tests FIRST, `tools/qa/ux-p43-farm-scene.js` (Playwright, mock farm state): F1 `empty-plot-menu-plants` (`farm_plant` with the picked crop), F2 `dry-plot-click-waters`, F3 `ready-plot-click-harvests`, F4 `growing-tooltip`, F5 `markers-follow-state` (drop icon when dry, basket when ready, none when empty), F6 `harvest-all-and-water-all`, F7 `orchard-slot-actions`, F8 `shop-buy`, F9 `panels-inside-window`.
6. Run Weryfikacja; fix until green.
## Zasady grafiki i interfejsu (obowiązkowe)
- Legenda stylu: `docs/STYL_SWIATA.md` (czytaj pkt 0-2 i 5, ok. 60 linii) i paleta `assets/data/style_palette.json` (42 kolory). Zakaz kolorów spoza palety, zakaz `#ffffff` i `#000000`, zakaz gradientów CSS, rozmycia i cieni z blur. `image-rendering: pixelated`, skala tylko całkowita, pozycje w pełnych pikselach.
- Biblioteka pixel artów: najpierw szukaj gotowego w `assets/world/`, `assets/ui/`, `assets/icons/`, `assets/props/`. Nowy sprite tylko gdy go tam naprawdę nie ma: skrypt w `tools/art/` + `python3 tools/art/style_check.py --baseline docs/album/stylbook/lint_baseline.txt` bez nowych błędów.
- Interfejs jak reszta gry: drewniane ramki i 9-slice z `assets/ui/`, kolory `--ui-*`, czcionka `--ui-font`. Zakaz własnych SVG i glifów tekstowych (✕ ← →).

## Poprawki po R1 (obowiązują, mają pierwszeństwo nad krokami wyżej)
- Stan grządek rysuj przez `CanvasPig.addLayer('farm_markers', 60, drawFn)` w prostokątach z `CanvasPig.getHotspots()` (nie jako DOM). Grządka `fx:farm:plot:<i>` odpowiada `FarmState.Plots[i]` (1:1).
- Klik w grządkę: pusta -> `farm_plant`, sucha -> `farm_water`, dojrzała -> `farm_harvest`. Po przesunięciu grządki w Edit uprawy i stan zostają.

Prohibited: changing or deleting existing test assertions (poza wskazanymi w krokach), new dependencies, touching files outside "Zmieniaj", extra refactors.
Log: write `docs/opt/log/PK-P43d.md` (max 10 lines: decisions, exact API/field names others will use, differences from the plan, BLOCKED reason if any). Do not run git.
