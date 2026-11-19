# PK-PF-MKT: Specialize market stalls by category with header badge, add Orders board tab, and close on scene background click
Zmieniaj: web/home/features/market/feature.js, web/home/features/market/feature.css, docs/opt/log/PK-PF-MKT.md
Weryfikacja: node --check web/home/features/market/feature.js && node tools/qa/ux-p43-market.js && node tools/qa/ux-p60-hotspots-adv.js
Pytania: nie zadawaj pytań i nie czekaj na odpowiedź. Jeśli czegoś brakuje lub coś jest niejasne, sam wybierz najrozsądniejsze rozwiązanie zgodne z AGENTS.md, zapisz decyzję w logu i dokończ do końca.
Limity (twarde): maks. 35 wywołań narzędzi. Linię Weryfikacja uruchom maks. 2 razy. Czytaj tylko pliki z Zmieniaj oraz pliki z sekcji "Czytaj tylko". Nie uruchamiaj git.
Nie ruszaj: AGENTS.md, docs/archive/, tasks/*, every file not listed in Zmieniaj
Goal: Make each of the 3 market stalls clearly specialized for its own category (`seeds` = Seed Stall, `food` = Food Stall, `toys`/`decor` = Craft & Decor Stall), support clicking the Market Orders board (`stall:orders`) to fulfill crop orders for clovers, and close the stall popover when clicking the scene background (`#pigCanvas`).

Depends on: `docs/opt/foundations/RF5.md`. Biegnie w kroku F2F-2 równolegle z 6 innymi paczkami.

Produces (names other packages rely on): Updated `web/home/features/market/feature.js` and `feature.css`.

## Czytaj tylko (zakaz czytania innych plików)
- `docs/opt/foundations/RF5.md`
- `web/home/features/market/feature.js`
- `web/home/features/market/feature.css`
- `tools/qa/ux-p43-market.js`

## Nie czytaj
Wszystkich pozostałych plików w repozytorium.

## Steps
1. Przeczytaj `docs/opt/foundations/RF5.md`, `web/home/features/market/feature.js`, `web/home/features/market/feature.css` oraz `tools/qa/ux-p43-market.js`.
2. W `web/home/features/market/feature.js`:
   - Dodaj czytelny szyld i podtytuł w nagłówku `#marketStallPanel` dla każdego straganu:
     - `seeds` (lewy stragan): ikona kiełka + `"Seed Stall — Farm Seeds & Crops"` (domyślna kategoria `seeds`),
     - `food` (środkowy stragan): ikona marchewki + `"Food Stall — Fresh Veggies & Treats"` (domyślna kategoria `food`),
     - `toys` / `craft` / `decor` (prawy stragan): ikona zabawki + `"Craft Stall — Toys & Decor"` (domyślna kategoria `toys`, z bezpośrednim przełącznikiem `Toys` / `Decor` i wyróżnieniem kategorii tego straganu, przy zachowaniu przycisków `.stall-cat-tab` w DOM dla pełnej kompatybilności z `ux-p43-market.js`),
     - `orders` (`stall:orders`, tablica zleceń obok lewego straganu): otwiera widok **Market Orders** (lista aktualnych zleceń z `state.market.orders` z nagrodą w koniczynkach, posiadaną liczbą w plecaku `In bag: X/Y` oraz przyciskiem `"Deliver"` wysyłającym `{ type: 'market_fill_order', orderIndex }`), a także dostępny jako przycisk/zakładka w panelu targu.
   - W każdym wierszu kupna i sprzedaży pokaż wyraźnie `In bag: X` (ile sztuk gracz już ma w plecaku).
   - Dodaj zamykanie `#marketStallPanel` po kliknięciu (`pointerdown` w fazie capture na `document`) poza `#marketStallPanel` (np. w `#pigCanvas` / tło sceny), z zabezpieczeniem `performance.now() - openedAt > 80`, żeby kliknięcie w hotspot straganu na `#pigCanvas` otwierające panel nie zamknęło go w tym samym zdarzeniu.
3. Dopracuj style w `web/home/features/market/feature.css` (zgodnie z paletą `--ui-*`).
4. Uruchom Weryfikację (`node --check`, `ux-p43-market.js`, `ux-p60-hotspots-adv.js`).

Prohibited: changing or deleting existing test assertions, new dependencies, touching files outside "Zmieniaj", running git.
Log: write `docs/opt/log/PK-PF-MKT.md` (max 10 linii).
