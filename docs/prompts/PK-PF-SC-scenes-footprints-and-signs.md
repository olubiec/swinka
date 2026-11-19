# PK-PF-SC: Attach single-frame pixel sw/sh to placedThings, draw market stall signboards ("szyldy"), and sync Park mock coordinates
Zmieniaj: web/home/features/places/scenes.js, web/home/features/places/mock.js, docs/opt/log/PK-PF-SC.md
Weryfikacja: node --check web/home/features/places/scenes.js && node --check web/home/features/places/mock.js && node tools/qa/ux-p46-render.js && node tools/qa/ux-p50-canvas-wiring.js && node tools/qa/place-scenes-check.js
Pytania: nie zadawaj pytań i nie czekaj na odpowiedź. Jeśli czegoś brakuje lub coś jest niejasne, sam wybierz najrozsądniejsze rozwiązanie zgodne z AGENTS.md, zapisz decyzję w logu i dokończ do końca.
Limity (twarde): maks. 35 wywołań narzędzi. Linię Weryfikacja uruchom maks. 2 razy. Czytaj tylko pliki z Zmieniaj oraz pliki z sekcji "Czytaj tylko". Nie uruchamiaj git.
Nie ruszaj: AGENTS.md, docs/archive/, tasks/*, every file not listed in Zmieniaj
Goal: (1) In `web/home/features/places/scenes.js`, attach single-frame pixel dimensions `sw` and `sh` to every item returned by `placedThings(placeId, state)` and every instance passed to `hotspotsFor`, (2) draw distinct pixel-art signboards ("szyldy") on the 3 market stalls (`stall_left` = sprout/seed icon, `stall_center` = carrot/food icon, `stall_right` = ball/craft icon), and (3) sync the fixed Park coordinates in `web/home/features/places/mock.js`.

Depends on: `docs/opt/foundations/RIF1.md`, `RF3.md`, `RF4.md`, `RF5.md`. Biegnie w kroku F2F-4 równolegle z `PK-PF-CV` i `PK-PF-PL`.

Produces (names other packages rely on): Accurate `sw, sh` on `placedThings` and `hotspotsFor`, market stall signboards rendered in `scenes.js`, updated Park defaults in `places/mock.js`.

## Czytaj tylko (zakaz czytania innych plików)
- `docs/opt/foundations/RIF1.md`
- `docs/opt/foundations/RF4.md`
- `docs/opt/foundations/RF5.md`
- `web/home/features/places/scenes.js`
- `web/home/features/places/mock.js`
- `assets/data/outdoor_defaults.json`

## Nie czytaj
Wszystkich pozostałych plików w repozytorium.

## Steps
1. Przeczytaj `docs/opt/foundations/RIF1.md`, `web/home/features/places/scenes.js`, `web/home/features/places/mock.js` oraz `assets/data/outdoor_defaults.json`.
2. W `web/home/features/places/scenes.js`:
   - W `placedThings(placeId, state)`: oblicz szerokość pojedynczej klatki w pikselach `const frameCount = Math.max(1, Number(frames) || 1); const frameW = entry && entry.w ? Math.round(entry.w / frameCount) : cw * 16; const frameH = entry && entry.h ? entry.h : ch * 16;` i dołącz `sw: frameW, sh: frameH` do każdego zwracanego obiektu.
   - W `hotspotsFor(sceneId, state)`: upewnij się, że instancje przekazywane do `CuyHotspots.fromInstances` mają uzupełnione `w, h` (w kratkach) oraz `sw, sh` (w pikselach pojedynczej klatki z atlasu lub `w * 16, h * 16`), dzięki czemu hotspot każdej lampy, straganu i tablicy zleceń pokrywa cały widoczny sprite.
   - Dodaj rysowanie czytelnych szyldów ("szyld") na daszkach 3 straganów w scenie `market` (np. funkcja `drawMarketSignboards(ctx, state)` wywoływana w warstwie `market` po narysowaniu tła/przedmiotów albo warstwa `z: 95` nad daszkami straganów `fx:market:stall_left`, `fx:market:stall_center`, `fx:market:stall_right` zgodnie z ich aktualną pozycją w `placed`):
     - mała drewniana tabliczka szyldu `14x11 px` z ramką `#3d2210` i tłem `#f3e1b6` na środku daszku każdego straganu,
     - na lewym straganie (`stall_left`, Seeds): pixel-artowy zielony kiełek / listek (`#4e9a36` / `#7ec850`),
     - na środkowym straganie (`stall_center`, Food): pixel-artowa pomarańczowa marchewka z zieloną natką (`#e87828` / `#58a838`),
     - na prawym straganie (`stall_right`, Craft & Decor): pixel-artowa gwiazdka/zabawka (`#d85888` / `#f0c048`).
3. W `web/home/features/places/mock.js`: zaktualizuj domyślne współrzędne `park` w `OUTDOOR_DEFAULTS_FALLBACK`, aby były identyczne z poprawionym `assets/data/outdoor_defaults.json` (wszystkie `x + w <= 16`).
4. Uruchom Weryfikację.

Prohibited: changing or deleting existing test assertions, new dependencies, touching files outside "Zmieniaj", running git.
Log: write `docs/opt/log/PK-PF-SC.md` (max 10 linii).
