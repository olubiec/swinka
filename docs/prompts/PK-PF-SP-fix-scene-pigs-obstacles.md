# PK-PF-SP: Fix multi-pig obstacle avoidance in scene-pigs.js (free spawn, segment line-of-sight walk target, slide deflection)
Zmieniaj: web/home/lib/scene-pigs.js, tools/qa/ux-p5-scene-pigs.js, docs/opt/log/PK-PF-SP.md
Weryfikacja: node --check web/home/lib/scene-pigs.js && node --check tools/qa/ux-p5-scene-pigs.js && node tools/qa/ux-p5-scene-pigs.js
Pytania: nie zadawaj pytań i nie czekaj na odpowiedź. Jeśli czegoś brakuje lub coś jest niejasne, sam wybierz najrozsądniejsze rozwiązanie zgodne z AGENTS.md, zapisz decyzję w logu i dokończ do końca.
Limity (twarde): maks. 30 wywołań narzędzi. Linię Weryfikacja uruchom maks. 2 razy. Czytaj tylko pliki z Zmieniaj oraz `docs/opt/foundations/RF4.md`. Nie uruchamiaj git.
Nie ruszaj: AGENTS.md, docs/archive/, tasks/*, every file not listed in Zmieniaj
Goal: Ensure pigs managed by `web/home/lib/scene-pigs.js` never spawn on blocked cells, only pick walk targets with a clear line-of-sight segment, and deflect around obstacles instead of walking through them.

Depends on: `docs/opt/foundations/RF4.md`. Biegnie w kroku F2F-2 równolegle z 6 innymi paczkami.

Produces (names other packages rely on): Obstacle-aware `pickSpawnPoint`, `isSegmentFree`, `pickTarget`, and `stepWalk` in `web/home/lib/scene-pigs.js`.

## Czytaj tylko (zakaz czytania innych plików)
- `docs/opt/foundations/RF4.md`
- `web/home/lib/scene-pigs.js`
- `tools/qa/ux-p5-scene-pigs.js`

## Nie czytaj
Wszystkich pozostałych plików w repozytorium.

## Steps
1. Przeczytaj `docs/opt/foundations/RF4.md` (sekcja 2) oraz `web/home/lib/scene-pigs.js` i `tools/qa/ux-p5-scene-pigs.js`.
2. W `web/home/lib/scene-pigs.js`:
   - Dodaj funkcję `isSegmentFree(x0, y0, x1, y1, isFreeFn)` próbkującą punkty co ~6 px wzdłuż odcinka `(x0, y0) -> (x1, y1)`.
   - W `pickSpawnPoint` (oraz przy pierwszym ustawieniu pozycji świnki w `syncPresent` / `tick`), jeśli podano `isFreeFn` i wyliczony punkt `(x, y)` jest zablokowany (`!isFreeFn(x, y)`), przeszukaj spiralnie sąsiednie punkty w granicach `bounds`, aż znajdziesz wolne miejsce.
   - W `pickTarget(pig, allPigs, bounds, isFreeFn, rng)` wymagaj zarówno `isFreeFn(tx, ty)`, jak i `isSegmentFree(pig.x, pig.y, tx, ty, isFreeFn)`.
   - W `stepWalk`: jeśli bezpośredni krok `(nx, ny)` jest zablokowany przez `!isFreeFn(nx, ny)`, spróbuj przesunąć świnkę tylko w osi X (`isFreeFn(nx, pig.y)`) lub tylko w osi Y (`isFreeFn(pig.x, ny)`) przed porzuceniem celu.
3. W `tools/qa/ux-p5-scene-pigs.js` dodaj przypadek testowy sprawdzający, że przy przeszkodzie na środku sceny `pickTarget` nie wybiera celu po drugiej stronie przeszkody przecinającego blokadę i świnka nigdy nie wchodzi w zablokowany prostokąt. Nie zmieniaj istniejących asercji!
4. Uruchom Weryfikację.

Prohibited: changing or deleting existing test assertions, new dependencies, touching files outside "Zmieniaj", running git.
Log: write `docs/opt/log/PK-PF-SP.md` (max 10 linii).
