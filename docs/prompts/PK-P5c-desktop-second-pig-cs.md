# PK-P5c: Desktop: minimal second pig companion (C#, build-verified)
Zmieniaj: src/Cuy/dotNet/BrainController.cs, src/Cuy/dotNet/FormPet.cs, src/Cuy/dotNet/Features/PigsFeature.cs, docs/opt/log/PK-P5c.md
Weryfikacja: dotnet build src/Cuy/Cuy.csproj -c Release -p:EnableWindowsTargeting=true
Pytania: nie zadawaj pytań i nie czekaj na odpowiedź. Jeśli czegoś brakuje lub coś jest niejasne, sam wybierz najrozsądniejsze rozwiązanie zgodne z AGENTS.md, zapisz decyzję w logu i dokończ do końca.
Limity (twarde): maks. 45 wywołań narzędzi. Linię Weryfikacja uruchom maks. 2 razy. Czytaj tylko pliki z Zmieniaj/Wymagane, pliki wskazane w sekcji "Czytaj" oraz zakresy linii znalezione przez grep. Nie diagnozuj niczego spoza Zmieniaj. Gdy test pada na czymś, czego Twoja zmiana nie dotyka: zapisz nazwę testu i 5 linii błędu w logu, status BLOCKED, zakończ. Po błędzie we własnym kodzie wolno jedna poprawka i jeden ponowny bieg, potem zakończ jako BLOCKED. Nie uruchamiaj web-smoke.js.
Nie ruszaj: AGENTS.md, docs/archive/, tasks/*, every file not listed in Zmieniaj
Goal: The desktop shows up to two pigs: the second one is a minimal ambient companion with its own simple animation loop that does NOT go through the main brain.

Depends on: pliki badawcze z kroku F2-1 (`docs/opt/foundations/R*.md`, patrz "Czytaj"); brak zależności od innych paczek tego kroku.

Produces (names other packages rely on): C# handler for the desktop-pet message of R29 section 5; a second `FormPet` instance created and disposed on demand. Cannot be run on Linux: the build is the only automatic check, so keep the change minimal and write the manual test steps in the log.

## Czytaj (w tej kolejności, tylko wskazane sekcje)
- `docs/opt/foundations/R29.md` sekcja 6 (minimalna wersja: dokładne metody i pola; kryterium BLOCKED) i 5 (nazwa wiadomości).
- `docs/opt/foundations/R5.md` sekcja 3 (analiza `BrainController`).

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
1. Przeczytaj w `BrainController.cs`, `FormPet.cs` i `PigsFeature.cs` tylko metody wskazane w `R29.md` sekcja 6 (grep). Reguła twarda: druga świnka NIE przechodzi przez `BrainController.OnAnimationSequenceFinished` ani `_brain.CurrentAction`.
2. Zaimplementuj wersję minimalną z `R29.md`: handler wiadomości w `PigsFeature.cs`, tworzenie i zwalnianie drugiego okna, prosta pętla losowej animacji spacerującej po krawędzi pulpitu; wątek UI tylko dla formularzy; logi `BrainController.Log("[Pets] ...")`.
3. Uruchom `dotnet build`. Jeśli kryterium BLOCKED z `R29.md` jest spełnione (np. wymagałoby zmiany `OnAnimationSequenceFinished`), NIE rób zmian: zapisz powód w logu, status BLOCKED i zakończ z niezmienionym kodem (build musi przechodzić).
4. W logu podaj 3-5 kroków ręcznego testu na Windowsie (włącz przełącznik w karcie świnki, druga świnka pojawia się, wyłącz, znika, brak wycieku okna).

Prohibited: changing or deleting existing test assertions, new dependencies, touching files outside "Zmieniaj", extra refactors, running git.

Log: write `docs/opt/log/PK-P5c.md` (max 10 linii: decyzje i dlaczego, dokładne nazwy API/pól, różnice od pliku badawczego, atrapy `STUB` użyte w testach, BLOCKED reason if any). Do not run git.
