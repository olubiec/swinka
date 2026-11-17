# PK-P6b: Edit drawer: room templates (wallpaper + floor themes) module
Zmieniaj: web/home/features/places/edit-templates.js, tools/qa/ux-p6-templates.js, docs/opt/log/PK-P6b.md
Weryfikacja: node --check web/home/features/places/edit-templates.js && node --check tools/qa/ux-p6-templates.js && node tools/qa/ux-p6-templates.js
Pytania: nie zadawaj pytań i nie czekaj na odpowiedź. Jeśli czegoś brakuje lub coś jest niejasne, sam wybierz najrozsądniejsze rozwiązanie zgodne z AGENTS.md, zapisz decyzję w logu i dokończ do końca.
Limity (twarde): maks. 50 wywołań narzędzi. Linię Weryfikacja uruchom maks. 2 razy. Czytaj tylko pliki z Zmieniaj/Wymagane, pliki wskazane w sekcji "Czytaj" oraz zakresy linii znalezione przez grep. Nie diagnozuj niczego spoza Zmieniaj. Gdy test pada na czymś, czego Twoja zmiana nie dotyka: zapisz nazwę testu i 5 linii błędu w logu, status BLOCKED, zakończ. Po błędzie we własnym kodzie wolno jedna poprawka i jeden ponowny bieg, potem zakończ jako BLOCKED. Nie uruchamiaj web-smoke.js.
Nie ruszaj: AGENTS.md, docs/archive/, tasks/*, every file not listed in Zmieniaj
Goal: Room templates from `pig_rooms.json` themes: a pure planner that turns a theme into `room_skin` messages (wallpaper and floor only, furniture untouched) plus a small picker UI; PK-PE2 mounts it.

Depends on: pliki badawcze z kroku F2-1 (`docs/opt/foundations/R*.md`, patrz "Czytaj"); brak zależności od innych paczek tego kroku.

Produces (names other packages rely on): `window.EditTemplates` with `themes(state)`, `plan(themeId, state, roomId)` -> `{messages:[...]}` or `{refused:"reason"}`, `build(container, ctx)` as fixed in R27 section 4.

## Czytaj (w tej kolejności, tylko wskazane sekcje)
- `docs/opt/foundations/R27.md` sekcja 4 (kontrakt: DOSŁOWNIE).
- `docs/opt/foundations/R6.md` sekcja 2.2 i decyzja 2 ("tylko tapeta i podłoga").
- `assets/data/pig_rooms.json` (motywy).

## Praca równoległa (obowiązkowe)
Ta paczka startuje w tym samym kroku co kilkanaście innych paczek, a każda edytuje inne pliki. Nie czekaj na nie i nie czytaj ich testów ani logów. Stan kodu to `main` z początku kroku: API innych paczek tego kroku jeszcze nie istnieje. Dane testowe buduj we WŁASNYM pliku testu; API rodzeństwa bierz z kontraktu w pliku badawczym wskazanym w "Czytaj" i w testach zastępuj atrapą (komunikat `STUB <nazwa>`). Plików sklejających (`index.html`, `app.js`, `features/index.json`, `canvas-pig.js`, `places/feature.js`, `edit-panel.js`) nie edytujesz, jeśli nie ma ich w Zmieniaj: wpina je krok F2-4. Gdy "Prompt fixes" w pliku badawczym przeczą krokom tego promptu, wygrywa plik badawczy; różnicę zapisz w logu.

## Kontekst (fakty sprawdzone 17.11.2026, nie szukaj drugi raz)
- Home: `web/home/` (`index.html`, `app.js`, `bridge.js`, `canvas-pig.js` ok. 3300 linii, `features/places/{feature,scenes,edit-panel,room-geometry,mock}.js`, `lib/{lights,palette,sprites,ui-assets}.js`). Moduły funkcji ładuje `app.js:963-995` z `features/index.json` (`features/<id>/feature.js`, w trybie mock też `features/<id>/mock.js`).
- Płótno: sceny 256x144 (docelowo wszystkie; pokój dziś 192x112 z siatki, park 384x192 do czasu PK-P47a/PK-P47r), świnka dorosła 32x24. Orientacyjne kotwice `canvas-pig.js` (numery linii się przesuwają, szukaj grepem): `addLayer` ~393, `isFree` ~596, `findPath` ~684, `setScene` ~872, `depthScale`/`bScale` ~904-921, `pickRandomWalkTarget` ~1131, `renderList` ~1244, `drawThing` ~1327, `applySceneLight` ~2711, `drawContactShadow` ~2721, `litFrame` ~2776, publiczny obiekt `CanvasPig` ~3024.
- Dane: `assets/data/world_items.json` (przedmiot: `id,name,place[],w,h,price,comfort,layer(ground|floor|wall),icon`; lampy: `lamp_mushroom` i `lamp_floor` w1 h2 floor, `lamp_post`/`lamp_salt`/`lamp_oil` w1 h1 floor, `lamp_arc` wall 2x3, `fairy_lights` wall 3x1), `assets/data/lights.json` (źródła z `toggle`, `frames`, `fps`), `assets/data/place_scenes.json`, `assets/data/pig_rooms.json` (motywy ~52-87), `assets/world/atlas.json`.
- Zapis i C#: `src/Cuy.Core/World/{WorldState,RoomLayoutOps}.cs`, `src/Cuy/dotNet/Features/RoomsFeature.cs` (`room_place/room_move/room_remove/room_flip/room_skin`, `room_skin` ok. linii 471), walidacja `src/Cuy.Core/Input/Validation/<Feature>Messages.cs`, kontrakty `docs/contracts/<feature>.md`.
- Okno gry ma stały rozmiar 420x640 (`src/Cuy/dotNet/HomeWindow.cs:232-235`, przeliczane o DPI ok. 284-291). Helper testów Playwright domyślnie otwiera 400x620 (`tools/qa/lib/ux.js`), więc testy układu podają rozmiar jawnie.
- Testy: Playwright przez `tools/qa/lib/ux.js` (`startServer`, `openHome`, `openMore`, `openFromMore`), mock `CuyScenesMock.state('seven')` (7 scen), `tools/qa/ux-all.js` uruchamia wszystkie `ux-p<liczba>-*.js` (nowe testy nazywaj w tym wzorcu). Core: `tests/Cuy.Core.Tests` (xUnit, `RepoFile`, `ManualClock`).
- Zasady AGENTS.md: liczby w `assets/data/*.json`, nowe pola zapisu z bezpiecznymi domyślnymi, zmiany liczb za flagą `Balance`, JS nie liczy cen, per-feature pliki (kontrakt, walidacja, mock).

## Steps
1. Testy FIRST, `tools/qa/ux-p6-templates.js` (Node + `page.setContent` jak w PK-P6a): M1 `themes-listed` (każdy motyw z `pig_rooms.json`), M2 `plan-two-messages` (dokładnie `room_skin` dla `wallpaper` i `floor`, pole `room` = id pokoju), M3 `furniture-untouched` (plan nie zawiera `room_remove`/`room_move`), M4 `not-owned-refused` (nieposiadana tapeta: `refused` z nazwą przedmiotu do kupienia), M5 `already-applied-noop`, M6 `unknown-theme`, M7 `outdoor-room-refused` (miejsca zewnętrzne: brak szablonów), M8 `build-renders-buttons-disabled-when-refused`, M9 `click-sends-messages-in-order` (atrapa `send`), M10 `no-console-errors`.
2. Zaimplementuj moduł zgodnie z kontraktem.
3. Uruchom Weryfikację; napraw do zielonego.

Moduł JS ma działać w Node (`require`) i w przeglądarce (`window.<Nazwa>`): wzorzec UMD jak `web/home/lib/lights.js` (`if (typeof module !== "undefined") module.exports = api; else root.Nazwa = api;`), ES2020, bez zależności, logika w czystych funkcjach, losowość i czas wstrzykiwane (parametr `rng`, `now`), brak dostępu do DOM poza wyraźnie nazwaną funkcją budującą DOM.

Prohibited: changing or deleting existing test assertions, new dependencies, touching files outside "Zmieniaj", extra refactors, running git.

Log: write `docs/opt/log/PK-P6b.md` (max 10 linii: decyzje i dlaczego, dokładne nazwy API/pól, różnice od pliku badawczego, atrapy `STUB` użyte w testach, BLOCKED reason if any). Do not run git.
