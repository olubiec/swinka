# PK-PF2: places/feature.js: lamp actions, toggle guard, present pigs, weather layer, night lamps
Zmieniaj: web/home/features/places/feature.js, web/home/features/places/feature.css, tools/qa/ux-p51-places-wiring.js, docs/opt/log/PK-PF2.md
Weryfikacja: node --check web/home/features/places/feature.js && node --check tools/qa/ux-p51-places-wiring.js && node tools/qa/ux-p51-places-wiring.js && node tools/qa/ux-p47-bar.js && node tools/qa/ux-p44-drag-switch.js && node tools/qa/ux-p38-presence.js && node tools/qa/ux-p39-light.js
Pytania: nie zadawaj pytań i nie czekaj na odpowiedź. Jeśli czegoś brakuje lub coś jest niejasne, sam wybierz najrozsądniejsze rozwiązanie zgodne z AGENTS.md, zapisz decyzję w logu i dokończ do końca.
Limity (twarde): maks. 65 wywołań narzędzi. Linię Weryfikacja uruchom maks. 2 razy. Czytaj tylko pliki z Zmieniaj/Wymagane, pliki wskazane w sekcji "Czytaj" oraz zakresy linii znalezione przez grep. Nie diagnozuj niczego spoza Zmieniaj. Gdy test pada na czymś, czego Twoja zmiana nie dotyka: zapisz nazwę testu i 5 linii błędu w logu, status BLOCKED, zakończ. Po błędzie we własnym kodzie wolno jedna poprawka i jeden ponowny bieg, potem zakończ jako BLOCKED. Nie uruchamiaj web-smoke.js.
Nie ruszaj: AGENTS.md, docs/archive/, tasks/*, every file not listed in Zmieniaj
Goal: The places module drives the scene: clicking a placed lamp toggles it through a hotspot, window lights ignore manual toggles, pigs of the current scene are handed to the canvas, the weather layer and hotspots are registered per scene, and outdoor lamps/torches/campfire follow dusk automatically.

Depends on: krok F2-3 (plik `RI*.md` wskazany w "Czytaj") i cały krok F2-2 scalony w `main`. Ta paczka biegnie w F2-4 równolegle z pozostałymi paczkami sklejającymi (inne pliki).

Produces (names other packages rely on): Uses `CanvasPig.setPresentPigs/setHotspots/onHotspot` (PK-CV2, parallel: guard with `typeof`), `CuyHotspots`, `CuyWeather`, `Lights.activeSources`/`autoOn` (PK-P6c).

## Czytaj (w tej kolejności, tylko wskazane sekcje)
- `docs/opt/foundations/RI2.md` CAŁY (kotwice po PK-P47c; wygrywa).
- `docs/opt/foundations/R26.md` sekcje 3 i 5 (toggle, fallback 120,65, `initCanvasLampClick`), `R29.md` sekcja 4, `R30.md` sekcja 3, `R31.md` sekcje 4 i 6, `R33.md` sekcja 3.

## Kontekst (fakty sprawdzone 17.11.2026, nie szukaj drugi raz)
- Home: `web/home/` (`index.html`, `app.js`, `bridge.js`, `canvas-pig.js` ok. 3300 linii, `features/places/{feature,scenes,edit-panel,room-geometry,mock}.js`, `lib/{lights,palette,sprites,ui-assets}.js`). Moduły funkcji ładuje `app.js:963-995` z `features/index.json` (`features/<id>/feature.js`, w trybie mock też `features/<id>/mock.js`).
- Płótno: sceny 256x144 (docelowo wszystkie; pokój dziś 192x112 z siatki, park 384x192 do czasu PK-P47a/PK-P47r), świnka dorosła 32x24. Orientacyjne kotwice `canvas-pig.js` (numery linii się przesuwają, szukaj grepem): `addLayer` ~393, `isFree` ~596, `findPath` ~684, `setScene` ~872, `depthScale`/`bScale` ~904-921, `pickRandomWalkTarget` ~1131, `renderList` ~1244, `drawThing` ~1327, `applySceneLight` ~2711, `drawContactShadow` ~2721, `litFrame` ~2776, publiczny obiekt `CanvasPig` ~3024.
- Dane: `assets/data/world_items.json` (przedmiot: `id,name,place[],w,h,price,comfort,layer(ground|floor|wall),icon`; lampy: `lamp_mushroom` i `lamp_floor` w1 h2 floor, `lamp_post`/`lamp_salt`/`lamp_oil` w1 h1 floor, `lamp_arc` wall 2x3, `fairy_lights` wall 3x1), `assets/data/lights.json` (źródła z `toggle`, `frames`, `fps`), `assets/data/place_scenes.json`, `assets/data/pig_rooms.json` (motywy ~52-87), `assets/world/atlas.json`.
- Zapis i C#: `src/Cuy.Core/World/{WorldState,RoomLayoutOps}.cs`, `src/Cuy/dotNet/Features/RoomsFeature.cs` (`room_place/room_move/room_remove/room_flip/room_skin`, `room_skin` ok. linii 471), walidacja `src/Cuy.Core/Input/Validation/<Feature>Messages.cs`, kontrakty `docs/contracts/<feature>.md`.
- Okno gry ma stały rozmiar 420x640 (`src/Cuy/dotNet/HomeWindow.cs:232-235`, przeliczane o DPI ok. 284-291). Helper testów Playwright domyślnie otwiera 400x620 (`tools/qa/lib/ux.js`), więc testy układu podają rozmiar jawnie.
- Testy: Playwright przez `tools/qa/lib/ux.js` (`startServer`, `openHome`, `openMore`, `openFromMore`), mock `CuyScenesMock.state('seven')` (7 scen), `tools/qa/ux-all.js` uruchamia wszystkie `ux-p<liczba>-*.js` (nowe testy nazywaj w tym wzorcu). Core: `tests/Cuy.Core.Tests` (xUnit, `RepoFile`, `ManualClock`).
- Zasady AGENTS.md: liczby w `assets/data/*.json`, nowe pola zapisu z bezpiecznymi domyślnymi, zmiany liczb za flagą `Balance`, JS nie liczy cen, per-feature pliki (kontrakt, walidacja, mock).

## Steps
1. Testy FIRST, `tools/qa/ux-p51-places-wiring.js` (Playwright, mock `seven`; atrapa `CanvasPig.setPresentPigs/setHotspots/onHotspot` rejestrująca wywołania, bo PK-CV2 biegnie równolegle): F1 `lamp-click-toggles` (hotspot lampy -> `toggleLamp`, blask włącza się i wyłącza), F2 `window-click-no-change` (okno `toggle:false`), F3 `no-phantom-light` (scena bez lamp i okien: brak źródła w (120,65), lista źródeł pusta), F4 `initCanvasLampClick-gone` (brak starego nasłuchiwacza: jeden klik = jedno przełączenie), F5 `present-pigs-filtered` (do `setPresentPigs` trafiają tylko świnki z `currentSceneId`), F6 `scene-switch-updates-pigs`, F7 `weather-layer-outdoor-only` (warstwa rejestrowana w ogrodzie, parku, farmie; nie w pokojach), F8 `hotspots-set-per-scene`, F9 `night-outdoor-lamps-on` (o 22:00 źródła plenerowe aktywne bez ręcznego kliknięcia), F10 `missing-modules-no-crash` (brak `CuyWeather`/`CuyHotspots`: scena działa), F11 `no-console-errors`.
2. Zaimplementuj pięć elementów z `RI2.md` sekcja 3 w wskazanych miejscach `places/feature.js`; CSS tylko jeśli potrzebny dla kursora hotspotów.
3. Uruchom Weryfikację; napraw do zielonego.

## Sklejanie (obowiązkowe)
Kod z kroku F2-2 jest już w `main`; moduły istnieją naprawdę. Używaj RZECZYWISTYCH nazw z `docs/opt/foundations/RI*.md` (wygrywa nad kontraktem R* i nad tym promptem; różnice zapisz w logu). Wołaj moduły defensywnie (`window.X && window.X.fn`), bo kolejność ładowania wpina równolegle paczka PK-APP2: w testach tej paczki ładuj brakujące skrypty przez `page.addScriptTag({path})`. Do `Weryfikacja` wchodzą też istniejące testy regresji z listy w kroku; jeśli któryś padał PRZED Twoją zmianą (sprawdź `docs/opt/log/baseline-smoke.txt` i logi F2-2), zapisz to w logu zamiast naprawiać.

Prohibited: changing or deleting existing test assertions, new dependencies, touching files outside "Zmieniaj", extra refactors, running git.

Log: write `docs/opt/log/PK-PF2.md` (max 10 linii: decyzje i dlaczego, dokładne nazwy API/pól, różnice od pliku badawczego, atrapy `STUB` użyte w testach, BLOCKED reason if any). Do not run git.
