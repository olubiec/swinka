# PK-RF4: Research: item footprint collision grid, multi-pig walk obstacle avoidance and lamp hotspot rectangles
Zmieniaj: docs/opt/foundations/RF4.md, docs/opt/log/PK-RF4.md
Weryfikacja: node tools/qa/foundation-check.js docs/opt/foundations/RF4.md 5
Pytania: nie zadawaj pytań i nie czekaj na odpowiedź. Jeśli czegoś brakuje lub coś jest niejasne, sam wybierz najrozsądniejsze rozwiązanie zgodne z AGENTS.md, zapisz decyzję w logu i dokończ do końca.
Limity (twarde): maks. 25 wywołań narzędzi. To jest paczka badawcza: kod, dane i testy w repo tylko do odczytu. Piszesz wyłącznie dokumenty z Zmieniaj. Nie uruchamiaj git. Czytaj wyłącznie wskazane zakresy linii. Weryfikację uruchom maks. 2 razy.
Nie ruszaj: AGENTS.md, docs/archive/, tasks/*, every file not listed in Zmieniaj
Goal: Prove why pigs walk straight through furniture and outdoor items (`rebuildGrid` and `scene-pigs.js`) and why clicking lamps fails (`hotspots.js` and `scenes.js`), and specify exact fixes for `PK-PF-HS`, `PK-PF-SP`, `PK-PF-CV`, and `PK-PF-SC`.

Depends on: nothing (tylko odczyt). Działa w kroku F2F-1 równolegle z `PK-RF1..PK-RF6`.

Produces (names other packages rely on): `docs/opt/foundations/RF4.md` (1500..16000 znaków, sekcje `## 1.` .. `## 5.`):
- `## 1.` Grid-cells vs pixels bug in `canvas-pig.js` `rebuildGrid()` (lines 555-595)
- `## 2.` Obstacle avoidance gaps in `web/home/lib/scene-pigs.js` (`pickSpawnPoint`, `pickTarget`, `stepWalk`)
- `## 3.` Lamp & fixture hotspot 1x2 px bug in `web/home/lib/hotspots.js` and `web/home/features/places/scenes.js`
- `## 4.` Exact contracts and anchors for `PK-PF-HS`, `PK-PF-SP`, `PK-PF-CV`, `PK-PF-SC`
- `## 5.` Prompt fixes

## Czytaj tylko (zakaz czytania innych plików)
- `web/home/canvas-pig.js` linie 550-650, 1180-1260
- `web/home/lib/scene-pigs.js` linie 1-200
- `web/home/lib/hotspots.js` linie 1-160
- `web/home/features/places/scenes.js` linie 210-370

## Nie czytaj
Wszystkich pozostałych plików w repozytorium.

## Steps
1. Przeczytaj `web/home/canvas-pig.js` (550-650) i udowodnij, dlaczego `rebuildGrid()` przepuszcza świnkę przez meble: `t.w` i `t.h` z `placedThings` to **liczba kratek siatki** (`1..3`), a `spw = t.w || ...` traktuje je jako **piksele** (`1..3 px` szerokości zamiast `16..48 px`), a wysokość stopy `fy0 = fy1 - 4` ma tylko 4 px i brak jej marginesu poziomego `padX` na szerokość ciała świnki. Sprawdź też, jak istniejące testy (`ux-p39-blockers.js`, `ux-p50-canvas-wiring.js`) wywołują `setThings` / `isFree`, żeby rozróżnić `t.sw` / `t.w <= 8 ? t.w * 16 : t.w`.
2. Przeczytaj `web/home/lib/scene-pigs.js` (1-200) i wykaż, że `pickSpawnPoint` nie sprawdza `isFreeFn`, `pickTarget` sprawdza tylko punkt docelowy zamiast odcinka od `(pig.x, pig.y)` do `(tx, ty)`, a przy zablokowaniu kroku w `stepWalk` świnka nie próbuje ominąć przeszkody ślizgiem po osi X lub Y.
3. Przeczytaj `web/home/lib/hotspots.js` (1-160) oraz `web/home/features/places/scenes.js` (210-370) i wykaż dwie przyczyny niedziałających kliknięć w lampy:
   - W `classifyInstance` (`hotspots.js:64-65`) `const sw = Number(inst.sw) || Number(inst.w) || 16` bierze `inst.w` (kratki = `1` lub `2`), tworząc hotspot o wymiarach **1×2 pikseli**! Gdy `inst.sw` nie jest podane, dla `inst.w <= 8` wymiar w pikselach to `inst.w * 16` (i analogicznie `inst.h <= 8 ? inst.h * 16 : inst.h`).
   - `isLampItem` (`hotspots.js:31-38`) nie uwzględnia `garden_lantern` ani `lantern_post`.
   - W `scenes.js` `placedThings` (`scenes.js:244-295`) dla animowanych pasków (np. `campfire`, `torch_wall`, `brazier` mających `frames: 4` w `lights.json`) `entry.w` w `atlas.json` to szerokość całego 4-klatkowego paska; pojedyncza klatka ma `sw = Math.round(entry.w / frames)` i `sh = entry.h`.
4. Zapisz dokładne zmiany dla `PK-PF-HS`, `PK-PF-SP`, `PK-PF-CV`, `PK-PF-SC`.
5. Uruchom Weryfikację (`node tools/qa/foundation-check.js docs/opt/foundations/RF4.md 5`).

Prohibited: edycja kodu, danych i testów, new dependencies, touching files outside "Zmieniaj", running git.
Log: write `docs/opt/log/PK-RF4.md` (max 10 linii).
