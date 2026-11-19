# PK-RF6: Research: farm plot popover close button, outside-click dismissal, inventory seed counts and Farm-Market guidance
Zmieniaj: docs/opt/foundations/RF6.md, docs/opt/log/PK-RF6.md
Weryfikacja: node tools/qa/foundation-check.js docs/opt/foundations/RF6.md 5
Pytania: nie zadawaj pytań i nie czekaj na odpowiedź. Jeśli czegoś brakuje lub coś jest niejasne, sam wybierz najrozsądniejsze rozwiązanie zgodne z AGENTS.md, zapisz decyzję w logu i dokończ do końca.
Limity (twarde): maks. 25 wywołań narzędzi. To jest paczka badawcza: kod, dane i testy w repo tylko do odczytu. Piszesz wyłącznie dokumenty z Zmieniaj. Nie uruchamiaj git. Czytaj wyłącznie wskazane pliki. Weryfikację uruchom maks. 2 razy.
Nie ruszaj: AGENTS.md, docs/archive/, tasks/*, every file not listed in Zmieniaj
Goal: Analyze `web/home/features/farm/feature.js` and `feature.css` to specify the `×` close button, background-click dismissal, owned crop/seed stock counts (`In bag: X`) on every planting row, and a clear visual Farm->Market loop explanation.

Depends on: nothing (tylko odczyt). Działa w kroku F2F-1 równolegle z `PK-RF1..PK-RF6`.

Produces (names other packages rely on): `docs/opt/foundations/RF6.md` (1500..16000 znaków, sekcje `## 1.` .. `## 5.`):
- `## 1.` Current farm popover structure and why closing & planting are confusing (`farm/feature.js`)
- `## 2.` Compatibility requirements from `tools/qa/ux-p43-farm.js`
- `## 3.` Close button (`×`) + outside-click / canvas-click dismissal specification
- `## 4.` Owned inventory count (`In bag: X`) + `"Buy seeds at Market ->"` button specification
- `## 5.` Prompt fixes

## Czytaj tylko (zakaz czytania innych plików)
- `web/home/features/farm/feature.js` (cały, ok. 395 linii)
- `web/home/features/farm/feature.css` (cały, ok. 155 linii)
- `tools/qa/ux-p43-farm.js` (cały)
- `docs/contracts/farm.md` (cały)

## Nie czytaj
Wszystkich pozostałych plików w repozytorium.

## Steps
1. Przeczytaj `web/home/features/farm/feature.js`, `web/home/features/farm/feature.css` oraz `tools/qa/ux-p43-farm.js`. Sprawdź wszystkie selektory używane przez `ux-p43-farm.js` (`#farmPopover`, `.farm-popover`, `.farm-seed-btn`, `.farm-action-btn`, `#farmStripOverlay`, `#farmHarvestAllBtn`, `#farmWaterAllBtn`), aby żadna asercja nie została naruszona.
2. Zaprojektuj nagłówek `.farm-popover-head` z tytułem i widocznym przyciskiem zamykania `<button type="button" class="farm-popover-close" aria-label="Close">&times;</button>`, oraz zamykanie `#farmPopover` po kliknięciu (`pointerdown` w fazie capture) poza `.farm-popover` (w tym na `#pigCanvas` i `.stage-viewport`), z bezpiecznym strażnikiem czasu otwarcia (`performance.now() - openedAt > 80`).
3. Sprawdź, skąd `state` w `farm/feature.js` pobiera stan ekwipunku gracza (`state.inventory` — obiekt `{ [itemId]: count }` lub tablica `{ id, count }` oraz `state.clovers`). Zaprojektuj wyświetlanie w każdym wierszu sadzenia `.farm-seed-btn`:
   - nazwy rośliny i czasu wzrostu,
   - kosztu sadzenia w koniczynkach (`cost`),
   - **liczby posiadanych sztuk w plecaku** (`In bag: X` / `Owned: X`), żeby gracz przed zasadzeniem widział, ile danej rośliny już ma,
   - krótkiego paska podpowiedzi na dole menu grządki: `"Harvest crops here -> sell or buy more at Market"` z przyciskiem `"Go to Market"`, który przełącza scenę przez `window.CuyPlaces && window.CuyPlaces.setCurrentPlace && window.CuyPlaces.setCurrentPlace('market')`.
4. Zapisz dokładną specyfikację HTML/JS/CSS dla `PK-PF-FRM`.
5. Uruchom Weryfikację (`node tools/qa/foundation-check.js docs/opt/foundations/RF6.md 5`).

Prohibited: edycja kodu, danych i testów, new dependencies, touching files outside "Zmieniaj", running git.
Log: write `docs/opt/log/PK-RF6.md` (max 10 linii).
