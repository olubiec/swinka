# PK-PE2: edit-panel.js: Outdoor tab and hint, fixture lock, filters, templates, skins, lamp placement
Zmieniaj: web/home/features/places/edit-panel.js, web/home/features/places/edit-panel.css, tools/qa/ux-p52-edit-wiring.js, docs/opt/log/PK-PE2.md
Weryfikacja: node --check web/home/features/places/edit-panel.js && node --check tools/qa/ux-p52-edit-wiring.js && node tools/qa/ux-p52-edit-wiring.js && node tools/qa/ux-p40-edit-drawer.js && node tools/qa/ux-p40-edit-move.js && node tools/qa/ux-p40-edit-place.js && node tools/qa/ux-p40-edit-upgrade.js
Pytania: nie zadawaj pytań i nie czekaj na odpowiedź. Jeśli czegoś brakuje lub coś jest niejasne, sam wybierz najrozsądniejsze rozwiązanie zgodne z AGENTS.md, zapisz decyzję w logu i dokończ do końca.
Limity (twarde): maks. 75 wywołań narzędzi. Linię Weryfikacja uruchom maks. 2 razy. Czytaj tylko pliki z Zmieniaj/Wymagane, pliki wskazane w sekcji "Czytaj" oraz zakresy linii znalezione przez grep. Nie diagnozuj niczego spoza Zmieniaj. Gdy test pada na czymś, czego Twoja zmiana nie dotyka: zapisz nazwę testu i 5 linii błędu w logu, status BLOCKED, zakończ. Po błędzie we własnym kodzie wolno jedna poprawka i jeden ponowny bieg, potem zakończ jako BLOCKED. Nie uruchamiaj web-smoke.js.
Nie ruszaj: AGENTS.md, docs/archive/, tasks/*, every file not listed in Zmieniaj
Goal: The Edit drawer gets everything the owner asked for: outdoor objects are movable and stashable (fixtures movable only, with the reason shown), a visible Edit hint, category tabs and search, room templates, wallpaper and floor choice (note 27) and sane lamp placement (note 25).

Depends on: krok F2-3 (plik `RI*.md` wskazany w "Czytaj") i cały krok F2-2 scalony w `main`. Ta paczka biegnie w F2-4 równolegle z pozostałymi paczkami sklejającymi (inne pliki).

Produces (names other packages rely on): Drawer tab `Outdoor`, `.edit-hint`, fixture toast, mounts of `EditFilters`, `EditTemplates`, `EditSkins`, lamp-aware ghost (red/green).

## Czytaj (w tej kolejności, tylko wskazane sekcje)
- `docs/opt/foundations/RI2.md` CAŁY (kotwice; wygrywa).
- `docs/opt/foundations/R27.md` sekcja 5, `R25.md` sekcje 3 i 5, `R30.md` sekcja 5 (fixture, toast, hint), `R28.md` sekcja 3 (przesunięcie pokoju w kadrze dla duchów i przeciągania), `R33.md` sekcja 4.

## Kontekst (fakty sprawdzone 17.11.2026, nie szukaj drugi raz)
- Home: `web/home/` (`index.html`, `app.js`, `bridge.js`, `canvas-pig.js` ok. 3300 linii, `features/places/{feature,scenes,edit-panel,room-geometry,mock}.js`, `lib/{lights,palette,sprites,ui-assets}.js`). Moduły funkcji ładuje `app.js:963-995` z `features/index.json` (`features/<id>/feature.js`, w trybie mock też `features/<id>/mock.js`).
- Płótno: sceny 256x144 (docelowo wszystkie; pokój dziś 192x112 z siatki, park 384x192 do czasu PK-P47a/PK-P47r), świnka dorosła 32x24. Orientacyjne kotwice `canvas-pig.js` (numery linii się przesuwają, szukaj grepem): `addLayer` ~393, `isFree` ~596, `findPath` ~684, `setScene` ~872, `depthScale`/`bScale` ~904-921, `pickRandomWalkTarget` ~1131, `renderList` ~1244, `drawThing` ~1327, `applySceneLight` ~2711, `drawContactShadow` ~2721, `litFrame` ~2776, publiczny obiekt `CanvasPig` ~3024.
- Dane: `assets/data/world_items.json` (przedmiot: `id,name,place[],w,h,price,comfort,layer(ground|floor|wall),icon`; lampy: `lamp_mushroom` i `lamp_floor` w1 h2 floor, `lamp_post`/`lamp_salt`/`lamp_oil` w1 h1 floor, `lamp_arc` wall 2x3, `fairy_lights` wall 3x1), `assets/data/lights.json` (źródła z `toggle`, `frames`, `fps`), `assets/data/place_scenes.json`, `assets/data/pig_rooms.json` (motywy ~52-87), `assets/world/atlas.json`.
- Zapis i C#: `src/Cuy.Core/World/{WorldState,RoomLayoutOps}.cs`, `src/Cuy/dotNet/Features/RoomsFeature.cs` (`room_place/room_move/room_remove/room_flip/room_skin`, `room_skin` ok. linii 471), walidacja `src/Cuy.Core/Input/Validation/<Feature>Messages.cs`, kontrakty `docs/contracts/<feature>.md`.
- Okno gry ma stały rozmiar 420x640 (`src/Cuy/dotNet/HomeWindow.cs:232-235`, przeliczane o DPI ok. 284-291). Helper testów Playwright domyślnie otwiera 400x620 (`tools/qa/lib/ux.js`), więc testy układu podają rozmiar jawnie.
- Testy: Playwright przez `tools/qa/lib/ux.js` (`startServer`, `openHome`, `openMore`, `openFromMore`), mock `CuyScenesMock.state('seven')` (7 scen), `tools/qa/ux-all.js` uruchamia wszystkie `ux-p<liczba>-*.js` (nowe testy nazywaj w tym wzorcu). Core: `tests/Cuy.Core.Tests` (xUnit, `RepoFile`, `ManualClock`).
- Zasady AGENTS.md: liczby w `assets/data/*.json`, nowe pola zapisu z bezpiecznymi domyślnymi, zmiany liczb za flagą `Balance`, JS nie liczy cen, per-feature pliki (kontrakt, walidacja, mock).

## Steps
1. Testy FIRST, `tools/qa/ux-p52-edit-wiring.js` (Playwright, mock z wszystkimi scenami odblokowanymi i `bg_clean:true` dla ogrodu; moduły `edit-*.js` doładowane `addScriptTag`): E1 `outdoor-object-selectable`, E2 `move-sends-room_move` (dokładny kształt), E3 `move-onto-blocker-rejected` (czerwony duch, nic nie wysłane), E4 `stash-decorative` (`room_remove`, przedmiot w zakładce Outdoor), E5 `place-from-drawer`, E6 `fixture-cannot-stash` (toast z powodem, przesunięcie działa), E7 `edit-hint-visible-only-in-edit` (kursor `grab`), E8 `flip`, E9 `tabs-and-search-filter-cards` (po wpisaniu "lamp" tylko lampy), E10 `template-applies-two-messages`, E11 `skins-panel-sends-room_skin` (tylko pokoje; na dworze brak panelu), E12 `lamp-floor-against-back-wall-green`, E13 `lamp-wall-layer-only-on-wall`, E14 `drawer-fits-420x640` (nie zasłania paska miejsc ani przycisku More), E15 `no-console-errors`.
2. Zaimplementuj sześć elementów z `RI2.md` sekcja 4, rozszerzając istniejące funkcje szuflady (nie przepisując); style w `edit-panel.css` z klasami biblioteki.
3. Uruchom Weryfikację; napraw do zielonego.

## Sklejanie (obowiązkowe)
Kod z kroku F2-2 jest już w `main`; moduły istnieją naprawdę. Używaj RZECZYWISTYCH nazw z `docs/opt/foundations/RI*.md` (wygrywa nad kontraktem R* i nad tym promptem; różnice zapisz w logu). Wołaj moduły defensywnie (`window.X && window.X.fn`), bo kolejność ładowania wpina równolegle paczka PK-APP2: w testach tej paczki ładuj brakujące skrypty przez `page.addScriptTag({path})`. Do `Weryfikacja` wchodzą też istniejące testy regresji z listy w kroku; jeśli któryś padał PRZED Twoją zmianą (sprawdź `docs/opt/log/baseline-smoke.txt` i logi F2-2), zapisz to w logu zamiast naprawiać.

## Zasady grafiki i interfejsu (obowiązkowe)
- Legenda stylu: `docs/STYL_SWIATA.md` (czytaj pkt 0-2 i 5, ok. 60 linii) i paleta `assets/data/style_palette.json` (42 kolory). Zakaz kolorów spoza palety, zakaz `#ffffff` i `#000000`, zakaz gradientów CSS, rozmycia i cieni z blur. `image-rendering: pixelated`, skala tylko całkowita, pozycje w pełnych pikselach.
- Biblioteka pixel artów: najpierw szukaj gotowego w `assets/world/`, `assets/ui/`, `assets/icons/`, `assets/props/`. Nowy sprite tylko gdy go tam naprawdę nie ma.
- Interfejs jak reszta gry: drewniane ramki i 9-slice z `assets/ui/`, kolory `--ui-*`, czcionka `--ui-font`. Zakaz własnych SVG i glifów tekstowych.

Prohibited: changing or deleting existing test assertions, new dependencies, touching files outside "Zmieniaj", extra refactors, running git.

Log: write `docs/opt/log/PK-PE2.md` (max 10 linii: decyzje i dlaczego, dokładne nazwy API/pól, różnice od pliku badawczego, atrapy `STUB` użyte w testach, BLOCKED reason if any). Do not run git.
