# PK-R50: Research: life-stage looks in the Domek
Zmieniaj: docs/opt/foundations/R50.md, docs/opt/log/PK-R50.md
Weryfikacja: node tools/qa/foundation-check.js docs/opt/foundations/R50.md 6
Pytania: nie zadawaj pytań i nie czekaj na odpowiedź. Jeśli czegoś brakuje lub coś jest niejasne, sam wybierz najrozsądniejsze rozwiązanie zgodne z AGENTS.md, zapisz decyzję w logu i dokończ do końca.
Limity (twarde): maks. 60 wywołań narzędzi. To jest paczka badawcza: kod, dane i testy w repo tylko do odczytu. Piszesz wyłącznie dokumenty z Zmieniaj. Wolno uruchamiać pomiarowe skrypty Playwright/Node, ale tylko takie, które leżą poza repo (katalog tymczasowy systemu) i niczego w repo nie zapisują. Nie uruchamiaj git. Czytaj zakresy linii znalezione przez grep, nie całe pliki; PNG wolno oglądać tylko te wymienione w krokach. Każde twierdzenie w dokumencie ma mieć plik:linia lub nazwę znalezioną grepem; czego nie sprawdziłeś, oznacz słowem UNVERIFIED. Weryfikację uruchom maks. 2 razy.
Nie ruszaj: AGENTS.md, docs/archive/, tasks/*, every file not listed in Zmieniaj
Goal: Define what "stage looks in the Domek" means: the home (Domek, the house item or the room view) shows the pigs at their life stage and the house itself can reflect the stage of the household; use only art that exists, and specify the module so it needs no new binaries.

Depends on: nothing (tylko odczyt). Działa w kroku F4-1 razem z innymi paczkami badawczymi; wynik czytają paczki następnych kroków.

Produces (names other packages rely on): `docs/opt/foundations/R50.md` max 16000 znaków, sekcje numerowane `## 1.` .. `## 6.` dokładnie w tej kolejności:
- `## 1.` Co znaczy Domek i co już jest
- `## 2.` Wybrany projekt (grafika z biblioteki)
- `## 3.` Kontrakt `stage-looks.js` i dane
- `## 4.` Podział PK-ST1 i kotwice PK-CV4
- `## 5.` Przypadki dla PK-T26
- `## 6.` Prompt fixes
Ostatnia sekcja to "Prompt fixes": lista `PK-xxx: stary tekst -> nowy tekst` dla paczek: PK-ST1, PK-CV4, PK-T26. Sekcje z kontraktem (nazwy funkcji, pola, kształty komunikatów) podają je DOSŁOWNIE, bo implementujące paczki kodują równolegle wyłącznie według tego pliku.

## Kontekst (fakty sprawdzone 17.11.2026, nie szukaj drugi raz)
- BASELINE po Q1/Q2 (19.11.2026): przed falą 3 `node tools/qa/ux-all.js` kończy się z ok. 29 FAIL z 85 (lista: `docs/opt/log/baseline-ux-f3.txt`; naprawia je PK-B1 w kroku F3-0, rdzeń i selftest PK-B2). Test z tej listy, który pada i nie dotyka Twoich plików, NIE jest powodem BLOCKED: odnotuj w logu jedną linią i idź dalej. Nowy FAIL poza listą w pliku, który zmieniasz, jest Twoją sprawą. Wyniki Q2: sekcje `docs/qa/UX_WAVE_CHECKS.md`, zrzuty właściciela `tools/qa/ux-p70-owner-shots.js` (wzorzec dla własnych zrzutów).
- Home: `web/home/` (`index.html`, `app.js`, `bridge.js`, `canvas-pig.js` ok. 3300 linii, `features/places/{feature,scenes,edit-panel,room-geometry,mock}.js`, `lib/{lights,palette,sprites,ui-assets}.js`). Moduły funkcji ładuje `app.js:963-995` z `features/index.json` (`features/<id>/feature.js`, w trybie mock też `features/<id>/mock.js`).
- Płótno: sceny 256x144 (WSZYSTKIE sceny: pokój, ogród, park, farma, targ; stan po Q1/Q2, `assets/data/place_scenes.json`; starych wymiarów 192x112 i 384x192 już nie ma), świnka dorosła 32x24. Orientacyjne kotwice `canvas-pig.js` (numery linii się przesuwają, szukaj grepem): `addLayer` ~393, `isFree` ~596, `findPath` ~684, `setScene` ~872, `depthScale`/`bScale` ~904-921, `pickRandomWalkTarget` ~1131, `renderList` ~1244, `drawThing` ~1327, `applySceneLight` ~2711, `drawContactShadow` ~2721, `litFrame` ~2776, publiczny obiekt `CanvasPig` ~3024.
- Dane: `assets/data/world_items.json` (przedmiot: `id,name,place[],w,h,price,comfort,layer(ground|floor|wall),icon`; lampy: `lamp_mushroom` i `lamp_floor` w1 h2 floor, `lamp_post`/`lamp_salt`/`lamp_oil` w1 h1 floor, `lamp_arc` wall 2x3, `fairy_lights` wall 3x1), `assets/data/lights.json` (źródła z `toggle`, `frames`, `fps`), `assets/data/place_scenes.json`, `assets/data/pig_rooms.json` (motywy ~52-87), `assets/world/atlas.json`.
- Zapis i C#: `src/Cuy.Core/World/{WorldState,RoomLayoutOps}.cs`, `src/Cuy/dotNet/Features/RoomsFeature.cs` (`room_place/room_move/room_remove/room_flip/room_skin`, `room_skin` ok. linii 471), walidacja `src/Cuy.Core/Input/Validation/<Feature>Messages.cs`, kontrakty `docs/contracts/<feature>.md`.
- Okno gry ma stały rozmiar 420x640 (`src/Cuy/dotNet/HomeWindow.cs:232-235`, przeliczane o DPI ok. 284-291). Helper testów Playwright domyślnie otwiera 400x620 (`tools/qa/lib/ux.js`), więc testy układu podają rozmiar jawnie.
- Testy: Playwright przez `tools/qa/lib/ux.js` (`startServer`, `openHome`, `openMore`, `openFromMore`), mock `CuyScenesMock.state('seven')` (7 scen), `tools/qa/ux-all.js` uruchamia wszystkie `ux-p<liczba>-*.js` (nowe testy nazywaj w tym wzorcu). Core: `tests/Cuy.Core.Tests` (xUnit, `RepoFile`, `ManualClock`).
- Zasady AGENTS.md: liczby w `assets/data/*.json`, nowe pola zapisu z bezpiecznymi domyślnymi, zmiany liczb za flagą `Balance`, JS nie liczy cen, per-feature pliki (kontrakt, walidacja, mock).
- PARYTET HOME vs PULPIT (fakty sprawdzone 18.11.2026): pulpitem steruje `Brain` (`src/Cuy.Core/AI/Brain.cs`, akcje z `assets/data/actions.json`: 28 akcji rest, sniffing, walk, zoomies, popcorn, eat_hay, drink, chew_stick, dig_hay, chin_marking, scratching, nap, sleep, wheeking, begging, sadness, sickness, rumblestrut, nose_touch, grooming_other, cold, heat, following, sleeping_together, chirping, dancing, yawning, beaming; animacje: idle, sniff, walk, run, popcorn, eat, drink, chew_stick, dig_hay, chin_rub, scratch, doze, sleep, wheek, beg, sad, sick, rumble, nose_touch, groom_other, shiver, heat_flop, follow, sleep_together, chirp, dance, yawn, front_happy). `BrainController.cs` tyka go tylko dla pulpitu.
- W Home `canvas-pig.js` ma WSZYSTKIE sprite'y (`ANIM_DEFS` ok. 208-270, 54 wiersze, w tym `sleep_house`), ale zachowanie jest tylko takie: kliknięcia (`app.js` ok. 512-566: eat, beg, happy, greet, purr_pet), losowy `idleTimer` (`canvas-pig.js` ok. 2228-2245: 20% sniff, 10% popcorn, reszta spacer do losowego celu `pickRandomWalkTarget`) oraz `state.currentAction` -> `playAnim(..., 3000)` (ok. 2103), którego C# nigdy nie wysyła (`bridge.js` mock ustawia tylko część). Świnka w Home NIE śpi, NIE drzemie, nie pije, nie drapie się, nie biega (zoomies), nie tańczy, nie ziewa, nie mruczy, nie śpi razem z drugą; skok (popcorn) jest tylko 10% losowaniem w bezruchu.
- Potrzeby w Home: `state.needs` (`bridge.js` mock: energia spada 0,4 i rośnie 1,2 ok. linii 650-654), etap życia `stageKey`, zegar sceny (pora dnia do światła). Wszystkie liczby zachowań mają pochodzić z `assets/data/actions.json` (jedno źródło prawdy z Core) albo z nowego `assets/data/home_behavior.json`, nigdy z kodu JS.
- Opcjonalne po 2.0 (`docs/PLAN.md` ok. linii 173, "NIE rozpisane"): Hay Hop, towarzysz, pogoda z Open-Meteo (jedyne użycie internetu: wymaga zgody właściciela i przełącznika w ustawieniach, domyślnie WYŁĄCZONE), taniec do muzyki, wygląd etapów w Domku. Stare prompty: `docs/archive/jules-F-tasks/`. Istniejące minigry: `web/home/minigames/` (`games.json`, `hay-maze.js`, `nyan-cuy.js`, `minigames-api.js`), muzyka `web/home/music.js`, `assets/music/`. Pogoda wizualna (deszcz, odcień) jest w fali 2: moduł z PK-P7a.
- Po fali 3 Home ma już `PigBehavior`, `RestSpots`, `PigMotion`, `PigReactions`, `DrawBudget`, `WorldSounds`, `EditHistory` i funkcje `run`/`props` (patrz `docs/opt/log/PK-*.md`).

- `docs/PLAN.md` ok. 173 ("wygląd etapów w Domku"), `assets/data/pigs.json`, `pigs_named.json`, `src/Cuy.Core/LifeStage.cs`, `web/home/lib/look.js`/`CuyLook.spriteFor`, `canvas-pig.js` (`spriteKey`, `stageKey`), sprite'y domków w `assets/world/`.

## Steps
1. Znajdź w repo, co znaczy "Domek" (okno widoku pokoju, przedmiot domek, ekran pamięci) i co dziś pokazuje o etapie życia (grep `stageKey`, `stage`, `Domek`, `house`). Zapisz, co już działa.
2. Wybierz minimalny projekt oparty na istniejącej grafice: np. tabliczka etapu przy domku, dostosowanie rozmiaru i dymków, miniatura świnki w odpowiednim etapie w widoku Domku i wskaźnik wieku w dniach; wskaż sprite'y z biblioteki.
3. Zaprojektuj `web/home/lib/stage-looks.js` (UMD, czysty: `lookFor(pig, stage)`, `badge(pig, stage)`, `housePlate(state)`) i dane `assets/data/stage_looks.json` (bez nowych binarek).
4. Rozpisz podział plików (PK-ST1: moduł i dane, test), kotwice dla PK-CV4 i przypadki dla PK-T26 (każdy etap, każda rasa, pies legend).
5. Uruchom Weryfikację (sprawdza tylko strukturę, 1500-16000 znaków, brak TODO/TBD). Nie edytuj żadnego innego pliku.

Prohibited: edycja kodu, danych i testów, new dependencies, touching files outside "Zmieniaj", extra refactors, running git.

Log: write `docs/opt/log/PK-R50.md` (max 10 linii: decyzje, dokładne nazwy API/pól, o co zapytałbyś właściciela i jaką wybrałeś odpowiedź, BLOCKED reason if any).
