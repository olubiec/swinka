# PK-TF1: Test agent: 1 Hz state push CPU budget, litFrame cache hit rate, and uninterrupted play/drag during state ticks
Zmieniaj: tools/qa/ux-p71-lag-and-drag-fix.js, docs/opt/log/PK-TF1.md
Wymagane: tools/qa/ux-p71-lag-and-drag-fix.js
Weryfikacja: node --check tools/qa/ux-p71-lag-and-drag-fix.js && node tools/qa/ux-p71-lag-and-drag-fix.js
Pytania: nie zadawaj pytań i nie czekaj na odpowiedź. Jeśli czegoś brakuje lub coś jest niejasne, sam wybierz najrozsądniejsze rozwiązanie zgodne z AGENTS.md, zapisz decyzję w logu i dokończ do końca.
Limity (twarde): maks. 30 wywołań narzędzi. Linię Weryfikacja uruchom maks. 2 razy. Czytaj tylko pliki z Zmieniaj oraz pliki z sekcji "Czytaj tylko". Jesteś agentem testowym: NIE poprawiasz kodu produkcyjnego. Wada kodu = linia `DEFECT <id>: <opis>` w wyjściu testu i w logu; z `STRICT=1` kod wyjścia 1 przy jakimkolwiek DEFECT. Nie uruchamiaj git.
Nie ruszaj: AGENTS.md, docs/archive/, tasks/*, every file not listed in Zmieniaj
Goal: Independently test that 20 rapid `{ type: 'state' }` pushes with unchanged furniture do not call `CanvasPig.setThings` or reset active play/drag states, and that `litFrame` caches `getImageData` across identical frames.

Depends on: kroki F2F-2 i F2F-4 scalone w `main`. Biegnie w kroku F2F-5 równolegle z `PK-TF2..PK-TF4`.

Produces (names other packages rely on): `tools/qa/ux-p71-lag-and-drag-fix.js` (picked up by `ux-all.js`).

## Czytaj tylko (zakaz czytania innych plików)
- `docs/opt/foundations/RF1.md`
- `docs/opt/foundations/RIF1.md`
- `docs/opt/foundations/RIF2.md`
- `tools/qa/lib/ux.js`

## Nie czytaj
Pozostałych testów `tools/qa/ux-p*.js`.

## Steps
1. Przeczytaj `docs/opt/foundations/RF1.md`, `RIF1.md`, `RIF2.md` oraz `tools/qa/lib/ux.js`.
2. Napisz `tools/qa/ux-p71-lag-and-drag-fix.js` (Playwright, `openHome`, mock `seven`, okno `420x640`) ze wszystkimi przypadkami:
   - `L1-no-setThings-spam`: owiń `CanvasPig.setThings` licznikiem; wyślij 10 identycznych aktualizacji stanu co 50 ms — `setThings` wywołane `0` razy (brak przebudowy siatki i kasowania animacji co sekundę).
   - `L2-setLightScene-no-double-render`: owiń `CanvasPig.setLightScene`; wyślij 10 identycznych stanów — `setLightScene` wywołane `0` razy.
   - `L3-litFrame-cache-efficiency`: w scenie nocnej z włączoną lampą policz wywołania `CanvasRenderingContext2D.prototype.getImageData` na przestrzeni 30 klatek `requestAnimationFrame` przy stojącej śwince — liczba wywołań `<= 6` (zamiast `>= 30`).
   - `L4-drag-survives-state-push`: rozpocznij przeciąganie świnki (`pointerdown` na śwince, `pointermove` o +45 px w prawo i -20 px w górę, bez `pointerup`), sprawdź że `CanvasPig.isDragging() === true` i `CanvasPig.debug().pigs[0].x` przesunęło się o >= 30 px w trakcie trzymania myszy; następnie wyślij 3 zdarzenia `state` z mostka w trakcie trzymania myszy i potwierdź, że `debug().pigs[0].x` NIE cofnęło się do starej pozycji!
   - `L5-frame-time-budget`: średni czas wykonania 60 kolejnych klatek podczas 5 pushy stanu `< 8 ms`.
   - `L6-no-console-errors`.
3. Uruchom Weryfikację.

Prohibited: changing or deleting existing test assertions, new dependencies, touching files outside "Zmieniaj", editing production code, running git.
Log: write `docs/opt/log/PK-TF1.md` (max 10 linii).
