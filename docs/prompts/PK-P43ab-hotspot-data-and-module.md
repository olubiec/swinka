# PK-P43ab: Hotspots: static data file and pure engine module (no canvas edit)
Zmieniaj: assets/data/scene_hotspots.json, web/home/lib/hotspots.js, tools/qa/hotspots-check.js, tools/qa/ux-p43-hotspots.js, docs/opt/log/PK-P43ab.md
Weryfikacja: node --check web/home/lib/hotspots.js && node --check tools/qa/hotspots-check.js && node --check tools/qa/ux-p43-hotspots.js && node tools/qa/hotspots-check.js && node tools/qa/ux-p43-hotspots.js
Pytania: nie zadawaj pytań i nie czekaj na odpowiedź. Jeśli czegoś brakuje lub coś jest niejasne, sam wybierz najrozsądniejsze rozwiązanie zgodne z AGENTS.md, zapisz decyzję w logu i dokończ do końca.
Limity (twarde): maks. 55 wywołań narzędzi. Linię Weryfikacja uruchom maks. 2 razy. Czytaj tylko pliki z Zmieniaj/Wymagane, pliki wskazane w sekcji "Czytaj" oraz zakresy linii znalezione przez grep. Nie diagnozuj niczego spoza Zmieniaj. Gdy test pada na czymś, czego Twoja zmiana nie dotyka: zapisz nazwę testu i 5 linii błędu w logu, status BLOCKED, zakończ. Po błędzie we własnym kodzie wolno jedna poprawka i jeden ponowny bieg, potem zakończ jako BLOCKED. Nie uruchamiaj web-smoke.js.
Nie ruszaj: AGENTS.md, docs/archive/, tasks/*, every file not listed in Zmieniaj
Goal: Clickable scene areas without opening windows: a data file for objects that are not instances, and a pure module that merges them with hotspots derived from saved instances (stalls, plots), resolves hits and arbitrates between pig, Edit mode and drag.

Depends on: pliki badawcze z kroku F2-1 (`docs/opt/foundations/R*.md`, patrz "Czytaj"); brak zależności od innych paczek tego kroku.

Produces (names other packages rely on): `assets/data/scene_hotspots.json`; `window.CuyHotspots` / `require("web/home/lib/hotspots.js")` with the API fixed in R30 section 3; `tools/qa/hotspots-check.js` (schema validator, exports `validate(data)`). PK-CV2 adds the thin `CanvasPig.setHotspots/getHotspots/onHotspot`, PK-PF2 and PK-P43c/d consume it.

## Czytaj (w tej kolejności, tylko wskazane sekcje)
- `docs/opt/foundations/R30.md` sekcje 2 (instancje), 3 (schemat i API: DOSŁOWNIE) i 4 (stragany, grządki).
- `docs/opt/foundations/R43.md` sekcja 2 (hotspoty wynikają z pozycji instancji).
- `docs/BRIEF_DLA_GRAFIKA_SCENY_I_OBIEKTY.md` tylko jeśli R30 odsyła.

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
1. Testy FIRST, `tools/qa/ux-p43-hotspots.js` (czysty Node): X1 `merge-static-and-instances`, X2 `hit-order` (wyższy y wygrywa, przy remisie mniejszy prostokąt), X3 `arbitrate` (`arbitrate({overPig, editMode, dragging})` zwraca `pig`/`edit`/`drag`/`hotspot` według R30), X4 `edit-disables`, X5 `on-kind-fires-once` (klik raz = jedno zdarzenie, drugi w 250 ms ignorowany), X6 `dynamic-follows-instance` (przesunięcie instancji straganu przesuwa prostokąt hotspotu, stary punkt nic nie robi), X7 `label-clamped-inside-scene` (etykieta nie wychodzi poza 256x144 także dla skrajnych hotspotów), X8 `keyboard-order` (kolejność czytania: y potem x; Enter aktywuje), X9 `rooms-empty-no-cost` (pokoje: ta sama pusta tablica, bez alokacji), X10 `bad-input` (null, brak pola, ujemny prostokąt, NaN: nie rzuca wyjątku).
2. `tools/qa/hotspots-check.js`: walidator schematu danych (id unikalne w scenie, `kind` z listy, `rect` w granicach sceny 256x144, `label` niepusty <= 14 znaków); wywoływany na prawdziwym `scene_hotspots.json` i na 3 wbudowanych niepoprawnych próbkach (odrzucone) oraz 1 poprawnej (przyjęta).
3. Zapisz `assets/data/scene_hotspots.json` tylko dla obiektów, które NIE są instancjami (staw i rabata w ogrodzie, altana w parku; wartości prostokątów odczytaj z `R30.md`; jeśli ich brak, z `place_scenes.json` `blockers` tych obiektów). Pokoje: pusta lista.
4. Zaimplementuj `hotspots.js` zgodnie z regułą modułu. Uruchom Weryfikację; napraw do zielonego.

Moduł JS ma działać w Node (`require`) i w przeglądarce (`window.<Nazwa>`): wzorzec UMD jak `web/home/lib/lights.js` (`if (typeof module !== "undefined") module.exports = api; else root.Nazwa = api;`), ES2020, bez zależności, logika w czystych funkcjach, losowość i czas wstrzykiwane (parametr `rng`, `now`), brak dostępu do DOM poza wyraźnie nazwaną funkcją budującą DOM.

Prohibited: changing or deleting existing test assertions, new dependencies, touching files outside "Zmieniaj", extra refactors, running git.

Log: write `docs/opt/log/PK-P43ab.md` (max 10 linii: decyzje i dlaczego, dokładne nazwy API/pól, różnice od pliku badawczego, atrapy `STUB` użyte w testach, BLOCKED reason if any). Do not run git.
