# PK-PF-HS: Fix hotspot pixel dimensions from grid cells, add garden_lantern/lantern_post to isLampItem, and add order_board hotspot
Zmieniaj: web/home/lib/hotspots.js, assets/data/scene_hotspots.json, tools/qa/hotspots-check.js, tools/qa/ux-p43-hotspots.js, docs/opt/log/PK-PF-HS.md
Weryfikacja: node --check web/home/lib/hotspots.js && node --check tools/qa/hotspots-check.js && node --check tools/qa/ux-p43-hotspots.js && node tools/qa/hotspots-check.js && node tools/qa/ux-p43-hotspots.js
Pytania: nie zadawaj pytań i nie czekaj na odpowiedź. Jeśli czegoś brakuje lub coś jest niejasne, sam wybierz najrozsądniejsze rozwiązanie zgodne z AGENTS.md, zapisz decyzję w logu i dokończ do końca.
Limity (twarde): maks. 30 wywołań narzędzi. Linię Weryfikacja uruchom maks. 2 razy. Czytaj tylko pliki z Zmieniaj oraz `docs/opt/foundations/RF4.md` i `RF5.md`. Nie uruchamiaj git.
Nie ruszaj: AGENTS.md, docs/archive/, tasks/*, every file not listed in Zmieniaj
Goal: Fix `classifyInstance` in `web/home/lib/hotspots.js` so grid dimensions `w, h` (1..6 cells) are converted to pixel dimensions (`w * 16`, `h * 16`) when `sw`/`sh` are absent, include `garden_lantern` and `lantern_post` in `isLampItem`, and classify `fx:market:order_board` (`order_board`) as hotspot `{ id: 'stall:orders', action: 'market_stall', target: 'orders', label: 'Orders' }`.

Depends on: `docs/opt/foundations/RF4.md`, `docs/opt/foundations/RF5.md`. Biegnie w kroku F2F-2 równolegle z 6 innymi paczkami.

Produces (names other packages rely on): Accurate pixel bounding boxes for all lamp/stall/farm hotspots in `web/home/lib/hotspots.js`, plus `stall:orders` hotspot for the market order board.

## Czytaj tylko (zakaz czytania innych plików)
- `docs/opt/foundations/RF4.md`
- `docs/opt/foundations/RF5.md`
- `web/home/lib/hotspots.js`
- `assets/data/scene_hotspots.json`
- `tools/qa/hotspots-check.js`
- `tools/qa/ux-p43-hotspots.js`

## Nie czytaj
Wszystkich pozostałych plików w repozytorium.

## Steps
1. Przeczytaj `docs/opt/foundations/RF4.md` (sekcja 3) i `RF5.md` oraz pliki z `Zmieniaj`.
2. W `web/home/lib/hotspots.js`:
   - W `isLampItem(itemId)` dodaj rozpoznawanie `garden_lantern` i `lantern_post` (np. `id.indexOf('lantern') !== -1`), z zachowaniem wykluczenia `window_*`.
   - W `classifyInstance(sceneId, inst)`: napraw obliczanie `sw` i `sh`: jeśli `Number(inst.sw) > 0`, użyj `Number(inst.sw)`; w przeciwnym razie jeśli `Number(inst.w) > 0`, użyj `Number(inst.w) <= 8 ? Number(inst.w) * 16 : Number(inst.w)` (domyślnie `16`); analogicznie dla `sh` (`Number(inst.sh) > 0 ? Number(inst.sh) : (Number(inst.h) > 0 ? (Number(inst.h) <= 8 ? Number(inst.h) * 16 : Number(inst.h)) : 16)`).
   - W `classifyInstance('market', inst)`: oprócz `stall_left`, `stall_center`, `stall_right` dodaj obsługę `uid === 'fx:market:order_board'` lub `itemId === 'order_board'` -> zwraca hotspot `{ id: 'stall:orders', x: px, y: py, w: sw, h: sh, label: 'Orders', action: 'market_stall', target: 'orders', cursor: 'pointer', priority: 10 }` (a w `assets/data/scene_hotspots.json` dodaj odpowiadający wpis fallbackowy `stall:orders`, jeśli `hotspots-check.js` tego oczekuje lub pozwala).
3. W `tools/qa/ux-p43-hotspots.js` dodaj przypadek testowy sprawdzający, że instancja lampy z `{ uid: 'r1', itemId: 'lamp_mushroom', x: 3, y: 2, w: 1, h: 2 }` (bez `sw`/`sh`) tworzy hotspot o szerokości `>= 16` i wysokości `>= 32`, oraz że `garden_lantern` i `order_board` tworzą właściwe hotspoty. Nie zmieniaj ani nie usuwaj istniejących asercji!
4. Uruchom Weryfikację.

Prohibited: changing or deleting existing test assertions, new dependencies, touching files outside "Zmieniaj", running git.
Log: write `docs/opt/log/PK-PF-HS.md` (max 10 linii).
