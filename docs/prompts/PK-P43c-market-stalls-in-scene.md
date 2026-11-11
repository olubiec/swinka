# PK-P43c: Market: stalls interact in the scene
Zmieniaj: web/home/features/market/feature.js, web/home/features/market/feature.css, tools/qa/ux-p43-market-scene.js, docs/opt/log/PK-P43c.md
Wymagane: tools/qa/ux-p43-market-scene.js
Weryfikacja: node --check web/home/features/market/feature.js && node --check tools/qa/ux-p43-market-scene.js && node tools/qa/ux-p43-market-scene.js
Pytania: nie zadawaj pytań i nie czekaj na odpowiedź. Jeśli czegoś brakuje lub coś jest niejasne, sam wybierz najrozsądniejsze rozwiązanie zgodne z AGENTS.md, zapisz decyzję w logu i dokończ do końca.
Limity (twarde): maks. 45 wywołań narzędzi. Linię Weryfikacja uruchom maks. 2 razy. Czytaj tylko pliki z Zmieniaj/Wymagane oraz zakresy linii znalezione przez grep. Nie diagnozuj niczego spoza Zmieniaj. Gdy test pada na czymś, czego Twoja zmiana nie dotyka: zapisz nazwę testu i 5 linii błędu w logu, status BLOCKED, zakończ. Po błędzie we własnym kodzie wolno jedna poprawka i jeden ponowny bieg, potem zakończ jako BLOCKED. Nie uruchamiaj web-smoke.js (robi to paczka q).
Nie ruszaj: AGENTS.md, docs/archive/, tasks/*, every file not listed in Zmieniaj
Goal: Clicking a stall on the market scene opens a small panel anchored to the stall for buying and selling; no separate market window.
Depends on: PK-P43b merged, PK-P46c merged (przesuwalne obiekty plenerowe).

## Kontekst (fakty, nie szukaj drugi raz)
- Docelowa wizja: każde miejsce (pokoje domku, ogród, park, farma, targ) to scena w głównym oknie Home (pseudo-3D: widok z przodu z góry, podłoga z głębią, świnka chodzi w x i y, skaluje się z głębią, y-sort). Sceny: `assets/data/place_scenes.json` (`bg`, `walk` [x0,y0,x1,y1], `depthScale`, wyjścia), moduł `web/home/features/places/{feature,scenes}.js`, płótno `web/home/canvas-pig.js` (API w logach `docs/opt/log/PK-P33a.md`, `PK-P34a.md`, `PK-P36a.md`).
- Test właściciela 7.11 (P31-P37 wdrożone): świnka chodzi przez fontannę i inne elementy tła; skala świnki do sceny jest zła; belka miejsc przycina scenę (drzewa w parku, domek na farmie nie widać); tła scen nie mają światła/ambientu (`lib/lights.js`, `assets/data/lights.json`), który jest w oknach ogrodu i farmy.

- Wiadomości mostka (fakty): pokój/ogród `room_place {place,itemId,x,y}`, `room_move {place,uid,x,y}`, `room_remove {place,uid}`, `room_flip {place,uid}`, `place_upgrade {id}`, `place_unlock {id}`; targ `market_quote/market_buy/market_sell {itemId,count}`, `market_stall`; farma `farm_plant {plot,cropId}`, `farm_water {plot}`, `farm_harvest {plot}`, `farm_harvest_all`, `farm_buy {what}`, `orchard_plant/orchard_harvest {slot}`; świnka `places.pigMove {pigId,to}`, `places.pigPin {pigId,pinned}`, `take_out`. Pole `place` to id sceny (`salon`, `pig:<id>`, `dorm`, `garden`, `park`, `farm`, `market`).
- Testy: Playwright przez `tools/qa/lib/ux.js` (helpery `openHome`, `openMore`, `openFromMore`), mock przeglądarkowy per funkcja (`features/<f>/mock.js`, `CuyScenesMock.state('seven')` daje 7 scen). Testy uruchamia `tools/qa/ux-all.js` (pliki `ux-pN-*.js`).

## Steps
1. Read `docs/opt/log/PK-P43a.md` (hotspot ids) and `PK-P43b.md` (API). grep in `market/feature.js` the render of goods, quote and buttons (lines ~100-260; messages in the context list below).
2. Refactor `market/feature.js` into a panel component `CuyMarket.openPanel(stallId, anchorRect)` that reuses the existing buy/sell/quote rendering and messages, shown as a floating wood panel (9-slice, library close X) positioned beside the stall and clamped inside the window; one panel at a time; Esc/X/click outside closes. Stall -> goods mapping: by hotspot `label`/id; `stall:own` shows the player's stall (`market_stall`). Register with `CanvasPig.onHotspot` when the scene is `market` (subscribe in the feature, not in canvas).
3. The old window entry (More tile) stays working until PK-P43f removes it; both must show the same data.
4. Tests FIRST, `tools/qa/ux-p43-market-scene.js` (Playwright, mock `seven` + market state): K1 `stall-click-opens-panel`, K2 `buy-sends-market_buy`, K3 `sell-sends-market_sell`, K4 `quote-updates-on-count`, K5 `panel-inside-window` (both viewports), K6 `one-panel-at-a-time`, K7 `esc-closes`, K8 `own-stall-sends-market_stall`, K9 `no-modal` (the panel is not a `.modal`).
5. Run Weryfikacja; fix until green.
## Zasady grafiki i interfejsu (obowiązkowe)
- Legenda stylu: `docs/STYL_SWIATA.md` (czytaj pkt 0-2 i 5, ok. 60 linii) i paleta `assets/data/style_palette.json` (42 kolory). Zakaz kolorów spoza palety, zakaz `#ffffff` i `#000000`, zakaz gradientów CSS, rozmycia i cieni z blur. `image-rendering: pixelated`, skala tylko całkowita, pozycje w pełnych pikselach.
- Biblioteka pixel artów: najpierw szukaj gotowego w `assets/world/`, `assets/ui/`, `assets/icons/`, `assets/props/`. Nowy sprite tylko gdy go tam naprawdę nie ma: skrypt w `tools/art/` + `python3 tools/art/style_check.py --baseline docs/album/stylbook/lint_baseline.txt` bez nowych błędów.
- Interfejs jak reszta gry: drewniane ramki i 9-slice z `assets/ui/`, kolory `--ui-*`, czcionka `--ui-font`. Zakaz własnych SVG i glifów tekstowych (✕ ← →).

## Poprawki po R1 (obowiązują, mają pierwszeństwo nad krokami wyżej)
- Mapowanie straganów: instancje `fx:market:stall_seeds` (seeds), `stall_pantry` (pantry), `stall_decor` (home/decor), `stall_own` (zakładka sprzedaży i ulepszenie market_stall). `CuyMarket.openPanel(category, anchorRect)` otwiera panel 9-slice zakotwiczony przy straganie; po przesunięciu straganu w Edit kotwica podąża za instancją.
- Nazwy plików straganów mogą się zmienić po dostawie D2 (`stall_veg/fruit/seeds`); do tego czasu zostają `stall_basic/big`.

Prohibited: changing or deleting existing test assertions (poza wskazanymi w krokach), new dependencies, touching files outside "Zmieniaj", extra refactors.
Log: write `docs/opt/log/PK-P43c.md` (max 10 lines: decisions, exact API/field names others will use, differences from the plan, BLOCKED reason if any). Do not run git.
