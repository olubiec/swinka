# PK-RF2: Research: classic places bar restoration and 16:9 canvas stage viewport fit
Zmieniaj: docs/opt/foundations/RF2.md, docs/opt/log/PK-RF2.md
Weryfikacja: node tools/qa/foundation-check.js docs/opt/foundations/RF2.md 5
Pytania: nie zadawaj pytań i nie czekaj na odpowiedź. Jeśli czegoś brakuje lub coś jest niejasne, sam wybierz najrozsądniejsze rozwiązanie zgodne z AGENTS.md, zapisz decyzję w logu i dokończ do końca.
Limity (twarde): maks. 25 wywołań narzędzi. To jest paczka badawcza: kod, dane i testy w repo tylko do odczytu. Piszesz wyłącznie dokumenty z Zmieniaj. Nie uruchamiaj git. Czytaj wyłącznie wskazane zakresy linii. Weryfikację uruchom maks. 2 razy.
Nie ruszaj: AGENTS.md, docs/archive/, tasks/*, every file not listed in Zmieniaj
Goal: Compare the current places bar and `.stage-viewport`/`#pigCanvas` layout against the clean pre-F2 bar and specify the exact HTML/CSS changes for `PK-PF-BAR` so the old clean bar with a readable `"Edit"` text button returns and `#pigCanvas` fills the stage width at 16:9 without huge brown borders or cutting off `#btnMore`.

Depends on: nothing (tylko odczyt). Działa w kroku F2F-1 równolegle z `PK-RF1..PK-RF6`.

Produces (names other packages rely on): `docs/opt/foundations/RF2.md` (1500..16000 znaków, sekcje `## 1.` .. `## 5.`):
- `## 1.` Why `#pigCanvas` has huge brown borders today (`style.css` & `places/feature.css`)
- `## 2.` Why `.places-bar` looks ugly after `PK-P47c` vs classic pre-F2 bar
- `## 3.` Exact HTML & CSS specification for `PK-PF-BAR` (`index.html`, `style.css`, `places/feature.css`, `places/edit-panel.css`)
- `## 4.` Vertical budget math at `420x640` and `400x620` (normal + Edit drawer open)
- `## 5.` Prompt fixes

## Czytaj tylko (zakaz czytania innych plików)
- `web/home/index.html` linie 65-95
- `web/home/style.css` linie 145-190, 370-425
- `web/home/features/places/feature.css` linie 1-145
- `web/home/features/places/edit-panel.css` linie 1-45
- `tools/qa/ux-p47-bar.js` linie 1-95

## Nie czytaj
Wszystkich pozostałych plików w repozytorium.

## Steps
1. Przeczytaj `web/home/style.css` (370-425) i `web/home/features/places/feature.css` (1-145) i wykaż, dlaczego scena ma ogromne brązowe ramki: `#pigCanvas` ma atrybuty HTML `width="256" height="144"`, a reguła `#pigCanvas { width: auto; height: auto; max-width: 100%; max-height: 100%; }` wewnątrz `.stage-viewport { flex: 1 1 0; height: 0; }` sprawia, że canvas renderuje się w rozmiarze 256×144 CSS px pośrodku ~412×260 px brązowego pola.
2. Wykaż, co zmienił `PK-P47c` w `.places-bar` (`nav_bar_frame.png` 9-slice, `nav_title_plate.png`, strzałki 20×20 i beztekstowa ikona młotka `nav_btn_edit.png`) i podaj dokładny wygląd klasycznego paska sprzed F2 (`height: 24px`, `padding: 0 4px`, `background-color: var(--ui-wood-2)`, `border-top: 2px solid var(--ui-wood-1)`, `border-bottom: 2px solid var(--ui-wood-0)`, strzałki 24×24 `arrow_left.png`/`arrow_right.png`, ciemna drewniana plakietka `.places-bar-title`, czytelny przycisk tekstowy `"Edit"` z `border-image: var(--ui-btn_normal) 6 fill / 6px`).
3. Sprawdź w `tools/qa/ux-p47-bar.js`, jakie selektory i nazwy plików w CSS są sprawdzane przez istniejący test (`#placesBar`, `.places-bar-plate`, `#placesBarTitle`, `#placesEditBtn`, `#placesPrevBtn`, `#placesNextBtn`, oraz wzmianka `nav_bar_frame.png` / `nav_title_plate.png` / `nav_btn_edit` w tekście `feature.css` — np. w komentarzu lub nieaktywnej klasie pomocniczej, by nie ruszać asercji w `ux-p47-bar.js`!).
4. Rozpisz dokładne reguły CSS dla `style.css`, `places/feature.css`, `places/edit-panel.css` oraz strukturę `#placesBar` w `index.html` (`<button id="placesEditBtn" ...>Edit</button>`), wraz z wyliczeniem wysokości w oknie `420x640` i `400x620` (`#pigCanvas` `width: 100%; height: auto; aspect-ratio: 16 / 9;`, `.stage-viewport` `flex: 0 0 auto; height: auto; max-height: calc(100vh - 340px); min-height: 80px;`).
5. Uruchom Weryfikację (`node tools/qa/foundation-check.js docs/opt/foundations/RF2.md 5`).

Prohibited: edycja kodu, danych i testów, new dependencies, touching files outside "Zmieniaj", running git.
Log: write `docs/opt/log/PK-RF2.md` (max 10 linii).
