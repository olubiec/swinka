# PK-P47c: Places bar with the new nav art (wave P47c)
Zmieniaj: web/home/index.html, web/home/style.css, web/home/features/places/feature.css, web/home/features/places/feature.js, tools/qa/ux-p47-bar.js, docs/opt/log/PK-P47c.md
Wymagane: tools/qa/ux-p47-bar.js
Weryfikacja: node --check web/home/features/places/feature.js && node --check tools/qa/ux-p47-bar.js && node tools/qa/ux-p47-bar.js && node tools/qa/check-assets.js
Pytania: nie zadawaj pytań i nie czekaj na odpowiedź. Jeśli czegoś brakuje lub coś jest niejasne, sam wybierz najrozsądniejsze rozwiązanie zgodne z AGENTS.md, zapisz decyzję w logu i dokończ do końca.
Limity (twarde): maks. 50 wywołań narzędzi. Linię Weryfikacja uruchom maks. 2 razy. Czytaj tylko pliki z Zmieniaj oraz zakresy linii znalezione przez grep; PNG nav_* wolno oglądać (po jednym). Nie diagnozuj niczego spoza Zmieniaj. Gdy test pada na czymś, czego Twoja zmiana nie dotyka: zapisz nazwę testu i 5 linii błędu w logu, status BLOCKED, zakończ. Po błędzie we własnym kodzie wolno jedna poprawka i jeden ponowny bieg, potem zakończ jako BLOCKED. Nie uruchamiaj web-smoke.js.
Nie ruszaj: AGENTS.md, docs/archive/, tasks/*, every file not listed in Zmieniaj
Goal: Replace the flat places bar (stretched `header_banner`, old 16x16 arrows) with the delivered D3 art: 9-slice frame, title plate, 3-state arrows and a 3-state Edit button.
Depends on: pliki badawcze F2-1: `docs/opt/foundations/R24.md` sekcje 3, 4 i 6 (przyczyna ucięcia dołu okna i poprawka CSS: wygrywa nad krokiem 3 poniżej), `R33.md` sekcja 6. Assety D3 są w repo.

## Praca równoległa (obowiązkowe)
Ta paczka startuje w tym samym kroku co kilkanaście innych paczek, a każda edytuje inne pliki. Nie czekaj na nie i nie czytaj ich testów ani logów. Stan kodu to `main` z początku kroku: API innych paczek tego kroku jeszcze nie istnieje. Dane testowe buduj we WŁASNYM pliku testu; API rodzeństwa bierz z kontraktu w pliku badawczym wskazanym w "Czytaj" i w testach zastępuj atrapą (komunikat `STUB <nazwa>`). Plików sklejających (`index.html`, `app.js`, `features/index.json`, `canvas-pig.js`, `places/feature.js`, `edit-panel.js`) nie edytujesz, jeśli nie ma ich w Zmieniaj: wpina je krok F2-4. Gdy "Prompt fixes" w pliku badawczym przeczą krokom tego promptu, wygrywa plik badawczy; różnicę zapisz w logu.


## Kontekst (fakty sprawdzone 11.11.2026, nie szukaj drugi raz)
- Pliki w `assets/ui/`: `nav_bar_frame.png` (48x26) + `.json` `{"slice":[8,8,8,8]}`, `nav_title_plate.png` (64x18) + `.json` `{"slice":[5,5,5,5]}`, `nav_btn_arrow_{left,right}.png`, `_hover`, `_pressed` (20x20), `nav_btn_edit.png`, `_hover`, `_active` (24x20). Wszystkie przechodzą `check-assets.js`.
- Markup dziś: `web/home/index.html` ok. linii 72-76: `#placesBar` z `#placesPrevBtn`, `#placesBarTitle`, `#placesNextBtn`; brak tabliczki tytułu i przycisku Edit. Style: `web/home/features/places/feature.css` (linie ~6-99) i starsze reguły `.places-bar` w `web/home/style.css` (~1510-1599, `var(--ui-wood-2)`, `arrow_left.png`).
- Wejście do trybu Edit istnieje już w module miejsc (`features/places/edit-panel.js`, otwierane z `places/feature.js`); znajdź grepem, jak jest dziś wywoływane, i podłącz do niego nowy przycisk, nie pisz nowej logiki edycji.
- Obrazy ładuj ścieżkami względnymi jak reszta UI (np. jak `assets/ui/close_btn.png` w CSS). Rysowanie pikseli: `image-rendering: pixelated`. `border-image` z wartościami slice z plików `.json`.
- Nazwy w UI po angielsku; tekst renderuje gra (nie ma liter w PNG).

## Poprawki 17.11 (uwaga właściciela 24)
- Poprawka układu dolnego paska wg `R24.md` sekcja 4 (selektory i wartości) jest częścią tej paczki: pliki `index.html`, `style.css`, `places/feature.css`. Test T5 uruchom dla rozmiarów okna z `R24.md` sekcja 6 (co najmniej 420x640 i 400x620) i dla wszystkich 7 scen w trybie zwykłym i Edit z otwartą szufladą. Część C# (`HomeWindow.cs`) robi PK-P24c.

## Steps
1. `index.html`: owiń `#placesBarTitle` tabliczką (`.places-bar-plate`), dodaj `#placesEditBtn` (przycisk, `aria-pressed`, `aria-label="Edit"`) w `#placesBar`; zachowaj istniejące id strzałek.
2. `feature.css`: `.places-bar` z `border-image` z `nav_bar_frame.png` (slice 8, wysokość 26 px skalowana całkowicie jak reszta UI), `.places-bar-plate` z `nav_title_plate.png` (slice 5), jasny tekst z dobrym kontrastem (AA) bez poziomych linii przez napis, strzałki jako `background-image` z trzema stanami (normal, `:hover`, `:active` = pressed, `:focus-visible` z konturem), `#placesEditBtn` z trzema stanami (normal, hover, `.active` / `[aria-pressed="true"]`). Pole napisu mieści 12-14 znaków (ucinaj `text-overflow: ellipsis`).
3. `style.css`: usuń stare, dublujące reguły `.places-bar*` (tylko te, które przejmuje `feature.css`); nie ruszaj reszty, **ale upewnij się, że układ pionowy `.home-shell` / `.stage-viewport` + dolny pasek z `#btnMore` mieści się w oknie `420x640` bez przycinania dołu okna (sprawdź `flex`/`min-height`/`max-height` i wysokość `#placesBar`)**.
4. `feature.js`: kliknięcie `#placesEditBtn` przełącza tryb Edit jak dotychczasowe wejście; ustaw `aria-pressed` i klasę `active` zgodnie ze stanem trybu (również po zamknięciu panelu innym sposobem i po zmianie sceny). Blokada: gdy scena nie ma trybu Edit lub przeciąganie świnki trwa, przycisk jest wyłączony tak jak dotychczasowe wejście.
5. Testy FIRST, `tools/qa/ux-p47-bar.js` (Playwright, `tools/qa/lib/ux.js`): T1 wszystkie pliki `nav_*` z `.json` istnieją i CSS odwołuje się do `nav_bar_frame.png`, `nav_title_plate.png`, `nav_btn_edit*.png`, obu stanów strzałek; T2 `#placesEditBtn` istnieje i ma 3 różne stany wyglądu (hover/active mają inne `background-image` niż normalny); T3 klik Edit otwiera panel i ustawia `aria-pressed="true"`, ponowny klik zamyka; T4 strzałki przełączają scenę i tytuł na tabliczce się zmienia; T5 najdłuższa nazwa miejsca nie wychodzi poza tabliczkę (szerokość elementu tekstu <= szerokość tabliczki), **a dolny pasek (`#btnMore`) nie jest ucięty (`getBoundingClientRect().bottom <= window.innerHeight` przy `420x640`)**; T6 brak błędów w konsoli.
6. Uruchom Weryfikacja; napraw do zielonego.

Prohibited: changing or deleting existing test assertions, new dependencies, touching files outside "Zmieniaj", extra refactors, running git, drawing or editing any PNG.
Log: write `docs/opt/log/PK-P47c.md` (max 10 lines: decisions, jak wywoływany jest Edit, różnice od planu, BLOCKED reason if any).
