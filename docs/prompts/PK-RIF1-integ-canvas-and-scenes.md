# PK-RIF1: Integration analysis: canvas-pig.js and scenes.js wiring for F2F-4
Zmieniaj: docs/opt/foundations/RIF1.md, docs/opt/log/PK-RIF1.md
Weryfikacja: node tools/qa/foundation-check.js docs/opt/foundations/RIF1.md 5
Pytania: nie zadawaj pytań i nie czekaj na odpowiedź. Jeśli czegoś brakuje lub coś jest niejasne, sam wybierz najrozsądniejsze rozwiązanie zgodne z AGENTS.md, zapisz decyzję w logu i dokończ do końca.
Limity (twarde): maks. 25 wywołań narzędzi. To jest paczka badawcza: kod, dane i testy w repo tylko do odczytu. Piszesz wyłącznie dokumenty z Zmieniaj. Nie uruchamiaj git. Weryfikację uruchom maks. 2 razy.
Nie ruszaj: AGENTS.md, docs/archive/, tasks/*, every file not listed in Zmieniaj
Goal: After F2F-2 is merged, inspect the updated `hotspots.js`, `scene-pigs.js`, `outdoor_defaults.json`, `canvas-pig.js`, and `places/scenes.js`, and write the exact line anchors for `PK-PF-CV` (`canvas-pig.js`) and `PK-PF-SC` (`places/scenes.js` & `places/mock.js`).

Depends on: kroki F2F-1 i F2F-2 scalone w `main`. Biegnie w kroku F2F-3 równolegle z `PK-RIF2`.

Produces (names other packages rely on): `docs/opt/foundations/RIF1.md` (1500..16000 znaków, sekcje `## 1.` .. `## 5.`):
- `## 1.` Status of F2F-2 packages (`PK-PF-BG`, `PK-PF-DATA`, `PK-PF-HS`, `PK-PF-SP`)
- `## 2.` Exact anchors in `web/home/canvas-pig.js` for `PK-PF-CV` (drag fix, `isDragging()`, `litFrame` cache, `_cachedPattern`, `setLightScene` double-render fix, `rebuildGrid` pixel footprints)
- `## 3.` Exact anchors in `web/home/features/places/scenes.js` and `mock.js` for `PK-PF-SC` (single-frame `sw`/`sh` on `placedThings`, market stall signboards, Park coordinates in `mock.js`)
- `## 4.` Regression checks for `PK-PF-CV` and `PK-PF-SC`
- `## 5.` Prompt fixes

## Czytaj tylko (zakaz czytania innych plików)
- `docs/opt/foundations/RF1.md`, `RF3.md`, `RF4.md`, `RF5.md`
- `docs/opt/log/PK-PF-BG.md`, `PK-PF-DATA.md`, `PK-PF-HS.md`, `PK-PF-SP.md`
- `web/home/canvas-pig.js` linie 240-315, 550-615, 1070-1120, 1465-1510, 2210-2310, 2750-2815, 2930-3030, 3340-3425
- `web/home/features/places/scenes.js` linie 140-370
- `web/home/features/places/mock.js` linie 1-140

## Nie czytaj
Wszystkich pozostałych plików w repozytorium.

## Steps
1. Sprawdź logi `PK-PF-BG`, `PK-PF-DATA`, `PK-PF-HS`, `PK-PF-SP` i potwierdź stan plików po F2F-2.
2. Wypisz dokładne numery linii i kotwice w `web/home/canvas-pig.js` dla `PK-PF-CV`:
   - `window.CanvasPig.isDragging()` i `this.drag !== null`,
   - usunięcie podwójnego `inst.render()` w `window.CanvasPig.setLightScene` (linia ~255),
   - `litFrame` cache (linia ~3349) i `img._cachedPattern` w `drawHabitat` (linie ~2938, 2977, 3014),
   - naprawa `pointerdown` / `pointermove` / `setPresentPigs` / `render()` / `debug()` przy przeciąganiu świnki,
   - naprawa `rebuildGrid()` (linia ~560): przeliczanie `t.w, t.h` (gdy `<= 8` i brak `t.sw/t.sh`) na piksele `* 16`, z zachowaniem kompatybilności z testami jednostkowymi podającymi piksele bezpośrednio (`ux-p39-blockers.js`).
3. Wypisz dokładne numery linii i kotwice w `web/home/features/places/scenes.js` i `web/home/features/places/mock.js` dla `PK-PF-SC`:
   - dołączanie `sw` (szerokość pojedynczej klatki `Math.round(entry.w / frames)`) i `sh` (`entry.h`) w `placedThings(placeId, state)`,
   - rysowanie szyldów (`drawMarketSignboards`) na daszkach 3 straganów w scenie `market`,
   - synchronizacja współrzędnych `park` w `web/home/features/places/mock.js` z `assets/data/outdoor_defaults.json`.
4. Uruchom Weryfikację (`node tools/qa/foundation-check.js docs/opt/foundations/RIF1.md 5`).

Prohibited: edycja kodu, danych i testów, new dependencies, touching files outside "Zmieniaj", running git.
Log: write `docs/opt/log/PK-RIF1.md` (max 10 linii).
