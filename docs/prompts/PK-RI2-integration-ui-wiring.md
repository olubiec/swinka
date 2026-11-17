# PK-RI2: Integration analysis: places/feature.js, edit-panel.js, app.js, index.html wiring
Zmieniaj: docs/opt/foundations/RI2.md, docs/opt/log/PK-RI2.md
Weryfikacja: node tools/qa/foundation-check.js docs/opt/foundations/RI2.md 6
Pytania: nie zadawaj pytań i nie czekaj na odpowiedź. Jeśli czegoś brakuje lub coś jest niejasne, sam wybierz najrozsądniejsze rozwiązanie zgodne z AGENTS.md, zapisz decyzję w logu i dokończ do końca.
Limity (twarde): maks. 60 wywołań narzędzi. To jest paczka badawcza: kod, dane i testy w repo tylko do odczytu. Piszesz wyłącznie dokumenty z Zmieniaj. Wolno uruchamiać pomiarowe skrypty Playwright/Node, ale tylko takie, które leżą poza repo (katalog tymczasowy systemu) i niczego w repo nie zapisują. Nie uruchamiaj git. Czytaj zakresy linii znalezione przez grep, nie całe pliki; PNG wolno oglądać tylko te wymienione w krokach. Każde twierdzenie w dokumencie ma mieć plik:linia lub nazwę znalezioną grepem; czego nie sprawdziłeś, oznacz słowem UNVERIFIED. Weryfikację uruchom maks. 2 razy.
Nie ruszaj: AGENTS.md, docs/archive/, tasks/*, every file not listed in Zmieniaj
Goal: After the parallel step, produce the exact wiring spec for PK-PF2, PK-PE2 and PK-APP2 from the real code of the UI modules and the new places bar.

Depends on: krok F2-2 zakończony i scalony (kod modułów, logi paczek). Działa w kroku F2-3 równolegle z pozostałymi paczkami RI; wynik czytają paczki kroku F2-4.

Produces (names other packages rely on): `docs/opt/foundations/RI2.md` max 16000 znaków, sekcje `## 1.` .. `## 7.`:
- `## 1.` Status paczek UI z F2-2
- `## 2.` Kontrakt vs rzeczywistość (tabela)
- `## 3.` Kotwice PK-PF2
- `## 4.` Kotwice PK-PE2
- `## 5.` Kotwice PK-APP2 (kolejność skryptów, More)
- `## 6.` Testy regresji i znane awarie
- `## 7.` Prompt fixes
Ostatnia sekcja to "Prompt fixes" dla: PK-PF2, PK-PE2, PK-APP2 (wygrywają nad treścią ich promptów). Podawaj RZECZYWISTE nazwy, sygnatury i numery linii z kodu po F2-2, nie z kontraktów badawczych.

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

- Moduły po F2-2: `places/edit-{filters,templates,skins}.js`, `features/pigs/{feature,mock}.js`, `features/{market,farm}/feature.js` (panele w scenie), zmiany PK-P47c (`index.html`, `style.css`, `places/feature.{js,css}`), `lib/hotspots.js`, `lib/weather.js`, `lib/lights.js`.

## Steps
1. Status paczek UI z F2-2 (OK / BLOCKED / z atrapami `STUB`) z logów.
2. Dla każdego modułu UI zrób tabelę: kontrakt (R27/R29/R30) vs rzeczywisty eksport i sygnatury; wypisz, co trzeba zmienić w wołającym kodzie.
3. PK-PF2: kotwice w `places/feature.js` PO zmianach PK-P47c dla: akcji lamp przez hotspoty, straży `toggle:false` i usunięcia `initCanvasLampClick` i zapasowego 120,65, przekazania świnek, rejestracji warstwy pogody, nocnych źródeł plenerowych; dokładne wywołania modułów.
4. PK-PE2: kotwice w `edit-panel.js` i `edit-panel.css` dla zakładki Outdoor, `.edit-hint`, blokady fixture (kształt błędu z P46a), montowania trzech modułów `edit-*.js` i lamp (czerwona/zielona komórka wg R25).
5. PK-APP2: kolejność `<script>` w `index.html` (moduły `lib/*.js` i `places/edit-*.js`), miejsce ukrycia kafelków `farm`/`market` w `app.js`, przekierowanie deep linku; sprawdź, co zmienił PK-P47c w `index.html`.
6. Testy regresji do `Weryfikacja` PK-PF2/PK-PE2/PK-APP2 i znane awarie po F2-2 (uruchom po jednym razie `ux-p47-bar.js`, `ux-p6-filters.js`, `ux-p6-templates.js`, `ux-p6-skins.js`, `ux-p43-hotspots.js`).
7. Uruchom Weryfikację (struktura dokumentu). Nie edytuj żadnego innego pliku.

Prohibited: edycja kodu, danych i testów, new dependencies, touching files outside "Zmieniaj", running git.

Log: write `docs/opt/log/PK-RI2.md` (max 10 linii: paczki BLOCKED lub z atrapami, największe rozbieżności kontrakt/rzeczywistość, decyzje).
