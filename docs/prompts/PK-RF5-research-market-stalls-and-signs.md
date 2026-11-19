# PK-RF5: Research: market stall categories, signboard icons ("szyldy"), order board hotspot and outside-click close
Zmieniaj: docs/opt/foundations/RF5.md, docs/opt/log/PK-RF5.md
Weryfikacja: node tools/qa/foundation-check.js docs/opt/foundations/RF5.md 5
Pytania: nie zadawaj pytań i nie czekaj na odpowiedź. Jeśli czegoś brakuje lub coś jest niejasne, sam wybierz najrozsądniejsze rozwiązanie zgodne z AGENTS.md, zapisz decyzję w logu i dokończ do końca.
Limity (twarde): maks. 25 wywołań narzędzi. To jest paczka badawcza: kod, dane i testy w repo tylko do odczytu. Piszesz wyłącznie dokumenty z Zmieniaj. Nie uruchamiaj git. Czytaj wyłącznie wskazane pliki. Weryfikację uruchom maks. 2 razy.
Nie ruszaj: AGENTS.md, docs/archive/, tasks/*, every file not listed in Zmieniaj
Goal: Design the visual and logical split of the 3 market stalls + order board so each stall has its own category, its own signboard icon ("szyld") drawn on the canvas canopy, and closes when clicking the scene background, while keeping backwards compatibility with existing `ux-p43-market.js` and `ux-p60-hotspots-adv.js` tests.

Depends on: nothing (tylko odczyt). Działa w kroku F2F-1 równolegle z `PK-RF1..PK-RF6`.

Produces (names other packages rely on): `docs/opt/foundations/RF5.md` (1500..16000 znaków, sekcje `## 1.` .. `## 5.`):
- `## 1.` Current market stalls and order board state (`market/feature.js`, `hotspots.js`, `scenes.js`)
- `## 2.` Compatibility requirements from `ux-p43-market.js` and `ux-p60-hotspots-adv.js`
- `## 3.` Per-stall specialization design (`seeds`, `food`, `toys`/`decor`, plus `orders` board) and outside-click close
- `## 4.` Canvas signboard ("szyld") rendering specification in `scenes.js`
- `## 5.` Prompt fixes

## Czytaj tylko (zakaz czytania innych plików)
- `web/home/features/market/feature.js` linie 1-370
- `web/home/features/market/feature.css` linie 1-160
- `web/home/lib/hotspots.js` linie 1-100
- `assets/data/scene_hotspots.json` (cały)
- `tools/qa/ux-p43-market.js` (cały)

## Nie czytaj
Wszystkich pozostałych plików w repozytorium.

## Steps
1. Przeczytaj `web/home/features/market/feature.js` i `tools/qa/ux-p43-market.js`. Zapisz dokładnie, jakich elementów DOM i zachowań wymaga `ux-p43-market.js` (np. `#marketStallPanel`, przyciski `.stall-cat-tab`, `.stall-mode-tab`, wysyłanie `market_buy` / `market_sell`, zamykanie na `Escape` i `.stall-close-btn`).
2. Zaprojektuj specjalizację straganów i tablicy zleceń tak, aby dla gracza każdy obiekt na targu miał jasną rolę, a jednocześnie testy `ux-p43-market.js` przechodziły w 100%:
   - `stall_left` (`fx:market:stall_left`, `stall:seeds`): **Seed Stall** — otwiera się na kategorii `seeds`, wyróżnia zakładkę `seeds` jako główną kategorię tego straganu (pozostałe zakładki `.stall-cat-tab` pozostają w DOM dla kompatybilności z testem `M3`, ale nagłówek straganu jasno pokazuje szyld i specjalizację `"Seed Stall — Farm Seeds"`).
   - `stall_center` (`fx:market:stall_center`, `stall:food`): **Food Stall** — otwiera się na kategorii `food` (`"Food Stall — Fresh Veggies & Treats"`).
   - `stall_right` (`fx:market:stall_right`, `stall:craft` / `stall:toys` / `stall:decor`): **Craft & Decor Stall** — otwiera się na kategorii `toys`/`decor` (`"Craft Stall — Toys & Decor"`).
   - `order_board` (`fx:market:order_board`, `stall:orders`): **Market Orders Board** — kliknięcie tablicy zleceń obok lewego straganu otwiera panel na nowej zakładce/widoku **Orders** (sprzedaż zebranych plonów z farmy wg zleceń `state.market.orders` przez `market_fill_order { orderIndex }` lub przełączenie na `Sell from bag`).
3. Zaprojektuj zamykanie `#marketStallPanel` po kliknięciu w tło sceny (`#pigCanvas` `pointerdown` w fazie capture, z małym opóźnieniem czasowym `performance.now() - openedAt > 80`, żeby ten sam klik, który otwiera stragan, nie zamknął go od razu).
4. Zaprojektuj rysowanie czytelnych szyldów ("szyld") na daszkach 3 straganów w `web/home/features/places/scenes.js` (`drawMarketSignboards(ctx, state)` wywoływane w warstwie `market` albo rysowanie szyldu nad `stall_left`, `stall_center`, `stall_right`): mała drewniana tabliczka 14×12 px na środku daszku każdego straganu z pixel-artową ikonką (zielony kiełek/liść na `stall_left`, pomarańczowa marchewka na `stall_center`, różowa piłeczka/gwiazdka dekoracji na `stall_right`).
5. Uruchom Weryfikację (`node tools/qa/foundation-check.js docs/opt/foundations/RF5.md 5`).

Prohibited: edycja kodu, danych i testów, new dependencies, touching files outside "Zmieniaj", running git.
Log: write `docs/opt/log/PK-RF5.md` (max 10 linii).
