# PK-TF3: Test agent: full pixel footprint collisions across scenes and lamp click toggling for every lamp type
Zmieniaj: tools/qa/ux-p73-drag-collision-lamps.js, docs/opt/log/PK-TF3.md
Wymagane: tools/qa/ux-p73-drag-collision-lamps.js
Weryfikacja: node --check tools/qa/ux-p73-drag-collision-lamps.js && node tools/qa/ux-p73-drag-collision-lamps.js
Pytania: nie zadawaj pytań i nie czekaj na odpowiedź. Jeśli czegoś brakuje lub coś jest niejasne, sam wybierz najrozsądniejsze rozwiązanie zgodne z AGENTS.md, zapisz decyzję w logu i dokończ do końca.
Limity (twarde): maks. 30 wywołań narzędzi. Linię Weryfikacja uruchom maks. 2 razy. Czytaj tylko pliki z Zmieniaj oraz pliki z sekcji "Czytaj tylko". Jesteś agentem testowym: NIE poprawiasz kodu produkcyjnego. Wada kodu = linia `DEFECT <id>: <opis>`; z `STRICT=1` kod wyjścia 1 przy jakimkolwiek DEFECT. Nie uruchamiaj git.
Nie ruszaj: AGENTS.md, docs/archive/, tasks/*, every file not listed in Zmieniaj
Goal: Independently test that item footprints block their full pixel width (`w * 16`) in `CanvasPig.isFree`, pigs walking for 200 ticks never enter any furniture/fixture footprint, and clicking every lamp hotspot (indoor and outdoor, including `garden_lantern` and `lantern_post`) toggles its light state immediately.

Depends on: kroki F2F-2 i F2F-4 scalone w `main`. Biegnie w kroku F2F-5 równolegle z `PK-TF1..PK-TF4`.

Produces (names other packages rely on): `tools/qa/ux-p73-drag-collision-lamps.js` (picked up by `ux-all.js`).

## Czytaj tylko (zakaz czytania innych plików)
- `docs/opt/foundations/RF4.md`
- `docs/opt/foundations/RIF1.md`
- `tools/qa/lib/ux.js`

## Nie czytaj
Pozostałych testów `tools/qa/ux-p*.js`.

## Steps
1. Przeczytaj `docs/opt/foundations/RF4.md`, `RIF1.md` oraz `tools/qa/lib/ux.js`.
2. Napisz `tools/qa/ux-p73-drag-collision-lamps.js` (Playwright, `openHome`, mock `seven`, okno `420x640`) ze wszystkimi przypadkami:
   - `C1-footprint-full-pixel-width`: dla mebla `w: 2, h: 2` postawionego w pokoju i straganu `w: 3, h: 2` na targu `CanvasPig.isFree(px, py)` zwraca `false` na całej pikselowej szerokości stopy (`32 px` i `48 px`), a nie tylko na `2..3 px` przy lewej krawędzi!
   - `C2-pigs-never-walk-through-items`: w scenach `room_1`, `garden`, `market`, `park` wykonaj 150 kroków ruchu świnek i w każdym kroku sprawdź, że `CanvasPig.isFree(p.x, p.y) === true` dla każdej świnki.
   - `C3-lamp-hotspots-pixel-sized`: wszystkie hotspoty `lamp_toggle` w `room_1`, `garden`, `park` mają `w >= 14` i `h >= 14` (żaden nie ma `1x2 px`).
   - `C4-indoor-lamp-click-toggles-off-and-on`: kliknięcie w środek hotspotu lampy w `room_1` na `#pigCanvas` wyłącza lampę (`CuyLights.isOff(uid) === true`) i natychmiast zmniejsza liczbę aktywnych źródeł w `CanvasPig.debug()`, a ponowne kliknięcie włącza ją z powrotem.
   - `C5-outdoor-lantern-click-toggles`: w scenie `garden` i `park` kliknięcie w środek hotspotu `garden_lantern` / `lantern_post` przełącza stan `CuyLights.isOff(uid)`.
   - `C6-no-console-errors`.
3. Uruchom Weryfikację.

Prohibited: changing or deleting existing test assertions, new dependencies, touching files outside "Zmieniaj", editing production code, running git.
Log: write `docs/opt/log/PK-TF3.md` (max 10 linii).
