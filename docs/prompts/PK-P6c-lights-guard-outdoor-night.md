# PK-P6c: Lights: toggle guard, outdoor night auto-on, campfire and torch sources
Zmieniaj: web/home/lib/lights.js, assets/data/lights.json, tools/qa/ux-p6-lights.js, docs/opt/log/PK-P6c.md
Weryfikacja: node --check web/home/lib/lights.js && node --check tools/qa/ux-p6-lights.js && node tools/qa/lights-test.js && node tools/qa/ux-p6-lights.js
Pytania: nie zadawaj pytań i nie czekaj na odpowiedź. Jeśli czegoś brakuje lub coś jest niejasne, sam wybierz najrozsądniejsze rozwiązanie zgodne z AGENTS.md, zapisz decyzję w logu i dokończ do końca.
Limity (twarde): maks. 50 wywołań narzędzi. Linię Weryfikacja uruchom maks. 2 razy. Czytaj tylko pliki z Zmieniaj/Wymagane, pliki wskazane w sekcji "Czytaj" oraz zakresy linii znalezione przez grep. Nie diagnozuj niczego spoza Zmieniaj. Gdy test pada na czymś, czego Twoja zmiana nie dotyka: zapisz nazwę testu i 5 linii błędu w logu, status BLOCKED, zakończ. Po błędzie we własnym kodzie wolno jedna poprawka i jeden ponowny bieg, potem zakończ jako BLOCKED. Nie uruchamiaj web-smoke.js.
Nie ruszaj: AGENTS.md, docs/archive/, tasks/*, every file not listed in Zmieniaj
Goal: The light engine and its data: sources with `toggle:false` (windows) can never be switched by a manual override, outdoor sources (torch, lantern, oil lamp, brazier, campfire) switch on by themselves at dusk and night, and every animated source has valid frames/fps/radius.

Depends on: pliki badawcze z kroku F2-1 (`docs/opt/foundations/R*.md`, patrz "Czytaj"); brak zależności od innych paczek tego kroku.

Produces (names other packages rely on): `Lights.activeSources` honours `toggle:false`; `autoOn` covers outdoor sources; `lights.json` entries for `campfire` (base + flame + small flame), `torch`, `lantern_garden`, `lamp_oil`, `brazier` with `frames`, `fps`, radius, colour from the palette. Read by PK-CV2 (frame slicing) and PK-PF2 (night wiring).

## Czytaj (w tej kolejności, tylko wskazane sekcje)
- `docs/opt/foundations/R26.md` sekcja 3 i 5 (stan straży `toggle:false`, podział na paczki).
- `docs/opt/foundations/R31.md` sekcja 5 i 6 (paski animacji, nocne światło na dworze).
- `docs/opt/foundations/R35.md` sekcja 3 (dane świateł).
- `tools/qa/lights-test.js` (istniejący wzorzec testu Node; jego asercji NIE zmieniaj) i `web/home/lib/lights.js` (grep `activeSources`, `autoOn`, `build`).

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
1. Testy FIRST w `tools/qa/ux-p6-lights.js` (czysty Node, wzorzec `lights-test.js`): L1 `window-ignores-manual` (źródło z `toggle:false`: wpis ręczny `manual[key]=true/false` nie zmienia wyniku `autoOn`), L2 `outdoor-auto-dusk` (torch, lantern_garden, lamp_oil, brazier, campfire: włączone o 20:00 i 23:00, wyłączone o 12:00), L3 `indoor-manual-unchanged` (lampy wnętrzowe nadal sterowane ręcznie wg dotychczasowych reguł), L4 `data-valid` (każde źródło: `frames` >= 1, `fps` > 0 gdy `frames` > 1, promień > 0, kolor z `style_palette.json`; dla `<id>_on.png` istniejącego na dysku `frames` zgadza się z proporcją szerokość/wysokość odczytaną z nagłówka IHDR), L5 `campfire-complete` (wpisy dla bazy i płomienia), L6 `deterministic` (te same wejścia, ten sam wynik), L7 `no-nan` (godziny 0..23, wszystkie źródła: brak NaN/undefined).
2. Zaimplementuj minimum w `lights.js` i `lights.json`; zmiany liczb tylko w JSON. Nie zmieniaj publicznych nazw funkcji.
3. Uruchom Weryfikację i napraw do zielonego. Jeśli plik badawczy mówi, że straż `toggle:false` już istnieje (F1-fix2), nie dubluj jej: dopisz tylko testy i resztę zakresu.

Prohibited: changing or deleting existing test assertions, new dependencies, touching files outside "Zmieniaj", extra refactors, running git.

Log: write `docs/opt/log/PK-P6c.md` (max 10 linii: decyzje i dlaczego, dokładne nazwy API/pól, różnice od pliku badawczego, atrapy `STUB` użyte w testach, BLOCKED reason if any). Do not run git.
