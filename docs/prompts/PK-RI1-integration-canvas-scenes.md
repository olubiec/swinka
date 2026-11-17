# PK-RI1: Integration analysis: canvas-pig.js and scenes.js wiring
Zmieniaj: docs/opt/foundations/RI1.md, docs/opt/log/PK-RI1.md
Weryfikacja: node tools/qa/foundation-check.js docs/opt/foundations/RI1.md 6
Pytania: nie zadawaj pytań i nie czekaj na odpowiedź. Jeśli czegoś brakuje lub coś jest niejasne, sam wybierz najrozsądniejsze rozwiązanie zgodne z AGENTS.md, zapisz decyzję w logu i dokończ do końca.
Limity (twarde): maks. 60 wywołań narzędzi. To jest paczka badawcza: kod, dane i testy w repo tylko do odczytu. Piszesz wyłącznie dokumenty z Zmieniaj. Wolno uruchamiać pomiarowe skrypty Playwright/Node, ale tylko takie, które leżą poza repo (katalog tymczasowy systemu) i niczego w repo nie zapisują. Nie uruchamiaj git. Czytaj zakresy linii znalezione przez grep, nie całe pliki; PNG wolno oglądać tylko te wymienione w krokach. Każde twierdzenie w dokumencie ma mieć plik:linia lub nazwę znalezioną grepem; czego nie sprawdziłeś, oznacz słowem UNVERIFIED. Weryfikację uruchom maks. 2 razy.
Nie ruszaj: AGENTS.md, docs/archive/, tasks/*, every file not listed in Zmieniaj
Goal: After the parallel step, read the real code of the pure modules and the new canvas viewport and produce the exact wiring spec for PK-CV2 (`canvas-pig.js`, `scenes.js`).

Depends on: krok F2-2 zakończony i scalony (kod modułów, logi paczek). Działa w kroku F2-3 równolegle z pozostałymi paczkami RI; wynik czytają paczki kroku F2-4.

Produces (names other packages rely on): `docs/opt/foundations/RI1.md` max 16000 znaków, sekcje `## 1.` .. `## 6.`:
- `## 1.` Status paczek F2-2 (canvas i moduły)
- `## 2.` Kontrakt vs rzeczywistość (tabela)
- `## 3.` Plan sklejenia PK-CV2 (5 elementów, kotwice po zmianach)
- `## 4.` Testy regresji dla PK-CV2 i znane awarie
- `## 5.` Ryzyka
- `## 6.` Prompt fixes
Ostatnia sekcja to "Prompt fixes" dla: PK-CV2 (wygrywają nad treścią ich promptów). Podawaj RZECZYWISTE nazwy, sygnatury i numery linii z kodu po F2-2, nie z kontraktów badawczych.

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

- Moduły po F2-2: `web/home/lib/{hotspots,scene-pigs,weather,play-targets}.js`, zmiany PK-P47r w `canvas-pig.js` i `room-geometry.js`, zmiany PK-P46b w `scenes.js`/`places/mock.js`, dane `assets/data/{scene_hotspots,weather,lights}.json`.

## Steps
1. Wypisz status każdej paczki F2-2 dotyczącej canvasa i modułów (OK / BLOCKED / z atrapami `STUB`) na podstawie logów i istnienia plików; dla BLOCKED podaj skutek dla PK-CV2.
2. Dla każdego modułu zrób tabelę: kontrakt z R29/R30/R31 vs rzeczywisty eksport (`module.exports`/`window.X`): nazwa, sygnatura, różnica. Uruchom `node tools/qa/ux-p5-scene-pigs.js`, `ux-p43-hotspots.js`, `ux-p7-play-targets.js`, `ux-p7-weather.js`, `ux-p47-room.js` (po jednym razie) i zapisz wyniki.
3. Dla PK-CV2 rozpisz każdy z 5 elementów (wielu świnek, cele zabawy i zabawka, paski klatek, API hotspotów i arbitraż, `scenes.js` hotspoty z instancji): funkcja i linia w `canvas-pig.js`/`scenes.js` PO zmianach PK-P47r i PK-P46b, minimalny kształt zmiany, nowe pola publiczne.
4. Wypisz testy regresji, które muszą wejść do `Weryfikacja` PK-CV2, i te, które po F2-2 już padają (z przyczyną).
5. Wskaż ryzyka sklejenia: kolejność inicjalizacji, brak modułu przy starcie, offset sceny z PK-P47r wpływający na współrzędne hotspotów i świnek.
6. Uruchom Weryfikację (struktura dokumentu). Nie edytuj żadnego innego pliku.

Prohibited: edycja kodu, danych i testów, new dependencies, touching files outside "Zmieniaj", running git.

Log: write `docs/opt/log/PK-RI1.md` (max 10 linii: paczki BLOCKED lub z atrapami, największe rozbieżności kontrakt/rzeczywistość, decyzje).
