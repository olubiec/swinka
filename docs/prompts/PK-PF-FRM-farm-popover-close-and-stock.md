# PK-PF-FRM: Add close (x) button and background-click close to farm plot popover, show owned seed/crop counts, and link Farm to Market
Zmieniaj: web/home/features/farm/feature.js, web/home/features/farm/feature.css, docs/opt/log/PK-PF-FRM.md
Weryfikacja: node --check web/home/features/farm/feature.js && node tools/qa/ux-p43-farm.js && node tools/qa/ux-p60-hotspots-adv.js
Pytania: nie zadawaj pytań i nie czekaj na odpowiedź. Jeśli czegoś brakuje lub coś jest niejasne, sam wybierz najrozsądniejsze rozwiązanie zgodne z AGENTS.md, zapisz decyzję w logu i dokończ do końca.
Limity (twarde): maks. 35 wywołań narzędzi. Linię Weryfikacja uruchom maks. 2 razy. Czytaj tylko pliki z Zmieniaj oraz pliki z sekcji "Czytaj tylko". Nie uruchamiaj git.
Nie ruszaj: AGENTS.md, docs/archive/, tasks/*, every file not listed in Zmieniaj
Goal: Add an explicit `×` close button (`.farm-popover-close`) to `.farm-popover`, close the farm popover when clicking the scene background (`#pigCanvas` or outside `.farm-popover`), show owned inventory counts (`In bag: X`) on every planting option, and add a clear Farm->Market footer hint with a `"Go to Market"` button.

Depends on: `docs/opt/foundations/RF6.md`. Biegnie w kroku F2F-2 równolegle z 6 innymi paczkami.

Produces (names other packages rely on): Updated `web/home/features/farm/feature.js` and `feature.css`.

## Czytaj tylko (zakaz czytania innych plików)
- `docs/opt/foundations/RF6.md`
- `web/home/features/farm/feature.js`
- `web/home/features/farm/feature.css`
- `tools/qa/ux-p43-farm.js`

## Nie czytaj
Wszystkich pozostałych plików w repozytorium.

## Steps
1. Przeczytaj `docs/opt/foundations/RF6.md`, `web/home/features/farm/feature.js`, `web/home/features/farm/feature.css` oraz `tools/qa/ux-p43-farm.js`.
2. W `web/home/features/farm/feature.js`:
   - W nagłówku `.farm-popover-head` każdego stanu grządki/drzewka dodaj po prawej stronie przycisk `<button type="button" class="farm-popover-close" aria-label="Close">&times;</button>`, który wywołuje `closePopover()`.
   - Zarejestruj globalny nasłuchiwacz `document.addEventListener('pointerdown', ..., true)` (oraz `mousedown` w fazie capture), który zamyka `#farmPopover`, jeśli kliknięcie nastąpiło poza `#farmPopover` (np. na `#pigCanvas` lub `.stage-viewport`), pod warunkiem że od otwarcia minęło `> 80 ms` (lub jeśli kliknięto pusty punkt `#pigCanvas` niebędący hotspotem grządki).
   - Dodaj pomocniczą funkcję `getOwnedCount(st, cropId)` czytającą `st.inventory` (zarówno kształt obiektu `{ [id]: count }`, jak i tablicy `[{ id, count }]`) i wyświetlaj w każdym wierszu `.farm-seed-btn` wyraźną odznakę `<span class="farm-seed-owned">In bag: X</span>` obok kosztu w koniczynkach (`cost`).
   - Pod listą sadzenia w `.farm-popover` dodaj czytelny pasek `.farm-popover-footer` z krótką informacją `"Grow crops -> feed Cuy or sell at Market"` i przyciskiem `<button type="button" class="farm-goto-market-btn">Go to Market</button>`, który zamyka popover i wywołuje `window.CuyPlaces && window.CuyPlaces.setCurrentPlace && window.CuyPlaces.setCurrentPlace('market')`.
3. Dodaj style `.farm-popover-head`, `.farm-popover-close`, `.farm-seed-owned`, `.farm-popover-footer`, `.farm-goto-market-btn` w `web/home/features/farm/feature.css` (tylko tokeny `--ui-*`).
4. Uruchom Weryfikację (`node --check`, `ux-p43-farm.js`, `ux-p60-hotspots-adv.js`).

Prohibited: changing or deleting existing test assertions, new dependencies, touching files outside "Zmieniaj", running git.
Log: write `docs/opt/log/PK-PF-FRM.md` (max 10 linii).
