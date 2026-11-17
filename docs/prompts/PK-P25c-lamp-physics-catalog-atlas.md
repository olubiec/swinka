# PK-P25c: Core and data: lamp placement physics (note 25), catalog and atlas gaps
Zmieniaj: assets/data/world_items.json, assets/world/atlas.json, src/Cuy.Core/World/RoomLayoutOps.cs, tests/Cuy.Core.Tests/LampPlacementTests.cs, docs/opt/log/PK-P25c.md
Weryfikacja: dotnet test tests/Cuy.Core.Tests/Cuy.Core.Tests.csproj -c Release --filter "FullyQualifiedName~LampPlacement|FullyQualifiedName~RoomLayoutOps|FullyQualifiedName~WorldAssets|FullyQualifiedName~WorldItemCatalog|FullyQualifiedName~WorldMigration" && node tools/qa/check-assets.js
Pytania: nie zadawaj pytań i nie czekaj na odpowiedź. Jeśli czegoś brakuje lub coś jest niejasne, sam wybierz najrozsądniejsze rozwiązanie zgodne z AGENTS.md, zapisz decyzję w logu i dokończ do końca.
Limity (twarde): maks. 55 wywołań narzędzi. Linię Weryfikacja uruchom maks. 2 razy. Czytaj tylko pliki z Zmieniaj/Wymagane, pliki wskazane w sekcji "Czytaj" oraz zakresy linii znalezione przez grep. Nie diagnozuj niczego spoza Zmieniaj. Gdy test pada na czymś, czego Twoja zmiana nie dotyka: zapisz nazwę testu i 5 linii błędu w logu, status BLOCKED, zakończ. Po błędzie we własnym kodzie wolno jedna poprawka i jeden ponowny bieg, potem zakończ jako BLOCKED. Nie uruchamiaj web-smoke.js.
Nie ruszaj: AGENTS.md, docs/archive/, tasks/*, every file not listed in Zmieniaj
Goal: A lamp can be moved up against the back wall and wall lamps hang on the wall (note 25): the blocking footprint is separated from the sprite height; and every outdoor item that has art but no catalog or atlas entry gets one.

Depends on: krok F2-3 (`RI3.md`) i `PK-P46a` scalone w `main`. Biegnie w F2-4 równolegle z paczkami sklejającymi (inne pliki).

Produces (names other packages rely on): New `world_items.json` fields named in `R25.md` section 3 (default = old behaviour); `RoomLayoutOps.CanPlace/Move` use them; `LampPlacementTests.cs`; missing catalog/atlas entries from `RI3.md` section 4.

## Czytaj (w tej kolejności, tylko wskazane sekcje)
- `docs/opt/foundations/RI3.md` sekcje 3 i 4 (plan na rzeczywistym kodzie; wygrywa), `R25.md` sekcje 2-3 i 6 (tabela przypadków), `R35.md` sekcje 2-3.

## Kontekst (fakty sprawdzone 17.11.2026, nie szukaj drugi raz)
- Home: `web/home/` (`index.html`, `app.js`, `bridge.js`, `canvas-pig.js` ok. 3300 linii, `features/places/{feature,scenes,edit-panel,room-geometry,mock}.js`, `lib/{lights,palette,sprites,ui-assets}.js`). Moduły funkcji ładuje `app.js:963-995` z `features/index.json` (`features/<id>/feature.js`, w trybie mock też `features/<id>/mock.js`).
- Płótno: sceny 256x144 (docelowo wszystkie; pokój dziś 192x112 z siatki, park 384x192 do czasu PK-P47a/PK-P47r), świnka dorosła 32x24. Orientacyjne kotwice `canvas-pig.js` (numery linii się przesuwają, szukaj grepem): `addLayer` ~393, `isFree` ~596, `findPath` ~684, `setScene` ~872, `depthScale`/`bScale` ~904-921, `pickRandomWalkTarget` ~1131, `renderList` ~1244, `drawThing` ~1327, `applySceneLight` ~2711, `drawContactShadow` ~2721, `litFrame` ~2776, publiczny obiekt `CanvasPig` ~3024.
- Dane: `assets/data/world_items.json` (przedmiot: `id,name,place[],w,h,price,comfort,layer(ground|floor|wall),icon`; lampy: `lamp_mushroom` i `lamp_floor` w1 h2 floor, `lamp_post`/`lamp_salt`/`lamp_oil` w1 h1 floor, `lamp_arc` wall 2x3, `fairy_lights` wall 3x1), `assets/data/lights.json` (źródła z `toggle`, `frames`, `fps`), `assets/data/place_scenes.json`, `assets/data/pig_rooms.json` (motywy ~52-87), `assets/world/atlas.json`.
- Zapis i C#: `src/Cuy.Core/World/{WorldState,RoomLayoutOps}.cs`, `src/Cuy/dotNet/Features/RoomsFeature.cs` (`room_place/room_move/room_remove/room_flip/room_skin`, `room_skin` ok. linii 471), walidacja `src/Cuy.Core/Input/Validation/<Feature>Messages.cs`, kontrakty `docs/contracts/<feature>.md`.
- Okno gry ma stały rozmiar 420x640 (`src/Cuy/dotNet/HomeWindow.cs:232-235`, przeliczane o DPI ok. 284-291). Helper testów Playwright domyślnie otwiera 400x620 (`tools/qa/lib/ux.js`), więc testy układu podają rozmiar jawnie.
- Testy: Playwright przez `tools/qa/lib/ux.js` (`startServer`, `openHome`, `openMore`, `openFromMore`), mock `CuyScenesMock.state('seven')` (7 scen), `tools/qa/ux-all.js` uruchamia wszystkie `ux-p<liczba>-*.js` (nowe testy nazywaj w tym wzorcu). Core: `tests/Cuy.Core.Tests` (xUnit, `RepoFile`, `ManualClock`).
- Zasady AGENTS.md: liczby w `assets/data/*.json`, nowe pola zapisu z bezpiecznymi domyślnymi, zmiany liczb za flagą `Balance`, JS nie liczy cen, per-feature pliki (kontrakt, walidacja, mock).

## Steps
1. Testy FIRST, `tests/Cuy.Core.Tests/LampPlacementTests.cs` (tabela przypadków z `R25.md` sekcja 6, `RepoFile` i prawdziwy `world_items.json`): lampa podłogowa przy tylnej ścianie przyjęta (`lamp_mushroom`, `lamp_floor`), kinkiet i girlanda (`lamp_arc`, `fairy_lights`) tylko na warstwie ściany, lampa podłogowa nie może wisieć na ścianie, dwie lampy nie nakładają podstaw, lampa obok mebla przyjęta, `Move` stosuje te same reguły, stare położenia lamp z fixture starych zapisów nadal ważne, brak pola = zachowanie dotychczasowe (test na `lamp_post`).
2. Zaimplementuj w `world_items.json` (nowe pola, domyślne dla reszty bez zmian) i `RoomLayoutOps.cs` (zmiany minimalne); nie zmieniaj istniejących asercji w `RoomLayoutOpsTests.cs`: jeśli któraś koliduje, wybierz zgodność wsteczną i zapisz konflikt w logu.
3. Dopisz do `world_items.json` i `atlas.json` wyłącznie id z listy `RI3.md` sekcja 4 (nie powielaj wpisów PK-P46a); sprawdź `node tools/qa/check-assets.js` i testy `WorldAssets*`.
4. Uruchom Weryfikację; napraw do zielonego.

## Sklejanie (obowiązkowe)
Kod z kroku F2-2 jest już w `main`; moduły istnieją naprawdę. Używaj RZECZYWISTYCH nazw z `docs/opt/foundations/RI*.md` (wygrywa nad kontraktem R* i nad tym promptem; różnice zapisz w logu). Wołaj moduły defensywnie (`window.X && window.X.fn`), bo kolejność ładowania wpina równolegle paczka PK-APP2: w testach tej paczki ładuj brakujące skrypty przez `page.addScriptTag({path})`. Do `Weryfikacja` wchodzą też istniejące testy regresji z listy w kroku; jeśli któryś padał PRZED Twoją zmianą (sprawdź `docs/opt/log/baseline-smoke.txt` i logi F2-2), zapisz to w logu zamiast naprawiać.

Prohibited: changing or deleting existing test assertions, new dependencies, touching files outside "Zmieniaj", extra refactors, running git.

Log: write `docs/opt/log/PK-P25c.md` (max 10 linii: decyzje i dlaczego, dokładne nazwy API/pól, różnice od pliku badawczego, atrapy `STUB` użyte w testach, BLOCKED reason if any). Do not run git.
