# PK-APP2: app.js / index.html / index.json: load order of new modules, retire Farm and Market windows
Zmieniaj: web/home/app.js, web/home/index.html, web/home/features/index.json, tools/qa/ux-p53-load-order.js, docs/opt/log/PK-APP2.md
Weryfikacja: node --check web/home/app.js && node --check tools/qa/ux-p53-load-order.js && node tools/qa/ux-p53-load-order.js && node tools/qa/ux-p47-bar.js && node tools/qa/ux-p40-retire.js && node tools/qa/ux-p1-lifecycle.js
Pytania: nie zadawaj pytań i nie czekaj na odpowiedź. Jeśli czegoś brakuje lub coś jest niejasne, sam wybierz najrozsądniejsze rozwiązanie zgodne z AGENTS.md, zapisz decyzję w logu i dokończ do końca.
Limity (twarde): maks. 55 wywołań narzędzi. Linię Weryfikacja uruchom maks. 2 razy. Czytaj tylko pliki z Zmieniaj/Wymagane, pliki wskazane w sekcji "Czytaj" oraz zakresy linii znalezione przez grep. Nie diagnozuj niczego spoza Zmieniaj. Gdy test pada na czymś, czego Twoja zmiana nie dotyka: zapisz nazwę testu i 5 linii błędu w logu, status BLOCKED, zakończ. Po błędzie we własnym kodzie wolno jedna poprawka i jeden ponowny bieg, potem zakończ jako BLOCKED. Nie uruchamiaj web-smoke.js.
Nie ruszaj: AGENTS.md, docs/archive/, tasks/*, every file not listed in Zmieniaj
Goal: All new modules load in a safe order and Farm and Market are played only in their scenes: no More tiles, no windows, deep links go to the scene.

Depends on: krok F2-3 (plik `RI*.md` wskazany w "Czytaj") i cały krok F2-2 scalony w `main`. Ta paczka biegnie w F2-4 równolegle z pozostałymi paczkami sklejającymi (inne pliki).

Produces (names other packages rely on): Script tags for `lib/{hotspots,scene-pigs,weather,play-targets}.js` and `features/places/edit-{filters,templates,skins}.js` in the order of `RI2.md`; hidden `farm`/`market` tiles; redirect of `openFeature('farm'|'market')` to the scene.

## Czytaj (w tej kolejności, tylko wskazane sekcje)
- `docs/opt/foundations/RI2.md` sekcja 5 (kolejność skryptów, miejsce ukrycia kafelków; wygrywa).
- `docs/opt/foundations/R33.md` sekcje 1, 2 i 5.

## Kontekst (fakty sprawdzone 17.11.2026, nie szukaj drugi raz)
- Home: `web/home/` (`index.html`, `app.js`, `bridge.js`, `canvas-pig.js` ok. 3300 linii, `features/places/{feature,scenes,edit-panel,room-geometry,mock}.js`, `lib/{lights,palette,sprites,ui-assets}.js`). Moduły funkcji ładuje `app.js:963-995` z `features/index.json` (`features/<id>/feature.js`, w trybie mock też `features/<id>/mock.js`).
- Płótno: sceny 256x144 (docelowo wszystkie; pokój dziś 192x112 z siatki, park 384x192 do czasu PK-P47a/PK-P47r), świnka dorosła 32x24. Orientacyjne kotwice `canvas-pig.js` (numery linii się przesuwają, szukaj grepem): `addLayer` ~393, `isFree` ~596, `findPath` ~684, `setScene` ~872, `depthScale`/`bScale` ~904-921, `pickRandomWalkTarget` ~1131, `renderList` ~1244, `drawThing` ~1327, `applySceneLight` ~2711, `drawContactShadow` ~2721, `litFrame` ~2776, publiczny obiekt `CanvasPig` ~3024.
- Dane: `assets/data/world_items.json` (przedmiot: `id,name,place[],w,h,price,comfort,layer(ground|floor|wall),icon`; lampy: `lamp_mushroom` i `lamp_floor` w1 h2 floor, `lamp_post`/`lamp_salt`/`lamp_oil` w1 h1 floor, `lamp_arc` wall 2x3, `fairy_lights` wall 3x1), `assets/data/lights.json` (źródła z `toggle`, `frames`, `fps`), `assets/data/place_scenes.json`, `assets/data/pig_rooms.json` (motywy ~52-87), `assets/world/atlas.json`.
- Zapis i C#: `src/Cuy.Core/World/{WorldState,RoomLayoutOps}.cs`, `src/Cuy/dotNet/Features/RoomsFeature.cs` (`room_place/room_move/room_remove/room_flip/room_skin`, `room_skin` ok. linii 471), walidacja `src/Cuy.Core/Input/Validation/<Feature>Messages.cs`, kontrakty `docs/contracts/<feature>.md`.
- Okno gry ma stały rozmiar 420x640 (`src/Cuy/dotNet/HomeWindow.cs:232-235`, przeliczane o DPI ok. 284-291). Helper testów Playwright domyślnie otwiera 400x620 (`tools/qa/lib/ux.js`), więc testy układu podają rozmiar jawnie.
- Testy: Playwright przez `tools/qa/lib/ux.js` (`startServer`, `openHome`, `openMore`, `openFromMore`), mock `CuyScenesMock.state('seven')` (7 scen), `tools/qa/ux-all.js` uruchamia wszystkie `ux-p<liczba>-*.js` (nowe testy nazywaj w tym wzorcu). Core: `tests/Cuy.Core.Tests` (xUnit, `RepoFile`, `ManualClock`).
- Zasady AGENTS.md: liczby w `assets/data/*.json`, nowe pola zapisu z bezpiecznymi domyślnymi, zmiany liczb za flagą `Balance`, JS nie liczy cen, per-feature pliki (kontrakt, walidacja, mock).

## Steps
1. Testy FIRST, `tools/qa/ux-p53-load-order.js` (Playwright, mock `seven`): V1 `all-globals-defined` (`CuyHotspots`, `CuyScenePigs`, `CuyWeather`, `CuyPlayTargets`, `EditFilters`, `EditTemplates`, `EditSkins`, nazwy z `RI2.md`), V2 `no-console-errors`, V3 `each-module-loads-alone` (usunięcie jednego znacznika w kopii strony nie psuje reszty), V4 `no-farm-market-tile`, V5 `no-window-anywhere` (obejście wszystkich kafelków More i paska miejsc: żaden modal farm/market), V6 `deeplink-farm-opens-scene` (`openFeature('farm')` przechodzi do sceny farmy), V7 `locked-farm-unlock-path` (zablokowana farma: nakładka blokady i wiersz odblokowania w szufladzie), V8 `more-grid-count` (liczba kafelków mniejsza o 2 niż przed zmianą, ale inne bez zmian), V9 `features-index-valid` (JSON poprawny, bez duplikatów).
2. Zaimplementuj: znaczniki w `index.html` (kolejność z `RI2.md`), ukrycie kafelków i przekierowanie w `app.js` (warunek `feat.id === 'farm' || feat.id === 'market'`, moduły zostają zarejestrowane i załadowane, bo dostarczają panele sceny), `features/index.json` tylko jeśli `RI2.md` tak mówi.
3. Uruchom Weryfikację; napraw do zielonego.

## Sklejanie (obowiązkowe)
Kod z kroku F2-2 jest już w `main`; moduły istnieją naprawdę. Używaj RZECZYWISTYCH nazw z `docs/opt/foundations/RI*.md` (wygrywa nad kontraktem R* i nad tym promptem; różnice zapisz w logu). Wołaj moduły defensywnie (`window.X && window.X.fn`), bo kolejność ładowania wpina równolegle paczka PK-APP2: w testach tej paczki ładuj brakujące skrypty przez `page.addScriptTag({path})`. Do `Weryfikacja` wchodzą też istniejące testy regresji z listy w kroku; jeśli któryś padał PRZED Twoją zmianą (sprawdź `docs/opt/log/baseline-smoke.txt` i logi F2-2), zapisz to w logu zamiast naprawiać.

Prohibited: changing or deleting existing test assertions, new dependencies, touching files outside "Zmieniaj", extra refactors, running git.

Log: write `docs/opt/log/PK-APP2.md` (max 10 linii: decyzje i dlaczego, dokładne nazwy API/pól, różnice od pliku badawczego, atrapy `STUB` użyte w testach, BLOCKED reason if any). Do not run git.
