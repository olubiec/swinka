# PK-P5b: Pigs: pin/roam button, desktop toggle, validation, mock, contract
Zmieniaj: web/home/features/pigs/feature.js, web/home/features/pigs/feature.css, web/home/features/pigs/mock.js, src/Cuy.Core/Input/Validation/PlacesMessages.cs, src/Cuy.Core/Input/Validation/PigsMessages.cs, tests/Cuy.Core.Tests/PigPinMessagesTests.cs, tools/qa/ux-p5-pin.js, docs/contracts/places-pig-location.md, docs/opt/log/PK-P5b.md
Weryfikacja: dotnet test tests/Cuy.Core.Tests/Cuy.Core.Tests.csproj -c Release --filter "FullyQualifiedName~PigPinMessages" && node --check web/home/features/pigs/feature.js && node --check web/home/features/pigs/mock.js && node --check tools/qa/ux-p5-pin.js && node tools/qa/ux-p5-pin.js
Pytania: nie zadawaj pytań i nie czekaj na odpowiedź. Jeśli czegoś brakuje lub coś jest niejasne, sam wybierz najrozsądniejsze rozwiązanie zgodne z AGENTS.md, zapisz decyzję w logu i dokończ do końca.
Limity (twarde): maks. 55 wywołań narzędzi. Linię Weryfikacja uruchom maks. 2 razy. Czytaj tylko pliki z Zmieniaj/Wymagane, pliki wskazane w sekcji "Czytaj" oraz zakresy linii znalezione przez grep. Nie diagnozuj niczego spoza Zmieniaj. Gdy test pada na czymś, czego Twoja zmiana nie dotyka: zapisz nazwę testu i 5 linii błędu w logu, status BLOCKED, zakończ. Po błędzie we własnym kodzie wolno jedna poprawka i jeden ponowny bieg, potem zakończ jako BLOCKED. Nie uruchamiaj web-smoke.js.
Nie ruszaj: AGENTS.md, docs/archive/, tasks/*, every file not listed in Zmieniaj
Goal: Each pig card has a pin button ("Stay in this room" / "Roam freely") and a "Show on desktop" switch (max 2); the messages are validated in Core and answered by the browser mock.

Depends on: pliki badawcze z kroku F2-1 (`docs/opt/foundations/R*.md`, patrz "Czytaj"); brak zależności od innych paczek tego kroku.

Produces (names other packages rely on): Messages `places.pigPin {pigId,pinned}` (existing C# handler) and the desktop message named in R29 section 5 with their rules in `PlacesMessages.cs`/`PigsMessages.cs`; `features/pigs/mock.js` handlers; updated contract text. PK-P5c implements the C# handler of the desktop message.

## Czytaj (w tej kolejności, tylko wskazane sekcje)
- `docs/opt/foundations/R29.md` sekcje 5 (UI, wiadomości, walidacja, mock: DOSŁOWNIE) i 6.
- `docs/contracts/places-pig-location.md` i `docs/contracts/README.md` (jak działa `IMessageRuleSet`).
- `src/Cuy.Core/Input/Validation/PlacesMessages.cs` (istniejące reguły, wzorzec) oraz `PigsMessages.cs` jeśli istnieje (grep).

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
1. Testy Core FIRST, `tests/Cuy.Core.Tests/PigPinMessagesTests.cs` (wzorzec istniejących testów reguł walidacji): `places.pigPin` poprawny przyjęty; brak `pigId`, pusty `pigId`, `pinned` nie-bool, `pinned` jako napis, nieznane pole, bardzo długi `pigId`, `null` payload: odrzucone bez wyjątku; to samo dla wiadomości pulpitu z R29 (`on` nie-bool, `pigId` brak).
2. Testy JS FIRST, `tools/qa/ux-p5-pin.js` (Playwright, mock `seven`): P1 `pin-button-per-pig`, P2 `click-sends-pigPin` (dokładny kształt), P3 `button-text-toggles-after-state`, P4 `mock-handler-updates-loc` (mock `places.pigPin` zmienia `loc.pinned`), P5 `desktop-switch-max-2` (trzecie włączenie odrzucone z komunikatem), P6 `desktop-message-shape`, P7 `locked-or-single-pig` (jedna świnka: przełącznik nadal działa, bez błędu), P8 `no-console-errors`.
3. Zaimplementuj: reguły walidacji (pliki per feature, bez edycji `MessageValidator.cs`), UI w `pigs/feature.js`/`feature.css` (9-slice i klasy biblioteki, bez nowych SVG), mock w `pigs/mock.js` (NIE w `places/mock.js`), aktualizację `docs/contracts/places-pig-location.md` (nowa wiadomość pulpitu, kształt, odpowiedź).
4. Uruchom Weryfikację; napraw do zielonego.

## Zasady grafiki i interfejsu (obowiązkowe)
- Legenda stylu: `docs/STYL_SWIATA.md` (czytaj pkt 0-2 i 5, ok. 60 linii) i paleta `assets/data/style_palette.json` (42 kolory). Zakaz kolorów spoza palety, zakaz `#ffffff` i `#000000`, zakaz gradientów CSS, rozmycia i cieni z blur. `image-rendering: pixelated`, skala tylko całkowita, pozycje w pełnych pikselach.
- Biblioteka pixel artów: najpierw szukaj gotowego w `assets/world/`, `assets/ui/`, `assets/icons/`, `assets/props/`. Nowy sprite tylko gdy go tam naprawdę nie ma.
- Interfejs jak reszta gry: drewniane ramki i 9-slice z `assets/ui/`, kolory `--ui-*`, czcionka `--ui-font`. Zakaz własnych SVG i glifów tekstowych.

Prohibited: changing or deleting existing test assertions, new dependencies, touching files outside "Zmieniaj", extra refactors, running git.

Log: write `docs/opt/log/PK-P5b.md` (max 10 linii: decyzje i dlaczego, dokładne nazwy API/pól, różnice od pliku badawczego, atrapy `STUB` użyte w testach, BLOCKED reason if any). Do not run git.
