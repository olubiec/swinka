# PK-P43a: Scene hotspots data
Zmieniaj: assets/data/place_scenes.json, tools/qa/place-scenes-check.js, tools/qa/ux-p43-hotspot-data.js, docs/opt/log/PK-P43a.md
Wymagane: tools/qa/ux-p43-hotspot-data.js
Weryfikacja: node --check tools/qa/place-scenes-check.js && node --check tools/qa/ux-p43-hotspot-data.js && node tools/qa/ux-p43-hotspot-data.js
Pytania: nie zadawaj pytań i nie czekaj na odpowiedź. Jeśli czegoś brakuje lub coś jest niejasne, sam wybierz najrozsądniejsze rozwiązanie zgodne z AGENTS.md, zapisz decyzję w logu i dokończ do końca.
Limity (twarde): maks. 45 wywołań narzędzi. Linię Weryfikacja uruchom maks. 2 razy. Czytaj tylko pliki z Zmieniaj/Wymagane oraz zakresy linii znalezione przez grep. Nie diagnozuj niczego spoza Zmieniaj. Gdy test pada na czymś, czego Twoja zmiana nie dotyka: zapisz nazwę testu i 5 linii błędu w logu, status BLOCKED, zakończ. Po błędzie we własnym kodzie wolno jedna poprawka i jeden ponowny bieg, potem zakończ jako BLOCKED. Nie uruchamiaj web-smoke.js (robi to paczka q).
Nie ruszaj: AGENTS.md, docs/archive/, tasks/*, every file not listed in Zmieniaj
Goal: Add `hotspots` to scenes: clickable areas for market stalls, farm plots/house/orchard, garden lamps/pond, so the scene can be interacted with directly.
Depends on: PK-P39a merged (same files: place_scenes.json, place-scenes-check.js; P45d1/P45d2 also edit them earlier in the order, re-read the file before editing).

## Kontekst (fakty, nie szukaj drugi raz)
- Docelowa wizja: każde miejsce (pokoje domku, ogród, park, farma, targ) to scena w głównym oknie Home (pseudo-3D: widok z przodu z góry, podłoga z głębią, świnka chodzi w x i y, skaluje się z głębią, y-sort). Sceny: `assets/data/place_scenes.json` (`bg`, `walk` [x0,y0,x1,y1], `depthScale`, wyjścia), moduł `web/home/features/places/{feature,scenes}.js`, płótno `web/home/canvas-pig.js` (API w logach `docs/opt/log/PK-P33a.md`, `PK-P34a.md`, `PK-P36a.md`).
- Test właściciela 7.11 (P31-P37 wdrożone): świnka chodzi przez fontannę i inne elementy tła; skala świnki do sceny jest zła; belka miejsc przycina scenę (drzewa w parku, domek na farmie nie widać); tła scen nie mają światła/ambientu (`lib/lights.js`, `assets/data/lights.json`), który jest w oknach ogrodu i farmy.

## Pliki i elementy (zweryfikowane w repo 8.11.2026; nie szukaj ich drugi raz)
- `assets/data/place_scenes.json`: top-level keys `version`, `time_of_day`, `scenes`, `house_exits`; `scenes.<id>` has `kind`, `title`, `size` [w,h], `walk` [x0,y0,x1,y1], `depth_scale`, `bg` (object time-of-day -> path, or null for `room`), `exits`. Scene ids: `room`, `garden`, `park`, `farm`, `market`. No `hotspots` key exists yet. Sizes: garden/farm/market 256x144. Backgrounds: `assets/world/bg/market.png`, `farm.png`, `garden_day.png` (open only these 3 PNG).
- Farm sizes are variable, not fixed: `web/home/features/farm/mock.js:20` `MAX_PLOTS = 12` (start 4 owned, `plotsOwned`), orchard starts with 1 slot and `assets/data/farm.json` `orchard_slots` has 4 purchasable entries (max 5; confirm in `src/Cuy.Core/World/FarmExpansion.cs`, read only). So the farm needs 12 plot hotspots and 5 orchard hotspots; unowned ones are inactive at runtime (PK-P43d/g).
- `tools/qa/place-scenes-check.js`: flat script (checks C1..C4, `allPassed` flag, `data.scenes` loop, `process.exit` at the end); append H1-H5 in the same style (`console.log('H1: OK ...')` / `allPassed = false`).
- Market has no per-stall data: `web/home/features/market/feature.js:7-12` `TABS` = seeds, home, pantry, sell (labels `Seeds & tools`, `Home & garden`, `Pantry`, `Sell`). Stall ids therefore map to tabs.

## Steps
1. View `assets/world/bg/market.png`, `farm.png`, `garden_day.png`. For each interactive object add `hotspots:[{id, kind, rect:[x0,y0,x1,y1], label}]` in scene pixels. Market: `stall:seeds`, `stall:home`, `stall:pantry`, `stall:sell` (kind `stall`, label = the TABS label; pick the drawn stall that best fits each goods type) and `stall:own` (kind `stall`, the player's stall, `market_stall`). Farm: `plot:0..11` (kind `plot`, exactly 12 = MAX_PLOTS), `orchard:0..4` (kind `orchard`), `shop` (kind `shop`, the farm shop, `farm_buy`). Add `plotCount: 12` to the farm scene. Garden: `pond`, `flowerbed` (kind `decor`, label only). Rooms: none.
2. Extend `place-scenes-check.js`: H1 ids unique per scene; H2 rect inside the scene; H3 rects do not overlap each other by more than 25%; H4 every `kind` in {stall, plot, orchard, shop, decor, object} (`object` is only used at runtime by PK-P43e, allowed here); H5 farm has exactly `plotCount` (12) `plot:*` hotspots, `plotCount` equals `MAX_PLOTS` read from `web/home/features/farm/mock.js` by regex, and `orchard:*` count is 5.
3. `tools/qa/ux-p43-hotspot-data.js` (Node): valid data accepted, 3 in-memory invalid fixtures rejected.
4. Run Weryfikacja; fix until green. Log: hotspot ids per scene.

Prohibited: changing or deleting existing test assertions (poza wskazanymi w krokach), new dependencies, touching files outside "Zmieniaj", extra refactors.
Log: write `docs/opt/log/PK-P43a.md` (max 10 lines: decisions, exact API/field names others will use, differences from the plan, BLOCKED reason if any). Do not run git.
