# PK-R44: Research: Hay Hop minigame
Zmieniaj: docs/opt/foundations/R44.md, docs/opt/log/PK-R44.md
Weryfikacja: node tools/qa/foundation-check.js docs/opt/foundations/R44.md 6
Pytania: nie zadawaj pytań i nie czekaj na odpowiedź. Jeśli czegoś brakuje lub coś jest niejasne, sam wybierz najrozsądniejsze rozwiązanie zgodne z AGENTS.md, zapisz decyzję w logu i dokończ do końca.
Limity (twarde): maks. 60 wywołań narzędzi. To jest paczka badawcza: kod, dane i testy w repo tylko do odczytu. Piszesz wyłącznie dokumenty z Zmieniaj. Wolno uruchamiać pomiarowe skrypty Playwright/Node, ale tylko takie, które leżą poza repo (katalog tymczasowy systemu) i niczego w repo nie zapisują. Nie uruchamiaj git. Czytaj zakresy linii znalezione przez grep, nie całe pliki; PNG wolno oglądać tylko te wymienione w krokach. Każde twierdzenie w dokumencie ma mieć plik:linia lub nazwę znalezioną grepem; czego nie sprawdziłeś, oznacz słowem UNVERIFIED. Weryfikację uruchom maks. 2 razy.
Nie ruszaj: AGENTS.md, docs/archive/, tasks/*, every file not listed in Zmieniaj
Goal: Define the Hay Hop minigame (the one listed as optional after 2.0): rules, controls, art from the library, reward under the economy limits, and the file split for PK-HH1 (web) and PK-HH2 (Core/C#).

Depends on: nothing (tylko odczyt). Działa w kroku F4-1 razem z innymi paczkami badawczymi; wynik czytają paczki następnych kroków.

Produces (names other packages rely on): `docs/opt/foundations/R44.md` max 16000 znaków, sekcje numerowane `## 1.` .. `## 6.` dokładnie w tej kolejności:
- `## 1.` Jak dodać minigrę (plik:linia)
- `## 2.` Reguły i fizyka Hay Hop z liczbami
- `## 3.` Nagroda i ochrona przed oszustwem
- `## 4.` Podział plików PK-HH1, PK-HH2, wpis w `games.json`
- `## 5.` Przypadki dla PK-T22
- `## 6.` Prompt fixes
Ostatnia sekcja to "Prompt fixes": lista `PK-xxx: stary tekst -> nowy tekst` dla paczek: PK-HH1, PK-HH2, PK-APP4, PK-T22. Sekcje z kontraktem (nazwy funkcji, pola, kształty komunikatów) podają je DOSŁOWNIE, bo implementujące paczki kodują równolegle wyłącznie według tego pliku.

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
- Opcjonalne po 2.0 (`docs/PLAN.md` ok. linii 173, "NIE rozpisane"): Hay Hop, towarzysz, pogoda z Open-Meteo (jedyne użycie internetu: wymaga zgody właściciela i przełącznika w ustawieniach, domyślnie WYŁĄCZONE), taniec do muzyki, wygląd etapów w Domku. Stare prompty: `docs/archive/jules-F-tasks/`. Istniejące minigry: `web/home/minigames/` (`games.json`, `hay-maze.js`, `nyan-cuy.js`, `minigames-api.js`), muzyka `web/home/music.js`, `assets/music/`. Pogoda wizualna (deszcz, odcień) jest w fali 2: moduł z PK-P7a.
- Po fali 3 Home ma już `PigBehavior`, `RestSpots`, `PigMotion`, `PigReactions`, `DrawBudget`, `WorldSounds`, `EditHistory` i funkcje `run`/`props` (patrz `docs/opt/log/PK-*.md`).

- Istniejące minigry jako wzorzec: `web/home/minigames/games.json`, `hay-maze.js`, `nyan-cuy.js`, `minigames-api.js`, `docs/contracts` dla minigier (grep `minigame`), `src/Cuy.Core/GameState.Minigames.cs`, `Pet.Minigames.cs`, dzienny limit nagród z `assets/data/economy.json`.

## Steps
1. Przeczytaj, jak dziś rejestruje się minigra (`games.json`, `minigames-api.js`, nagroda przez Core, dzienny limit, walidacja wyniku) i zapisz kroki dodania nowej gry z plik:linia.
2. Zaprojektuj Hay Hop (pionowy skoczek: świnka skacze po kępach siana w górę, lewo/prawo myszą lub strzałkami, jedno życie, wynik = wysokość): reguły, siatka/fizyka z liczbami, trudność, 3 sprite'y z biblioteki (`assets/`): których użyć, czego brakuje (wtedy prostokąty z palety).
3. Zaprojektuj nagrodę w granicach ekonomii (wzór wyniku na koniczynki, strop dzienny z danych, ochrona przed fałszywym wynikiem: Core liczy nagrodę z wyniku i czasu gry, nie z klienta) i komunikat `minigame.result` w istniejącym kontrakcie lub nowy z walidacją.
4. Rozpisz podział plików: PK-HH1 (`web/home/minigames/hayhop/*`, mock) i PK-HH2 (Core: dane nagród, test; walidacja), wpis w `games.json` robi PK-APP4. Przypadki dla PK-T22.
5. Uruchom Weryfikację (sprawdza tylko strukturę, 1500-16000 znaków, brak TODO/TBD). Nie edytuj żadnego innego pliku.

Prohibited: edycja kodu, danych i testów, new dependencies, touching files outside "Zmieniaj", extra refactors, running git.

Log: write `docs/opt/log/PK-R44.md` (max 10 linii: decyzje, dokładne nazwy API/pól, o co zapytałbyś właściciela i jaką wybrałeś odpowiedź, BLOCKED reason if any).
