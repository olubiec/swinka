# PK-P43a: Scene hotspots data
Zmieniaj: assets/data/place_scenes.json, tools/qa/place-scenes-check.js, tools/qa/ux-p43-hotspot-data.js, docs/opt/log/PK-P43a.md
Wymagane: tools/qa/ux-p43-hotspot-data.js
Weryfikacja: node --check tools/qa/place-scenes-check.js && node --check tools/qa/ux-p43-hotspot-data.js && node tools/qa/ux-p43-hotspot-data.js
Pytania: nie zadawaj pytań i nie czekaj na odpowiedź. Jeśli czegoś brakuje lub coś jest niejasne, sam wybierz najrozsądniejsze rozwiązanie zgodne z AGENTS.md, zapisz decyzję w logu i dokończ do końca.
Limity (twarde): maks. 45 wywołań narzędzi. Linię Weryfikacja uruchom maks. 2 razy. Czytaj tylko pliki z Zmieniaj/Wymagane oraz zakresy linii znalezione przez grep. Nie diagnozuj niczego spoza Zmieniaj. Gdy test pada na czymś, czego Twoja zmiana nie dotyka: zapisz nazwę testu i 5 linii błędu w logu, status BLOCKED, zakończ. Po błędzie we własnym kodzie wolno jedna poprawka i jeden ponowny bieg, potem zakończ jako BLOCKED. Nie uruchamiaj web-smoke.js (robi to paczka q).
Nie ruszaj: AGENTS.md, docs/archive/, tasks/*, every file not listed in Zmieniaj
Goal: Add `hotspots` to scenes: clickable areas for market stalls, farm plots/house/orchard, garden lamps/pond, so the scene can be interacted with directly.
Depends on: PK-P46b merged (instancje plenerowe w scenes.js i place_scenes.json).

## Kontekst (fakty, nie szukaj drugi raz)
- Docelowa wizja: każde miejsce (pokoje domku, ogród, park, farma, targ) to scena w głównym oknie Home (pseudo-3D: widok z przodu z góry, podłoga z głębią, świnka chodzi w x i y, skaluje się z głębią, y-sort). Sceny: `assets/data/place_scenes.json` (`bg`, `walk` [x0,y0,x1,y1], `depthScale`, wyjścia), moduł `web/home/features/places/{feature,scenes}.js`, płótno `web/home/canvas-pig.js` (API w logach `docs/opt/log/PK-P33a.md`, `PK-P34a.md`, `PK-P36a.md`).
- Test właściciela 7.11 (P31-P37 wdrożone): świnka chodzi przez fontannę i inne elementy tła; skala świnki do sceny jest zła; belka miejsc przycina scenę (drzewa w parku, domek na farmie nie widać); tła scen nie mają światła/ambientu (`lib/lights.js`, `assets/data/lights.json`), który jest w oknach ogrodu i farmy.

## Steps
1. View `assets/world/bg/market.png`, `farm.png`, `garden_day.png`. For each interactive object add `hotspots:[{id, kind, rect:[x0,y0,x1,y1], label}]` in scene pixels. Market: `stall:<n>` for each stall (kind `stall`, label = its goods e.g. `Veggies`) and one `stall:own` (the player's stall, `market_stall`). Farm: `plot:0..N-1` (kind `plot`, N from `farm/feature.js` plot count, grep `plots`), `orchard:0..k`, `shop` (the farm shop, `farm_buy`). Garden: `pond`, `flowerbed` (kind `decor`, label only). Rooms: none.
2. Extend `place-scenes-check.js`: H1 ids unique per scene; H2 rect inside the scene; H3 rects do not overlap each other by more than 25%; H4 every `kind` in {stall, plot, orchard, shop, decor}; H5 farm has exactly the plot count the farm feature uses (read the number from `farm/feature.js` via regex, or a constant you add to the data as `plotCount`).
3. `tools/qa/ux-p43-hotspot-data.js` (Node): valid data accepted, 3 in-memory invalid fixtures rejected.
4. Run Weryfikacja; fix until green. Log: hotspot ids per scene.

## Poprawki po R1 (obowiązują, mają pierwszeństwo nad krokami wyżej)
- Statyczne `hotspots` w `place_scenes.json` dodawaj tylko dla scen z `bg_clean:false` i dla obiektów spoza instancji (staw i rabata w ogrodzie, altana w parku). Dla scen czystych (farma, targ) hotspoty powstają dynamicznie z instancji `fx:<scene>:<id>`.
- `place-scenes-check.js`: waliduj H1-H4 dla statycznych hotspotów; dla grządek sprawdź, że statyczny fallback albo `outdoor_defaults.json` definiuje grządki zgodne z `FarmConfig`.

Prohibited: changing or deleting existing test assertions (poza wskazanymi w krokach), new dependencies, touching files outside "Zmieniaj", extra refactors.
Log: write `docs/opt/log/PK-P43a.md` (max 10 lines: decisions, exact API/field names others will use, differences from the plan, BLOCKED reason if any). Do not run git.
