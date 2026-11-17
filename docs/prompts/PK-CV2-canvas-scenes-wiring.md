# PK-CV2: Canvas pass 2: multi-pig, play targets and toy sync, light strips, hotspot API and arbitration, scene hotspots
Zmieniaj: web/home/canvas-pig.js, web/home/features/places/scenes.js, tools/qa/ux-p50-canvas-wiring.js, docs/opt/log/PK-CV2.md
Weryfikacja: node --check web/home/canvas-pig.js && node --check web/home/features/places/scenes.js && node --check tools/qa/ux-p50-canvas-wiring.js && node tools/qa/ux-p50-canvas-wiring.js && node tools/qa/ux-p47-room.js && node tools/qa/ux-p46-render.js && node tools/qa/ux-p44-drag-edge.js && node tools/qa/ux-p39-blockers.js && node tools/qa/ux-p45-pig-depth.js && node tools/qa/ux-p34-pig-walk.js
Pytania: nie zadawaj pytań i nie czekaj na odpowiedź. Jeśli czegoś brakuje lub coś jest niejasne, sam wybierz najrozsądniejsze rozwiązanie zgodne z AGENTS.md, zapisz decyzję w logu i dokończ do końca.
Limity (twarde): maks. 75 wywołań narzędzi. Linię Weryfikacja uruchom maks. 2 razy. Czytaj tylko pliki z Zmieniaj/Wymagane, pliki wskazane w sekcji "Czytaj" oraz zakresy linii znalezione przez grep. Nie diagnozuj niczego spoza Zmieniaj. Gdy test pada na czymś, czego Twoja zmiana nie dotyka: zapisz nazwę testu i 5 linii błędu w logu, status BLOCKED, zakończ. Po błędzie we własnym kodzie wolno jedna poprawka i jeden ponowny bieg, potem zakończ jako BLOCKED. Nie uruchamiaj web-smoke.js.
Nie ruszaj: AGENTS.md, docs/archive/, tasks/*, every file not listed in Zmieniaj
Goal: The second and last edit pass of `canvas-pig.js`: the canvas draws several pigs from `CuyScenePigs`, picks only reachable play targets and draws one toy at room scale during play, slices 4-frame light strips, exposes the hotspot API with click arbitration, and `scenes.js` builds hotspots from instances.

Depends on: krok F2-3 (plik `RI*.md` wskazany w "Czytaj") i cały krok F2-2 scalony w `main`. Ta paczka biegnie w F2-4 równolegle z pozostałymi paczkami sklejającymi (inne pliki).

Produces (names other packages rely on): `CanvasPig.setPresentPigs(list)`, `CanvasPig.setHotspots(list)`, `CanvasPig.getHotspots()`, `CanvasPig.onHotspot(fn)`, `drawThing` frame slicing (`frames`/`fps`), `thing.suppressDraw`; `CuyScenes.hotspotsFor(sceneId, state)`. Used by PK-PF2 and by the market/farm panels (PK-P43c/d).

## Czytaj (w tej kolejności, tylko wskazane sekcje)
- `docs/opt/foundations/RI1.md` CAŁY (rzeczywiste kotwice i API; wygrywa).
- `docs/opt/foundations/R32.md` sekcja 4 (plan PK-CV2) i 2 (arbitraż), `R29.md` sekcja 4, `R31.md` sekcje 2, 3 i 5, `R30.md` sekcja 3.

## Kontekst (fakty sprawdzone 17.11.2026, nie szukaj drugi raz)
- Home: `web/home/` (`index.html`, `app.js`, `bridge.js`, `canvas-pig.js` ok. 3300 linii, `features/places/{feature,scenes,edit-panel,room-geometry,mock}.js`, `lib/{lights,palette,sprites,ui-assets}.js`). Moduły funkcji ładuje `app.js:963-995` z `features/index.json` (`features/<id>/feature.js`, w trybie mock też `features/<id>/mock.js`).
- Płótno: sceny 256x144 (docelowo wszystkie; pokój dziś 192x112 z siatki, park 384x192 do czasu PK-P47a/PK-P47r), świnka dorosła 32x24. Orientacyjne kotwice `canvas-pig.js` (numery linii się przesuwają, szukaj grepem): `addLayer` ~393, `isFree` ~596, `findPath` ~684, `setScene` ~872, `depthScale`/`bScale` ~904-921, `pickRandomWalkTarget` ~1131, `renderList` ~1244, `drawThing` ~1327, `applySceneLight` ~2711, `drawContactShadow` ~2721, `litFrame` ~2776, publiczny obiekt `CanvasPig` ~3024.
- Dane: `assets/data/world_items.json` (przedmiot: `id,name,place[],w,h,price,comfort,layer(ground|floor|wall),icon`; lampy: `lamp_mushroom` i `lamp_floor` w1 h2 floor, `lamp_post`/`lamp_salt`/`lamp_oil` w1 h1 floor, `lamp_arc` wall 2x3, `fairy_lights` wall 3x1), `assets/data/lights.json` (źródła z `toggle`, `frames`, `fps`), `assets/data/place_scenes.json`, `assets/data/pig_rooms.json` (motywy ~52-87), `assets/world/atlas.json`.
- Zapis i C#: `src/Cuy.Core/World/{WorldState,RoomLayoutOps}.cs`, `src/Cuy/dotNet/Features/RoomsFeature.cs` (`room_place/room_move/room_remove/room_flip/room_skin`, `room_skin` ok. linii 471), walidacja `src/Cuy.Core/Input/Validation/<Feature>Messages.cs`, kontrakty `docs/contracts/<feature>.md`.
- Okno gry ma stały rozmiar 420x640 (`src/Cuy/dotNet/HomeWindow.cs:232-235`, przeliczane o DPI ok. 284-291). Helper testów Playwright domyślnie otwiera 400x620 (`tools/qa/lib/ux.js`), więc testy układu podają rozmiar jawnie.
- Testy: Playwright przez `tools/qa/lib/ux.js` (`startServer`, `openHome`, `openMore`, `openFromMore`), mock `CuyScenesMock.state('seven')` (7 scen), `tools/qa/ux-all.js` uruchamia wszystkie `ux-p<liczba>-*.js` (nowe testy nazywaj w tym wzorcu). Core: `tests/Cuy.Core.Tests` (xUnit, `RepoFile`, `ManualClock`).
- Zasady AGENTS.md: liczby w `assets/data/*.json`, nowe pola zapisu z bezpiecznymi domyślnymi, zmiany liczb za flagą `Balance`, JS nie liczy cen, per-feature pliki (kontrakt, walidacja, mock).

## Steps
1. Testy FIRST, `tools/qa/ux-p50-canvas-wiring.js` (Playwright, mock `seven`, skrypty modułów doładowane `addScriptTag`): C1 `two-pigs-drawn` (`CanvasPig.debug()` pokazuje 2 świnki o różnych `look`), C2 `pig-sort-with-things` (świnka niżej rysowana przed meblem wyżej i odwrotnie), C3 `pig-absent-other-scene`, C4 `play-target-reachable-only` (zabawka za meblem nie jest celem), C5 `single-toy-drawn-during-play` (jedna kopia zabawki, skala = `scaleAt(y)`), C6 `strip-frame-advances` (`brazier_on`: indeks klatki zmienia się w 1 s, szerokość rysowanej klatki = szerokość paska / `frames`), C7 `hotspot-hover-and-click` (`onHotspot` wywołane raz), C8 `pig-wins-over-hotspot`, C9 `edit-disables-hotspots`, C10 `drag-never-fires`, C11 `hotspotsFor-from-instances` (przesunięta instancja straganu przesuwa hotspot), C12 `no-console-errors`.
2. Zaimplementuj pięć elementów z `RI1.md` sekcja 3 jako minimalne zmiany w wskazanych funkcjach. `canvas-pig.js` edytujesz tylko w tych miejscach; nie ruszaj kadru, skali ani światła (PK-P47r już to zrobił).
3. Uruchom Weryfikację (wszystkie komendy); napraw do zielonego. Pomiar: liczba wywołań `drawImage` i czas klatki dla sceny z 3 świnkami nie więcej niż 1,5x sceny bazowej (zapisz liczby w logu).

## Sklejanie (obowiązkowe)
Kod z kroku F2-2 jest już w `main`; moduły istnieją naprawdę. Używaj RZECZYWISTYCH nazw z `docs/opt/foundations/RI*.md` (wygrywa nad kontraktem R* i nad tym promptem; różnice zapisz w logu). Wołaj moduły defensywnie (`window.X && window.X.fn`), bo kolejność ładowania wpina równolegle paczka PK-APP2: w testach tej paczki ładuj brakujące skrypty przez `page.addScriptTag({path})`. Do `Weryfikacja` wchodzą też istniejące testy regresji z listy w kroku; jeśli któryś padał PRZED Twoją zmianą (sprawdź `docs/opt/log/baseline-smoke.txt` i logi F2-2), zapisz to w logu zamiast naprawiać.

Prohibited: changing or deleting existing test assertions, new dependencies, touching files outside "Zmieniaj", extra refactors, running git.

Log: write `docs/opt/log/PK-CV2.md` (max 10 linii: decyzje i dlaczego, dokładne nazwy API/pól, różnice od pliku badawczego, atrapy `STUB` użyte w testach, BLOCKED reason if any). Do not run git.
