# PK-PF-BAR: Restore clean classic places bar with readable Edit button and fit 16:9 canvas stage without brown frames
Zmieniaj: web/home/index.html, web/home/style.css, web/home/features/places/feature.css, web/home/features/places/edit-panel.css, docs/opt/log/PK-PF-BAR.md
Weryfikacja: node tools/qa/ux-p47-bar.js && node tools/qa/ux-p66-viewport-matrix.js && node tools/qa/check-assets.js
Pytania: nie zadawaj pytań i nie czekaj na odpowiedź. Jeśli czegoś brakuje lub coś jest niejasne, sam wybierz najrozsądniejsze rozwiązanie zgodne z AGENTS.md, zapisz decyzję w logu i dokończ do końca.
Limity (twarde): maks. 35 wywołań narzędzi. Linię Weryfikacja uruchom maks. 2 razy. Czytaj tylko pliki z Zmieniaj oraz pliki z sekcji "Czytaj tylko". Nie uruchamiaj git.
Nie ruszaj: AGENTS.md, docs/archive/, tasks/*, every file not listed in Zmieniaj
Goal: Restore the clean pre-F2 places switcher bar with a readable `"Edit"` text button and eliminate the huge brown frames around `#pigCanvas` by sizing the canvas to `width: 100%; height: auto; aspect-ratio: 16 / 9;` inside an auto-height `.stage-viewport`, while keeping `ux-p47-bar.js` and `ux-p66-viewport-matrix.js` green.

Depends on: `docs/opt/foundations/RF2.md`. Biegnie w kroku F2F-2 równolegle z 6 innymi paczkami.

Produces (names other packages rely on): Clean classic `.places-bar` in `index.html` and `places/feature.css`, fitted 16:9 `.stage-viewport` and `#pigCanvas` in `style.css` and `places/feature.css`.

## Czytaj tylko (zakaz czytania innych plików)
- `docs/opt/foundations/RF2.md`
- `web/home/index.html` linie 65-95
- `web/home/style.css` linie 145-190, 370-425
- `web/home/features/places/feature.css`
- `web/home/features/places/edit-panel.css`
- `tools/qa/ux-p47-bar.js`
- `tools/qa/ux-p66-viewport-matrix.js`

## Nie czytaj
Wszystkich pozostałych plików w repozytorium.

## Steps
1. Przeczytaj `docs/opt/foundations/RF2.md` oraz `tools/qa/ux-p47-bar.js` i `tools/qa/ux-p66-viewport-matrix.js`.
2. W `web/home/index.html`:
   - Zachowaj strukturę `#placesBar` z `#placesPrevBtn`, `.places-bar-plate` > `#placesBarTitle`, `#placesNextBtn` i `#placesEditBtn`, oraz wpisz czytelny tekst `Edit` wewnątrz `<button type="button" class="places-bar-edit" id="placesEditBtn" aria-label="Edit" aria-pressed="false" title="Edit">Edit</button>`.
3. W `web/home/features/places/feature.css` i `web/home/features/places/edit-panel.css`:
   - Przywróć czysty wygląd paska `.places-bar` sprzed F2 (`height: 24px`, `padding: 0 4px`, `background-color: var(--ui-wood-2)`, `border-top: 2px solid var(--ui-wood-1)`, `border-bottom: 2px solid var(--ui-wood-0)`, ciemna drewniana plakietka tytułu `background-color: var(--ui-wood-0); border: 1px solid var(--ui-wood-1); border-radius: 2px; padding: 1px 10px; color: var(--ui-cream-1);`, czytelny przycisk tekstowy `#placesEditBtn` z `border-image: var(--ui-btn_normal) 6 fill / 6px; color: var(--ui-ink); font-size: 9px; font-weight: bold; padding: 1px 7px;`).
   - Uwaga na kompatybilność z `tools/qa/ux-p47-bar.js` (nie wolno zmieniać `ux-p47-bar.js`!): sprawdź w `RF2.md`, co dokładnie sprawdza `ux-p47-bar.js` (np. obecność ciągów `nav_bar_frame.png`, `nav_title_plate.png`, `nav_btn_edit` w tekście `feature.css` oraz różny `getComputedStyle(btn).backgroundImage` na `#placesEditBtn` w stanach normal / `:hover` / `.active`) i spełnij te warunki w `feature.css` (np. używając subtelnego `background-image` na `#placesEditBtn` obok tekstu `"Edit"` lub zachowując referencje w arkuszu zgodnie z `RF2.md`), tak aby pasek wyglądał czysto i miał wyraźny napis `"Edit"`, a `ux-p47-bar.js` przechodził w 100%!
4. W `web/home/style.css` (370-425) i `web/home/features/places/feature.css`:
   - Zlikwiduj ogromne brązowe ramki wokół sceny: ustaw `.stage-viewport` na `flex: 0 0 auto; height: auto; max-height: calc(100vh - 340px); min-height: 80px; padding: 0;` oraz `#pigCanvas` na `width: 100%; height: auto; max-width: 100%; max-height: 100%; aspect-ratio: 16 / 9; display: block; object-fit: contain; image-rendering: pixelated;`.
   - Upewnij się, że we wszystkich rozmiarach okien z `ux-p66-viewport-matrix.js` (`420x640`, `400x620`, `420x600`, `360x560`) oraz w trybie Edit z otwartą szufladą dolny pasek `#btnMore` mieści się w oknie (`bottom <= window.innerHeight`) i nie ma pustych brązowych pasów nad/pod sceną.
5. Uruchom Weryfikację (`ux-p47-bar.js`, `ux-p66-viewport-matrix.js`, `check-assets.js`).

Prohibited: changing or deleting existing test assertions, new dependencies, touching files outside "Zmieniaj", running git.
Log: write `docs/opt/log/PK-PF-BAR.md` (max 10 linii).
