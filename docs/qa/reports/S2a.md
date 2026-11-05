## S2a (G18 reszta UI kit + bg:menu)

**Podpięte (skórki, rozmiary bez zmian poza opisanymi):**
- Zakładki miejsc (`.place-btn`): `tab_off` / `tab_on` (hover, `is-pending`); tekst jasny na ciemnej płytce; `is-locked` = przezroczystość 0,6.
- Zakładki pokoi w oknie Pokoje (`.room-tab`): `tab_off` / `tab_on` dla wybranego; tekst ciemny na żółtej płytce.
- Waluta (`.currency-badge`): `badge`, kolor tekstu `--ui-text`.
- Karty potrzeb (`.need-card`): `card`, marginesy dobrane tak, by wysokość karty się nie zmieniła.
- Paski potrzeb (`.progress-groove` / `.progress-fill.level-*`): `bar_groove` 3-slice, wypełnienie `bar_fill_high/mid/low` (kafel 4x6).
- Pole imienia (`.onboard-input`): `field`, focus to obrys zamiast zmiany koloru ramki.
- Przełączniki ustawień (`.retro-toggle`): `toggle_on` / `toggle_off` w rozmiarze 48x24 (2x z 24x12; wcześniej 40x20).
- Kwadraciki daily (`.daily-streak-box`): `dot_full` / `dot_empty` 16x16 (2x z 8x8, rozmiar bez zmian).
- Menu (`.actions-section`): tło `assets/world/bg/menu.png` w skali 3x (768x432), wyśrodkowane za przyciskami.
- Naprawy przy okazji: pasek miejsc ma boki 2 px (przy 3 px w 360 px ucinało "Market"); tekst podpowiedzi na scenie ("Pet me") był ucinany przez `line-height: 0` z `.stage-viewport`.

**Pominięte i dlaczego:**
- `bar_wood` (belka modala): nagłówki modali zostają płaskie, bo 9-slice dodałby po 5 px ramki do wysokości.
- `tooltip` (dymki): dymki "Ready!" i myśli rysuje canvas (`canvas-pig.js`), nie CSS; nic w CSS do skórowania.
- `sep_h` / `sep_v` (separatory): na Home nie ma elementów-separatorów; dodanie znaczników zmieniłoby układ. Klasy `.ui-sep-*` już istnieją, nieużyte.
- `slot` / `slot_on`: na Home nie ma slotów (sloty są w decor/farm, poza S2a).
- Tło menu: `menu.png` nie był używany (grep po `web/` i `assets/world/bg`). Podpięte w `.actions-section`, bo okno Home w aplikacji ma przezroczyste body, a sekcja przycisków jest jedynym miejscem, gdzie tło widać.

**Uwagi:**
- `var(--ui-*)` z `url()` w plikach `features/*/feature.css` daje 404 (URL rozwiązywany względem arkusza, który używa zmiennej). Dlatego przełączniki i kwadraciki daily są w `web/home/style.css`.
- Nie zmieniano: `assets/ui/ui.json`, `assets/data/lights.json`, asercji testów, plików binarnych.
- Zauważone, nie naprawione (poza S2a): etykiety w Ustawieniach są słabo czytelne (`.settings-group` ma tło `--c-wood`, tekst `--c-wood-dark`).

**Zrzuty:** `docs/qa/screens/s2a_home_420.png`, `docs/qa/screens/s2a_rooms_420.png` (420x640, deviceScaleFactor 2).

**Sprawdzenia:** check-css-vars OK, check-assets OK, web-smoke OK (404 na `mock.js` to stan sprzed zmian), visual-matrix: 68 komórek, 0 uwag, 0 małych przycisków.
