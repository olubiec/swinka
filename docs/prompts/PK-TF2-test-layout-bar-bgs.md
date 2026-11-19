# PK-TF2: Test agent: classic places bar, 16:9 canvas fit without brown borders, outdoor background details, and all 10 Park items
Zmieniaj: tools/qa/ux-p72-layout-bar-bgs.js, docs/opt/log/PK-TF2.md
Wymagane: tools/qa/ux-p72-layout-bar-bgs.js
Weryfikacja: node --check tools/qa/ux-p72-layout-bar-bgs.js && node tools/qa/ux-p72-layout-bar-bgs.js
Pytania: nie zadawaj pytań i nie czekaj na odpowiedź. Jeśli czegoś brakuje lub coś jest niejasne, sam wybierz najrozsądniejsze rozwiązanie zgodne z AGENTS.md, zapisz decyzję w logu i dokończ do końca.
Limity (twarde): maks. 30 wywołań narzędzi. Linię Weryfikacja uruchom maks. 2 razy. Czytaj tylko pliki z Zmieniaj oraz pliki z sekcji "Czytaj tylko". Jesteś agentem testowym: NIE poprawiasz kodu produkcyjnego. Wada kodu = linia `DEFECT <id>: <opis>`; z `STRICT=1` kod wyjścia 1 przy jakimkolwiek DEFECT. Nie uruchamiaj git.
Nie ruszaj: AGENTS.md, docs/archive/, tasks/*, every file not listed in Zmieniaj
Goal: Independently verify that the places bar has the clean classic look with readable `"Edit"` text, `#pigCanvas` fills the stage width at 16:9 without huge brown borders above/below, `#btnMore` fits inside `420x640`, outdoor backgrounds contain their restored scenery pixels, and `park` spawns all 10 default items inside the 16x9 grid.

Depends on: kroki F2F-2 i F2F-4 scalone w `main`. Biegnie w kroku F2F-5 równolegle z `PK-TF1..PK-TF4`.

Produces (names other packages rely on): `tools/qa/ux-p72-layout-bar-bgs.js` (picked up by `ux-all.js`).

## Czytaj tylko (zakaz czytania innych plików)
- `docs/opt/foundations/RF2.md`
- `docs/opt/foundations/RF3.md`
- `tools/qa/lib/ux.js`

## Nie czytaj
Pozostałych testów `tools/qa/ux-p*.js`.

## Steps
1. Przeczytaj `docs/opt/foundations/RF2.md`, `RF3.md` oraz `tools/qa/lib/ux.js`.
2. Napisz `tools/qa/ux-p72-layout-bar-bgs.js` (Playwright, `openHome`, mock `seven`, okno `420x640`) ze wszystkimi przypadkami:
   - `B1-classic-bar-edit-text`: `#placesEditBtn` jest widoczny i jego `textContent.trim()` zawiera `"Edit"`, a wysokość `#placesBar` mieści się w `22..30 px`.
   - `B2-no-huge-brown-frames`: w oknie `420x640` we wszystkich 5 głównych scenach (`room_1`, `garden`, `farm`, `market`, `park`) szerokość `#pigCanvas` na ekranie (`getBoundingClientRect().width`) wynosi `>= 380 px` (a nie `256 px`!), a różnica wysokości między `.stage-viewport` i `#pigCanvas` wynosi `<= 8 px` (brak wielkich brązowych pasów nad/pod sceną).
   - `B3-bottom-bar-fits`: `#btnMore.getBoundingClientRect().bottom <= window.innerHeight` zarówno w trybie zwykłym, jak i z otwartą szufladą Edit.
   - `B4-outdoor-bgs-restored`: pliki `assets/world/bg/market_night.png`, `farm_day.png`, `garden_day.png`, `park_day.png` zawierają przywrócone detale tła (jasne piksele lampek w górnej części `market_night.png`, płot na horyzoncie w `farm_day.png`, furtkę w `garden_day.png`, altanę/mostek w `park_day.png`).
   - `B5-park-all-10-items-in-bounds`: w `assets/data/outdoor_defaults.json` i w załadowanej scenie `park` wszystkie 10 domyślnych obiektów mają `x + w <= 16` i są obecne w `CanvasPig.debug().things`.
   - `B6-no-console-errors`.
3. Uruchom Weryfikację.

Prohibited: changing or deleting existing test assertions, new dependencies, touching files outside "Zmieniaj", editing production code, running git.
Log: write `docs/opt/log/PK-TF2.md` (max 10 linii).
