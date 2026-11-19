# PK-R37: Research: sleeping places, hops and motion of the Home pig
Zmieniaj: docs/opt/foundations/R37.md, docs/opt/log/PK-R37.md
Weryfikacja: node tools/qa/foundation-check.js docs/opt/foundations/R37.md 6
Pytania: nie zadawaj pytań i nie czekaj na odpowiedź. Jeśli czegoś brakuje lub coś jest niejasne, sam wybierz najrozsądniejsze rozwiązanie zgodne z AGENTS.md, zapisz decyzję w logu i dokończ do końca.
Limity (twarde): maks. 60 wywołań narzędzi. To jest paczka badawcza: kod, dane i testy w repo tylko do odczytu. Piszesz wyłącznie dokumenty z Zmieniaj. Wolno uruchamiać pomiarowe skrypty Playwright/Node, ale tylko takie, które leżą poza repo (katalog tymczasowy systemu) i niczego w repo nie zapisują. Nie uruchamiaj git. Czytaj zakresy linii znalezione przez grep, nie całe pliki; PNG wolno oglądać tylko te wymienione w krokach. Każde twierdzenie w dokumencie ma mieć plik:linia lub nazwę znalezioną grepem; czego nie sprawdziłeś, oznacz słowem UNVERIFIED. Weryfikację uruchom maks. 2 razy.
Nie ruszaj: AGENTS.md, docs/archive/, tasks/*, every file not listed in Zmieniaj
Goal: Specify where and how the Home pig sleeps, dozes, hops and runs: sleeping spots from placed things (house, bed, cushion, floor), `sleep_house`/`sleep_together` rules, the vertical hop and speed per animation, particles (zzz, hearts) - contracts of `lib/rest-spots.js` and `lib/pig-motion.js`.

Depends on: nothing (tylko odczyt). Działa w kroku F3-1 razem z innymi paczkami badawczymi; wynik czytają paczki następnych kroków.

Produces (names other packages rely on): `docs/opt/foundations/R37.md` max 16000 znaków, sekcje numerowane `## 1.` .. `## 6.` dokładnie w tej kolejności:
- `## 1.` Miejsca do spania: tabela przedmiotów
- `## 2.` Skok i prędkości: pomiary i luki
- `## 3.` Kontrakt `rest-spots.js`
- `## 4.` Kontrakt `pig-motion.js` i sekcja `motion` danych
- `## 5.` Przypadki dla PK-T15
- `## 6.` Prompt fixes
Ostatnia sekcja to "Prompt fixes": lista `PK-xxx: stary tekst -> nowy tekst` dla paczek: PK-H2, PK-H3, PK-CV3, PK-T15. Sekcje z kontraktem (nazwy funkcji, pola, kształty komunikatów) podają je DOSŁOWNIE, bo implementujące paczki kodują równolegle wyłącznie według tego pliku.

## Czytaj tylko (zakaz czytania innych plików)
- `assets/data/world_items.json`
- `assets/data/actions.json`
- `web/home/canvas-pig.js` linie 200-275, 1180-1280, 2220-2320
- `src/Cuy.Core/Balance.cs`

## Nie czytaj
Wszystkich pozostałych plików w repozytorium, `docs/PLAN.md`, `docs/archive/`.

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
- Animacje spania w `ANIM_DEFS`: `sleep` (wiersz 9), `sleep_house` (39, tylko nos wystaje), `sleep_together` (57), `doze`. Skok to animacja `popcorn`. Przedmioty: `assets/data/world_items.json` (szukaj grepem `house`, `bed`, `cushion`, `tunnel`, `hideout`), `assets/data/items_*.json`.

## Steps
1. Znajdź w danych przedmioty, na których świnka może spać lub się chować (domek, legowisko, poduszka, tunel), z `w/h/layer`. Zapisz tabelę id, rozmiar, rodzaj miejsca (`house`, `bed`, `cushion`, `floor`). Sprawdź, czy dwie świnki mogą spać razem (`sleeping_together`).
2. Sprawdź w `canvas-pig.js`, jak rysowana jest `popcorn` (czy skok jest w klatkach sprite'a, czy trzeba dodać przesunięcie Y), oraz prędkości chodu i biegu (`walk`, `run`) w px/s w Home i w pulpicie (`BrainController`, `Balance`). Podaj tabelę animacja, pionowy skok w px, prędkość, czy płynnie zmienia kierunek.
3. Zaprojektuj `web/home/lib/rest-spots.js` (UMD, czysty): `pick({kind, scene, things, pigPos, taken, rng})` zwraca `{gx, gy, anim, faceLeft}` albo `null`; zasady: dom (nos wystaje, y-sort), legowisko, podłoga w kącie; dwie świnki obok siebie dla `sleep_together`; spot nie może kolidować z blokadami `isFree`.
4. Zaprojektuj `web/home/lib/pig-motion.js` (UMD, czysty): `offsetY(anim, tMs)`, `speed(anim, stage)`, `particles(anim, tMs, rng)` (zzz, serce, kropla), `bubble(anim)` (tekst dymka z `i18n`/dotychczasowych tekstów) - liczby w `assets/data/home_behavior.json` sekcja `motion`.
5. Rozpisz przypadki testowe dla PK-T15 (każdy typ miejsca, brak miejsca, dwie świnki, skok nie wychodzi poza scenę, prędkość zależy od etapu życia).
6. Uruchom Weryfikację (sprawdza tylko strukturę, 1500-16000 znaków, brak TODO/TBD). Nie edytuj żadnego innego pliku.

Prohibited: edycja kodu, danych i testów, new dependencies, touching files outside "Zmieniaj", extra refactors, running git.

Log: write `docs/opt/log/PK-R37.md` (max 10 linii: decyzje, dokładne nazwy API/pól, o co zapytałbyś właściciela i jaką wybrałeś odpowiedź, BLOCKED reason if any).
