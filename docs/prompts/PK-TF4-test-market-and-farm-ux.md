# PK-TF4: Test agent: market stall signboards, specialized stall categories, Orders board, farm seed inventory counts, and close on background click
Zmieniaj: tools/qa/ux-p74-market-farm-ux.js, docs/opt/log/PK-TF4.md
Wymagane: tools/qa/ux-p74-market-farm-ux.js
Weryfikacja: node --check tools/qa/ux-p74-market-farm-ux.js && node tools/qa/ux-p74-market-farm-ux.js
Pytania: nie zadawaj pytań i nie czekaj na odpowiedź. Jeśli czegoś brakuje lub coś jest niejasne, sam wybierz najrozsądniejsze rozwiązanie zgodne z AGENTS.md, zapisz decyzję w logu i dokończ do końca.
Limity (twarde): maks. 30 wywołań narzędzi. Linię Weryfikacja uruchom maks. 2 razy. Czytaj tylko pliki z Zmieniaj oraz pliki z sekcji "Czytaj tylko". Jesteś agentem testowym: NIE poprawiasz kodu produkcyjnego. Wada kodu = linia `DEFECT <id>: <opis>`; z `STRICT=1` kod wyjścia 1 przy jakimkolwiek DEFECT. Nie uruchamiaj git.
Nie ruszaj: AGENTS.md, docs/archive/, tasks/*, every file not listed in Zmieniaj
Goal: Independently test that each market stall has a visible signboard drawn on the canvas and opens on its own specialized category, the order board opens Market Orders, the farm plot popover shows `In bag: X` for every seed, and both farm and market popovers close via `×` AND via clicking the scene background (`#pigCanvas`).

Depends on: kroki F2F-2 i F2F-4 scalone w `main`. Biegnie w kroku F2F-5 równolegle z `PK-TF1..PK-TF4`.

Produces (names other packages rely on): `tools/qa/ux-p74-market-farm-ux.js` (picked up by `ux-all.js`).

## Czytaj tylko (zakaz czytania innych plików)
- `docs/opt/foundations/RF5.md`
- `docs/opt/foundations/RF6.md`
- `tools/qa/lib/ux.js`

## Nie czytaj
Pozostałych testów `tools/qa/ux-p*.js`.

## Steps
1. Przeczytaj `docs/opt/foundations/RF5.md`, `RF6.md` oraz `tools/qa/lib/ux.js`.
2. Napisz `tools/qa/ux-p74-market-farm-ux.js` (Playwright, `openHome`, mock `seven`, okno `420x640`) ze wszystkimi przypadkami:
   - `M1-each-stall-has-distinct-category-and-signboard`: w scenie `market` kliknięcie `stall:seeds` otwiera panel z kategorią `seeds` i tytułem zawierającym `Seed`, `stall:food` z kategorią `food` i tytułem zawierającym `Food`, a `stall:craft` z kategorią `toys`/`decor` i tytułem zawierającym `Craft`, oraz na `#pigCanvas` na daszkach wszystkich 3 straganów narysowane są różniące się kolorami piksele szyldów.
   - `M2-order-board-hotspot-opens-orders`: w scenie `market` istnieje hotspot `stall:orders` (`order_board`) i kliknięcie go otwiera widok zleceń targowych z listą `orders`.
   - `M3-market-panel-closes-on-background-click`: gdy `#marketStallPanel` jest otwarty, kliknięcie w wolne miejsce tła na `#pigCanvas` (np. niebo `(20, 20)`) zamyka panel.
   - `F1-farm-popover-shows-owned-seed-counts`: w scenie `farm` kliknięcie pustej grządki otwiera `#farmPopover`, w którym każdy przycisk `.farm-seed-btn` wyświetla posiadaną liczbę sztuk w plecaku (`In bag:`).
   - `F2-farm-popover-has-close-x-and-closes-on-background-click`: `#farmPopover` ma widoczny przycisk `.farm-popover-close` (`×`), który go zamyka; po ponownym otwarciu grządki kliknięcie w tło sceny na `#pigCanvas` (poza grządkami, np. `(20, 20)`) również zamyka `#farmPopover`.
   - `F3-farm-goto-market-button`: kliknięcie `.farm-goto-market-btn` w menu grządki przełącza scenę na `market`.
   - `F4-no-console-errors`.
3. Uruchom Weryfikację.

Prohibited: changing or deleting existing test assertions, new dependencies, touching files outside "Zmieniaj", editing production code, running git.
Log: write `docs/opt/log/PK-TF4.md` (max 10 linii).
