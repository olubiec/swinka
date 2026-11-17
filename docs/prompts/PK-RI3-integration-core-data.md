# PK-RI3: Integration analysis: Core, C# and data after the parallel step
Zmieniaj: docs/opt/foundations/RI3.md, docs/opt/log/PK-RI3.md
Weryfikacja: node tools/qa/foundation-check.js docs/opt/foundations/RI3.md 6
Pytania: nie zadawaj pytań i nie czekaj na odpowiedź. Jeśli czegoś brakuje lub coś jest niejasne, sam wybierz najrozsądniejsze rozwiązanie zgodne z AGENTS.md, zapisz decyzję w logu i dokończ do końca.
Limity (twarde): maks. 60 wywołań narzędzi. To jest paczka badawcza: kod, dane i testy w repo tylko do odczytu. Piszesz wyłącznie dokumenty z Zmieniaj. Wolno uruchamiać pomiarowe skrypty Playwright/Node, ale tylko takie, które leżą poza repo (katalog tymczasowy systemu) i niczego w repo nie zapisują. Nie uruchamiaj git. Czytaj zakresy linii znalezione przez grep, nie całe pliki; PNG wolno oglądać tylko te wymienione w krokach. Każde twierdzenie w dokumencie ma mieć plik:linia lub nazwę znalezioną grepem; czego nie sprawdziłeś, oznacz słowem UNVERIFIED. Weryfikację uruchom maks. 2 razy. Wyjątek: wolno uruchomić `dotnet build` i `dotnet test` (artefakty `bin/obj` są poza gitem).
Nie ruszaj: AGENTS.md, docs/archive/, tasks/*, every file not listed in Zmieniaj
Goal: After the parallel step, check that Core and the desktop project still build and pass tests together and produce the exact spec for PK-P46c (C# outdoor messages) and PK-P25c (lamp physics, catalog and atlas gaps).

Depends on: krok F2-2 zakończony i scalony (kod modułów, logi paczek). Działa w kroku F2-3 równolegle z pozostałymi paczkami RI; wynik czytają paczki kroku F2-4.

Produces (names other packages rely on): `docs/opt/foundations/RI3.md` max 16000 znaków, sekcje `## 1.` .. `## 6.`:
- `## 1.` Build i testy po F2-2 (liczby, awarie, winowajca)
- `## 2.` Rzeczywisty kształt fixture_locked i stanu instancji; plan PK-P46c
- `## 3.` Plan PK-P25c: fizyka lamp wg R25 na rzeczywistym kodzie
- `## 4.` Luki katalogu i atlasu (lista id)
- `## 5.` Wyniki check-assets i data-check
- `## 6.` Prompt fixes
Ostatnia sekcja to "Prompt fixes" dla: PK-P46c, PK-P25c (wygrywają nad treścią ich promptów). Podawaj RZECZYWISTE nazwy, sygnatury i numery linii z kodu po F2-2, nie z kontraktów badawczych.

## Czytaj
Logi: `docs/opt/log/PK-P46a.md`, `PK-P46b.md`, `PK-P47a.md`, `PK-P47c.md`, `PK-P47r.md`, `PK-P6c.md`, `PK-P43ab.md`, `PK-P43c.md`, `PK-P43d.md`, `PK-P5a.md`, `PK-P5b.md`, `PK-P5c.md`, `PK-P7a.md`, `PK-P7b.md`, `PK-P6a.md`, `PK-P6b.md`, `PK-P6s.md`, `PK-P24c.md` (paczki z kroku F2-2; brakujący log = paczka BLOCKED: wpisz to do sekcji 1). Pliki badawcze `docs/opt/foundations/R24.md`..`R35.md` tylko sekcje wskazane w krokach.

## Kontekst (fakty sprawdzone 17.11.2026, nie szukaj drugi raz)
- Home: `web/home/` (`index.html`, `app.js`, `bridge.js`, `canvas-pig.js` ok. 3300 linii, `features/places/{feature,scenes,edit-panel,room-geometry,mock}.js`, `lib/{lights,palette,sprites,ui-assets}.js`). Moduły funkcji ładuje `app.js:963-995` z `features/index.json` (`features/<id>/feature.js`, w trybie mock też `features/<id>/mock.js`).
- Płótno: sceny 256x144 (docelowo wszystkie; pokój dziś 192x112 z siatki, park 384x192 do czasu PK-P47a/PK-P47r), świnka dorosła 32x24. Orientacyjne kotwice `canvas-pig.js` (numery linii się przesuwają, szukaj grepem): `addLayer` ~393, `isFree` ~596, `findPath` ~684, `setScene` ~872, `depthScale`/`bScale` ~904-921, `pickRandomWalkTarget` ~1131, `renderList` ~1244, `drawThing` ~1327, `applySceneLight` ~2711, `drawContactShadow` ~2721, `litFrame` ~2776, publiczny obiekt `CanvasPig` ~3024.
- Dane: `assets/data/world_items.json` (przedmiot: `id,name,place[],w,h,price,comfort,layer(ground|floor|wall),icon`; lampy: `lamp_mushroom` i `lamp_floor` w1 h2 floor, `lamp_post`/`lamp_salt`/`lamp_oil` w1 h1 floor, `lamp_arc` wall 2x3, `fairy_lights` wall 3x1), `assets/data/lights.json` (źródła z `toggle`, `frames`, `fps`), `assets/data/place_scenes.json`, `assets/data/pig_rooms.json` (motywy ~52-87), `assets/world/atlas.json`.
- Zapis i C#: `src/Cuy.Core/World/{WorldState,RoomLayoutOps}.cs`, `src/Cuy/dotNet/Features/RoomsFeature.cs` (`room_place/room_move/room_remove/room_flip/room_skin`, `room_skin` ok. linii 471), walidacja `src/Cuy.Core/Input/Validation/<Feature>Messages.cs`, kontrakty `docs/contracts/<feature>.md`.
- Okno gry ma stały rozmiar 420x640 (`src/Cuy/dotNet/HomeWindow.cs:232-235`, przeliczane o DPI ok. 284-291). Helper testów Playwright domyślnie otwiera 400x620 (`tools/qa/lib/ux.js`), więc testy układu podają rozmiar jawnie.
- Testy: Playwright przez `tools/qa/lib/ux.js` (`startServer`, `openHome`, `openMore`, `openFromMore`), mock `CuyScenesMock.state('seven')` (7 scen), `tools/qa/ux-all.js` uruchamia wszystkie `ux-p<liczba>-*.js` (nowe testy nazywaj w tym wzorcu). Core: `tests/Cuy.Core.Tests` (xUnit, `RepoFile`, `ManualClock`).
- Zasady AGENTS.md: liczby w `assets/data/*.json`, nowe pola zapisu z bezpiecznymi domyślnymi, zmiany liczb za flagą `Balance`, JS nie liczy cen, per-feature pliki (kontrakt, walidacja, mock).

- C# po F2-2: PK-P46a (`WorldState`, `OutdoorSeed`, `OutdoorDefaults`, `RoomLayoutOps`, `Balance`, `GameSession`, `world_items.json`, `atlas.json`, `places.json`), PK-P5b (`PlacesMessages.cs`, `PigsMessages.cs`), PK-P5c (`BrainController.cs`, `FormPet.cs`, `PigsFeature.cs`), PK-P24c (`HomeWindow.cs`).

## Steps
1. Uruchom RAZ `dotnet build src/Cuy/Cuy.csproj -c Release -p:EnableWindowsTargeting=true` i `dotnet test tests/Cuy.Core.Tests/Cuy.Core.Tests.csproj -c Release`; zapisz liczby i nazwy padających testów z przyczyną i paczką-winowajcą (PK-P46a, PK-P5b...). Porównaj z `docs/opt/log/baseline-smoke.txt`.
2. Opisz rzeczywisty kształt z PK-P46a: nazwa błędu `fixture_locked` i jak dociera do `RoomsFeature.cs` (kod, miejsce w `room_remove`), pola stanu wysyłanego do JS dla instancji, flagi `Balance`, kolejność w `GameSession.Open`. Na tej podstawie rozpisz PK-P46c: reguły `RoomsMessages.cs` dla `place` zewnętrznych, pomocnik `RoomsMessages.ToastFor(code)` (czysty, w Core, testowalny) i mapowanie w `RoomsFeature.cs`.
3. PK-P25c: zastosuj `R25.md` do rzeczywistego `RoomLayoutOps.CanPlace` (po zmianach PK-P46a): dokładne zmiany, pola `world_items.json` (nazwy z R25), wpływ na istniejące testy `RoomLayoutOpsTests.cs` (wypisz asercje, które mogą się zderzyć; nie wolno ich zmieniać) i stare zapisy.
4. Luki katalogu i atlasu: po PK-P46a porównaj `outdoor_defaults.json` z `world_items.json`, `atlas.json` i plikami `assets/world/**` (`R35.md` sekcja 2); podaj listę id, które PK-P25c ma jeszcze dopisać (id, w, h, warstwa, ścieżka PNG) i takie, które PK-P46a już dopisał.
5. Uruchom `node tools/qa/check-assets.js` i `node tools/qa/data-check.js` raz i zapisz wynik; wypisz, co PK-P25c ma naprawić.
6. Uruchom Weryfikację (struktura dokumentu). Nie edytuj żadnego innego pliku.

Prohibited: edycja kodu, danych i testów, new dependencies, touching files outside "Zmieniaj", running git.

Log: write `docs/opt/log/PK-RI3.md` (max 10 linii: paczki BLOCKED lub z atrapami, największe rozbieżności kontrakt/rzeczywistość, decyzje).
