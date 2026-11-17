# PK-R34: Research: test kit, fixtures and per-package test recipes
Zmieniaj: docs/opt/foundations/R34.md, docs/opt/log/PK-R34.md
Weryfikacja: node tools/qa/foundation-check.js docs/opt/foundations/R34.md 7
Pytania: nie zadawaj pytań i nie czekaj na odpowiedź. Jeśli czegoś brakuje lub coś jest niejasne, sam wybierz najrozsądniejsze rozwiązanie zgodne z AGENTS.md, zapisz decyzję w logu i dokończ do końca.
Limity (twarde): maks. 60 wywołań narzędzi. To jest paczka badawcza: kod, dane i testy w repo tylko do odczytu. Piszesz wyłącznie dokumenty z Zmieniaj. Wolno uruchamiać pomiarowe skrypty Playwright/Node, ale tylko takie, które leżą poza repo (katalog tymczasowy systemu) i niczego w repo nie zapisują. Nie uruchamiaj git. Czytaj zakresy linii znalezione przez grep, nie całe pliki; PNG wolno oglądać tylko te wymienione w krokach. Każde twierdzenie w dokumencie ma mieć plik:linia lub nazwę znalezioną grepem; czego nie sprawdziłeś, oznacz słowem UNVERIFIED. Weryfikację uruchom maks. 2 razy.
Nie ruszaj: AGENTS.md, docs/archive/, tasks/*, every file not listed in Zmieniaj
Goal: Give the test agents (PK-T1..PK-T13 and the implementers' own tests) one tested recipe book: helpers, mock states, clock control, pixel readback, perf measurement, old-save fixtures and a per-package case matrix.

Depends on: nothing (tylko odczyt). Działa w kroku F2-1 razem z innymi paczkami badawczymi; wynik czytają paczki kroków F2-2 i dalszych.

Produces (names other packages rely on): `docs/opt/foundations/R34.md` max 16000 znaków, sekcje numerowane `## 1.` .. `## 7.` dokładnie w tej kolejności:
- `## 1.` Helpery JS (sygnatury, przykłady)
- `## 2.` Mock: stany, czas, pora dnia, zapis
- `## 3.` Technika pikselowa i zrzuty
- `## 4.` Pomoce Core i fixture starych zapisów
- `## 5.` Wydajność: co i jak mierzyć
- `## 6.` Przepisy dla PK-T3..PK-T13
- `## 7.` Prompt fixes
Ostatnia sekcja to "Prompt fixes": lista `PK-xxx: stary tekst -> nowy tekst` dla paczek: PK-T1..PK-T13 i paczek F2-2 (wspólne uwagi). Każda sekcja z kontraktem (nazwy funkcji, pola, kształty komunikatów) podaje je DOSŁOWNIE, bo implementujące paczki kodują równolegle wyłącznie według tego pliku.

## Kontekst (fakty sprawdzone 17.11.2026, nie szukaj drugi raz)
- Home: `web/home/` (`index.html`, `app.js`, `bridge.js`, `canvas-pig.js` ok. 3300 linii, `features/places/{feature,scenes,edit-panel,room-geometry,mock}.js`, `lib/{lights,palette,sprites,ui-assets}.js`). Moduły funkcji ładuje `app.js:963-995` z `features/index.json` (`features/<id>/feature.js`, w trybie mock też `features/<id>/mock.js`).
- Płótno: sceny 256x144 (docelowo wszystkie; pokój dziś 192x112 z siatki, park 384x192 do czasu PK-P47a/PK-P47r), świnka dorosła 32x24. Orientacyjne kotwice `canvas-pig.js` (numery linii się przesuwają, szukaj grepem): `addLayer` ~393, `isFree` ~596, `findPath` ~684, `setScene` ~872, `depthScale`/`bScale` ~904-921, `pickRandomWalkTarget` ~1131, `renderList` ~1244, `drawThing` ~1327, `applySceneLight` ~2711, `drawContactShadow` ~2721, `litFrame` ~2776, publiczny obiekt `CanvasPig` ~3024.
- Dane: `assets/data/world_items.json` (przedmiot: `id,name,place[],w,h,price,comfort,layer(ground|floor|wall),icon`; lampy: `lamp_mushroom` i `lamp_floor` w1 h2 floor, `lamp_post`/`lamp_salt`/`lamp_oil` w1 h1 floor, `lamp_arc` wall 2x3, `fairy_lights` wall 3x1), `assets/data/lights.json` (źródła z `toggle`, `frames`, `fps`), `assets/data/place_scenes.json`, `assets/data/pig_rooms.json` (motywy ~52-87), `assets/world/atlas.json`.
- Zapis i C#: `src/Cuy.Core/World/{WorldState,RoomLayoutOps}.cs`, `src/Cuy/dotNet/Features/RoomsFeature.cs` (`room_place/room_move/room_remove/room_flip/room_skin`, `room_skin` ok. linii 471), walidacja `src/Cuy.Core/Input/Validation/<Feature>Messages.cs`, kontrakty `docs/contracts/<feature>.md`.
- Okno gry ma stały rozmiar 420x640 (`src/Cuy/dotNet/HomeWindow.cs:232-235`, przeliczane o DPI ok. 284-291). Helper testów Playwright domyślnie otwiera 400x620 (`tools/qa/lib/ux.js`), więc testy układu podają rozmiar jawnie.
- Testy: Playwright przez `tools/qa/lib/ux.js` (`startServer`, `openHome`, `openMore`, `openFromMore`), mock `CuyScenesMock.state('seven')` (7 scen), `tools/qa/ux-all.js` uruchamia wszystkie `ux-p<liczba>-*.js` (nowe testy nazywaj w tym wzorcu). Core: `tests/Cuy.Core.Tests` (xUnit, `RepoFile`, `ManualClock`).
- Zasady AGENTS.md: liczby w `assets/data/*.json`, nowe pola zapisu z bezpiecznymi domyślnymi, zmiany liczb za flagą `Balance`, JS nie liczy cen, per-feature pliki (kontrakt, walidacja, mock).

- Istniejące narzędzia do zbadania: `tools/qa/lib/ux.js`, `tools/qa/scene-overlay.js`, `tools/qa/screen-matrix.js`, `tools/qa/perf-soak.js`, `tools/qa/soak.js`, `tools/qa/lights-test.js`, `tools/qa/ux-p39-shots.js`, `tools/qa/ux-p44-shots.js`, `tools/qa/ux-p45-*.js`, `tools/qa/place-scenes-check.js`, mock `web/home/features/places/mock.js` (`CuyScenesMock.state(...)`), `web/home/bridge.js` (mock `registerMockHandler`, `registerMockState`, zegar mocka, `STORAGE_KEY`).
- Core: `tests/Cuy.Core.Tests` (143 plików), `RepoFile`, `ManualClock`, testy migracji `WorldMigrationTests.cs`, rozmiaru zapisu `WorldSaveSizeTests.cs`, walidacji `MessageValidatorTests`.

## Steps
1. Zrób inwentarz helperów JS: sygnatury i przykłady użycia z istniejących testów (`startServer`, `openHome`, `openMore`, `openFromMore`, czekanie na gotowość, przechwytywanie błędów konsoli, rozmiar okna).
2. Opisz, jak sterować stanem i czasem w mocku: `CuyScenesMock.state('seven')` i inne warianty, ustawienie pory dnia (`tod`), przyspieszenie czasu (spacer świnki, wędrówka między miejscami), trwały stan (`cuy_mock_state_v1`), jak wstrzyknąć instancje i świnki, jak zasymulować odpowiedź C# na wiadomość.
3. Opisz techniki pikselowe: odczyt płótna (`toDataURL`/`getImageData` w `page.evaluate`), wykrywanie świnki i lampy w prostokącie (współrzędne sceny -> piksele ekranu przez `CanvasPig.toScene`), tolerancje, zrzuty (`deviceScaleFactor`), porównania obrazów bez nowych zależności (czysty Node), determinizm (stały seed, stały czas).
4. Opisz pomoce Core: `RepoFile`, `ManualClock`, wstrzykiwanie tabel, fixture starych zapisów (gdzie leżą, jak dodać nowy), jak zbudować `Pet`/`GameSession` do testów integracyjnych walidacji komunikatów (`IMessageRuleSet`).
5. Opisz pomiary wydajności: co mierzyć w headless Chromium (czas klatki, liczba wywołań `drawImage`, pamięć przez `performance.memory` z `--enable-precise-memory-info`, liczba węzłów DOM, liczba nasłuchiwaczy przez opakowanie `addEventListener`), progi względne (stosunek do sceny bazowej), jak powtarzać pomiar, żeby był stabilny.
6. Dla każdej z paczek testowych PK-T3 (hotspoty), PK-T4 (wiele świnek), PK-T5 (szuflada Edit), PK-T6 (światło), PK-T7 (lampy), PK-T8 (zabawa i pogoda), PK-T9 (okno i skala), PK-T10 (zapis i walidacja), PK-T11 (scenariusze), PK-T12 (wydajność), PK-T13 (wizualne): przepis w 3-6 punktach (jaki stan mocka, jakie helpery, jakie asercje, na co uważać).
7. Uruchom Weryfikację (sprawdza tylko strukturę, 1500-16000 znaków, brak TODO/TBD). Nie edytuj żadnego innego pliku.

Prohibited: edycja kodu, danych i testów, new dependencies, touching files outside "Zmieniaj", extra refactors, running git.

Log: write `docs/opt/log/PK-R34.md` (max 10 linii: decyzje, dokładne nazwy API/pól, o co zapytałbyś właściciela i jaką wybrałeś odpowiedź, BLOCKED reason if any).
