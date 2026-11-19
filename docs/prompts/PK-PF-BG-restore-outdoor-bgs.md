# PK-PF-BG: Restore outdoor background scenery (market string lights & posters, farm horizon fence, garden gate & horizon trees, park gazebo & bridge)
Zmieniaj: tools/art/world/market_bg.py, tools/art/world/farm_bg.py, tools/art/world/garden_bg.py, tools/art/world/park_bg.py, assets/world/bg/market_day.png, assets/world/bg/market_morning.png, assets/world/bg/market_evening.png, assets/world/bg/market_night.png, assets/world/bg/farm_day.png, assets/world/bg/farm_morning.png, assets/world/bg/farm_evening.png, assets/world/bg/farm_night.png, assets/world/bg/garden_day.png, assets/world/bg/garden_morning.png, assets/world/bg/garden_evening.png, assets/world/bg/garden_night.png, assets/world/bg/park_day.png, assets/world/bg/park_morning.png, assets/world/bg/park_evening.png, assets/world/bg/park_night.png, docs/opt/log/PK-PF-BG.md
Weryfikacja: python tools/art/world/market_bg.py && python tools/art/world/farm_bg.py && python tools/art/world/garden_bg.py && python tools/art/world/park_bg.py && node tools/qa/ux-p47-bg.js && node tools/qa/check-assets.js
Pytania: nie zadawaj pytań i nie czekaj na odpowiedź. Jeśli czegoś brakuje lub coś jest niejasne, sam wybierz najrozsądniejsze rozwiązanie zgodne z AGENTS.md, zapisz decyzję w logu i dokończ do końca.
Limity (twarde): maks. 30 wywołań narzędzi. Linię Weryfikacja uruchom maks. 2 razy. Czytaj tylko pliki z Zmieniaj oraz pliki z sekcji "Czytaj tylko". Nie uruchamiaj git.
Nie ruszaj: AGENTS.md, docs/archive/, tasks/*, every file not listed in Zmieniaj
Goal: Restore the rich background scenery stripped in `PK-P47a` (`BULBS` string lights and wall posters behind market stalls, horizon wooden fence on the farm, central garden gate and far horizon trees in the garden, far-bank gazebo, trees and stream bridge in the park) without painting movable foreground instances or breaking `tools/qa/ux-p47-bg.js`.

Depends on: `docs/opt/foundations/RF3.md`. Biegnie w kroku F2F-2 równolegle z 6 innymi paczkami.

Produces (names other packages rely on): Updated `tools/art/world/{market_bg,farm_bg,garden_bg,park_bg}.py` and regenerated `assets/world/bg/{market,farm,garden,park}_{day,morning,evening,night}.png`.

## Czytaj tylko (zakaz czytania innych plików)
- `docs/opt/foundations/RF3.md`
- `tools/art/world/market_bg.py`
- `tools/art/world/farm_bg.py`
- `tools/art/world/garden_bg.py`
- `tools/art/world/park_bg.py`
- `tools/qa/ux-p47-bg.js`

## Nie czytaj
Wszystkich pozostałych plików w repozytorium.

## Steps
1. Przeczytaj `docs/opt/foundations/RF3.md` oraz `tools/qa/ux-p47-bg.js` (sprawdź współrzędne prostokątów testowanych w `ux-p47-bg.js`, żeby żaden przywrócony detal tła nie wchodził w prostokąty zarezerwowane wyłącznie dla ruchomych instancji).
2. W `tools/art/world/market_bg.py`:
   - Przywróć sznur wiszących lampek `BULBS = [(x, 56 + int(3 * math.sin((x - 16) / 72.0 * math.pi))) for x in range(16, 241, 14)]` (lub na wysokości `y = 48..54` nad linią straganów, jeśli `ux-p47-bg.js` bada niższe wiersze), przewód `WOOD_0`, świecące żarówki `GOLD_2`/`CREAM_1` oraz ich ciepłe światło wieczorem i w nocy (`light.render(wim, "evening", lights)` i `"night"`).
   - Przywróć plakaty `poster_1.png`, `poster_2.png`, `poster_3.png` na tylnym murze w miejscach, które nie kolidują z oknami testowymi `ux-p47-bg.js`.
3. W `tools/art/world/farm_bg.py`:
   - Przywróć drewniany płot `fence_farm.png` wzdłuż horyzontu (`y = HORIZON + 6`), z pominięciem prostokąta stodoły badanego przez `ux-p47-bg.js`.
4. W `tools/art/world/garden_bg.py`:
   - Przywróć furtkę `gate_garden.png` w osi ścieżki (`(W - gate.width) // 2, HORIZON - 2`) oraz dalekie drzewka `tree_small.png` na horyzoncie poza prostokątem głównego drzewa z `ux-p47-bg.js`.
5. W `tools/art/world/park_bg.py`:
   - Przywróć daleką altanę `gazebo.png` na drugim brzegu strumienia, dalekie drzewa `tree_big.png` przy krawędziach horyzontu oraz drewniany mostek `bridge_wood.png` nad strumieniem (poza prostokątem fontanny badanym w `ux-p47-bg.js`).
6. Wygeneruj wszystkie 16 plików PNG i uruchom Weryfikację (`ux-p47-bg.js` oraz `check-assets.js` muszą przejść na zielono).

Prohibited: changing or deleting existing test assertions, new dependencies, touching files outside "Zmieniaj", running git.
Log: write `docs/opt/log/PK-PF-BG.md` (max 10 linii).
