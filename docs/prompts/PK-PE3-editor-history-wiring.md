# PK-PE3: Editor: undo/redo, snapping, comfort meter and budget wired in
Zmieniaj: web/home/features/places/edit-panel.js, web/home/features/places/edit-panel.css, tools/qa/ux-p119-edit-wiring.js, docs/opt/log/PK-PE3.md
Weryfikacja: node --check web/home/features/places/edit-panel.js && node --check tools/qa/ux-p119-edit-wiring.js && node tools/qa/ux-p119-edit-wiring.js
Pytania: nie zadawaj pytań i nie czekaj na odpowiedź. Jeśli czegoś brakuje lub coś jest niejasne, sam wybierz najrozsądniejsze rozwiązanie zgodne z AGENTS.md, zapisz decyzję w logu i dokończ do końca.
Limity (twarde): maks. 60 wywołań narzędzi. Linię Weryfikacja uruchom maks. 2 razy. Czytaj tylko pliki z Zmieniaj/Wymagane, pliki wskazane w sekcji "Czytaj" oraz zakresy linii znalezione przez grep. Nie diagnozuj niczego spoza Zmieniaj. Gdy test pada na czymś, czego Twoja zmiana nie dotyka: zapisz nazwę testu i 5 linii błędu w logu, status BLOCKED, zakończ. Po błędzie we własnym kodzie wolno jedna poprawka i jeden ponowny bieg, potem zakończ jako BLOCKED. Nie uruchamiaj web-smoke.js.
Nie ruszaj: AGENTS.md, docs/archive/, tasks/*, every file not listed in Zmieniaj
Goal: In Edit mode Ctrl+Z / Ctrl+Y and two buttons undo and redo, objects snap to the grid, and a comfort meter shows in the drawer.

Depends on: kroki F3-2 i F3-3 scalone w `main`; biegnie w F3-4 równolegle.

Produces (names other packages rely on): Edits `edit-panel.js` and `.css` (anchors in `RI5.md` section 2). Every `room_*` message goes through `EditHistory.push`.

## Czytaj (w tej kolejności, tylko wskazane sekcje)
- `docs/opt/foundations/RI5.md` sekcja 2 oraz `R40.md` sekcje 2 i 6.

## Praca równoległa (obowiązkowe)
Ta paczka startuje w tym samym kroku co kilkanaście innych paczek, a każda edytuje inne pliki. Nie czekaj na nie i nie czytaj ich testów ani logów. Stan kodu to `main` z początku kroku: API innych paczek tego kroku jeszcze nie istnieje. Dane testowe buduj we WŁASNYM pliku testu; API rodzeństwa bierz z kontraktu w pliku badawczym wskazanym w "Czytaj" i w testach zastępuj atrapą (komunikat `STUB <nazwa>`). Plików sklejających (`index.html`, `app.js`, `features/index.json`, `canvas-pig.js`, `places/feature.js`, `edit-panel.js`, `HomeWindow.cs`, `Program.cs`) nie edytujesz, jeśli nie ma ich w Zmieniaj: wpina je krok sklejania. Gdy "Prompt fixes" w pliku badawczym przeczą krokom tego promptu, wygrywa plik badawczy; różnicę zapisz w logu.

## Kontekst (fakty sprawdzone 17.11.2026, nie szukaj drugi raz)
- Home: `web/home/` (`index.html`, `app.js`, `bridge.js`, `canvas-pig.js` ok. 3300 linii, `features/places/{feature,scenes,edit-panel,room-geometry,mock}.js`, `lib/{lights,palette,sprites,ui-assets}.js`). Moduły funkcji ładuje `app.js:963-995` z `features/index.json` (`features/<id>/feature.js`, w trybie mock też `features/<id>/mock.js`).
- Płótno: sceny 256x144 (docelowo wszystkie; pokój dziś 192x112 z siatki, park 384x192 do czasu PK-P47a/PK-P47r), świnka dorosła 32x24. Orientacyjne kotwice `canvas-pig.js` (numery linii się przesuwają, szukaj grepem): `addLayer` ~393, `isFree` ~596, `findPath` ~684, `setScene` ~872, `depthScale`/`bScale` ~904-921, `pickRandomWalkTarget` ~1131, `renderList` ~1244, `drawThing` ~1327, `applySceneLight` ~2711, `drawContactShadow` ~2721, `litFrame` ~2776, publiczny obiekt `CanvasPig` ~3024.
- Dane: `assets/data/world_items.json` (przedmiot: `id,name,place[],w,h,price,comfort,layer(ground|floor|wall),icon`; lampy: `lamp_mushroom` i `lamp_floor` w1 h2 floor, `lamp_post`/`lamp_salt`/`lamp_oil` w1 h1 floor, `lamp_arc` wall 2x3, `fairy_lights` wall 3x1), `assets/data/lights.json` (źródła z `toggle`, `frames`, `fps`), `assets/data/place_scenes.json`, `assets/data/pig_rooms.json` (motywy ~52-87), `assets/world/atlas.json`.
- Zapis i C#: `src/Cuy.Core/World/{WorldState,RoomLayoutOps}.cs`, `src/Cuy/dotNet/Features/RoomsFeature.cs` (`room_place/room_move/room_remove/room_flip/room_skin`, `room_skin` ok. linii 471), walidacja `src/Cuy.Core/Input/Validation/<Feature>Messages.cs`, kontrakty `docs/contracts/<feature>.md`.
- Okno gry ma stały rozmiar 420x640 (`src/Cuy/dotNet/HomeWindow.cs:232-235`, przeliczane o DPI ok. 284-291). Helper testów Playwright domyślnie otwiera 400x620 (`tools/qa/lib/ux.js`), więc testy układu podają rozmiar jawnie.
- Testy: Playwright przez `tools/qa/lib/ux.js` (`startServer`, `openHome`, `openMore`, `openFromMore`), mock `CuyScenesMock.state('seven')` (7 scen), `tools/qa/ux-all.js` uruchamia wszystkie `ux-p<liczba>-*.js` (nowe testy nazywaj w tym wzorcu). Core: `tests/Cuy.Core.Tests` (xUnit, `RepoFile`, `ManualClock`).
- Zasady AGENTS.md: liczby w `assets/data/*.json`, nowe pola zapisu z bezpiecznymi domyślnymi, zmiany liczb za flagą `Balance`, JS nie liczy cen, per-feature pliki (kontrakt, walidacja, mock).
- PARYTET HOME vs PULPIT (fakty sprawdzone 18.11.2026): pulpitem steruje `Brain` (`src/Cuy.Core/AI/Brain.cs`, akcje z `assets/data/actions.json`: 28 akcji rest, sniffing, walk, zoomies, popcorn, eat_hay, drink, chew_stick, dig_hay, chin_marking, scratching, nap, sleep, wheeking, begging, sadness, sickness, rumblestrut, nose_touch, grooming_other, cold, heat, following, sleeping_together, chirping, dancing, yawning, beaming; animacje: idle, sniff, walk, run, popcorn, eat, drink, chew_stick, dig_hay, chin_rub, scratch, doze, sleep, wheek, beg, sad, sick, rumble, nose_touch, groom_other, shiver, heat_flop, follow, sleep_together, chirp, dance, yawn, front_happy). `BrainController.cs` tyka go tylko dla pulpitu.
- W Home `canvas-pig.js` ma WSZYSTKIE sprite'y (`ANIM_DEFS` ok. 208-270, 54 wiersze, w tym `sleep_house`), ale zachowanie jest tylko takie: kliknięcia (`app.js` ok. 512-566: eat, beg, happy, greet, purr_pet), losowy `idleTimer` (`canvas-pig.js` ok. 2228-2245: 20% sniff, 10% popcorn, reszta spacer do losowego celu `pickRandomWalkTarget`) oraz `state.currentAction` -> `playAnim(..., 3000)` (ok. 2103), którego C# nigdy nie wysyła (`bridge.js` mock ustawia tylko część). Świnka w Home NIE śpi, NIE drzemie, nie pije, nie drapie się, nie biega (zoomies), nie tańczy, nie ziewa, nie mruczy, nie śpi razem z drugą; skok (popcorn) jest tylko 10% losowaniem w bezruchu.
- Potrzeby w Home: `state.needs` (`bridge.js` mock: energia spada 0,4 i rośnie 1,2 ok. linii 650-654), etap życia `stageKey`, zegar sceny (pora dnia do światła). Wszystkie liczby zachowań mają pochodzić z `assets/data/actions.json` (jedno źródło prawdy z Core) albo z nowego `assets/data/home_behavior.json`, nigdy z kodu JS.

## Steps
1. Testy FIRST `tools/qa/ux-p119-edit-wiring.js` (Playwright, mock `seven`): P1 `undo-after-place`, P2 `redo-after-undo`, P3 `ctrl-z-ctrl-y`, P4 `buttons-disabled-when-empty`, P5 `snap-on-drop`, P6 `comfort-meter-updates`, P7 `scene-change-clears-history`, P8 `core-reject-keeps-ui-consistent`, P9 `drawer-fits-420x640`, P10 `no-console-errors`.
2. Wstaw wywołania i interfejs według `RI5.md`; style tylko tokeny `--ui-*` i paleta.
3. Uruchom Weryfikację i napraw do zielonego.

## Zasady grafiki i interfejsu (obowiązkowe)
- Legenda stylu: `docs/STYL_SWIATA.md` (czytaj pkt 0-2 i 5, ok. 60 linii) i paleta `assets/data/style_palette.json` (42 kolory). Zakaz kolorów spoza palety, zakaz `#ffffff` i `#000000`, zakaz gradientów CSS, rozmycia i cieni z blur. `image-rendering: pixelated`, skala tylko całkowita, pozycje w pełnych pikselach.
- Biblioteka pixel artów: najpierw szukaj gotowego w `assets/world/`, `assets/ui/`, `assets/icons/`, `assets/props/`. Nowy sprite tylko gdy go tam naprawdę nie ma.
- Interfejs jak reszta gry: drewniane ramki i 9-slice z `assets/ui/`, kolory `--ui-*`, czcionka `--ui-font`. Zakaz własnych SVG i glifów tekstowych.

Prohibited: changing or deleting existing test assertions, new dependencies, touching files outside "Zmieniaj", extra refactors, running git.

Log: write `docs/opt/log/PK-PE3.md` (max 10 linii: decyzje i dlaczego, dokładne nazwy API/pól, różnice od pliku badawczego, atrapy `STUB` użyte w testach, BLOCKED reason if any). Do not run git.
