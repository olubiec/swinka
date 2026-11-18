# PK-R49: Research: live weather from Open-Meteo with consent
Zmieniaj: docs/opt/foundations/R49.md, docs/opt/log/PK-R49.md
Weryfikacja: node tools/qa/foundation-check.js docs/opt/foundations/R49.md 7
Pytania: nie zadawaj pytań i nie czekaj na odpowiedź. Jeśli czegoś brakuje lub coś jest niejasne, sam wybierz najrozsądniejsze rozwiązanie zgodne z AGENTS.md, zapisz decyzję w logu i dokończ do końca.
Limity (twarde): maks. 60 wywołań narzędzi. To jest paczka badawcza: kod, dane i testy w repo tylko do odczytu. Piszesz wyłącznie dokumenty z Zmieniaj. Wolno uruchamiać pomiarowe skrypty Playwright/Node, ale tylko takie, które leżą poza repo (katalog tymczasowy systemu) i niczego w repo nie zapisują. Nie uruchamiaj git. Czytaj zakresy linii znalezione przez grep, nie całe pliki; PNG wolno oglądać tylko te wymienione w krokach. Każde twierdzenie w dokumencie ma mieć plik:linia lub nazwę znalezioną grepem; czego nie sprawdziłeś, oznacz słowem UNVERIFIED. Weryfikację uruchom maks. 2 razy.
Nie ruszaj: AGENTS.md, docs/archive/, tasks/*, every file not listed in Zmieniaj
Goal: Design the only internet use in the game: current weather from Open-Meteo, strictly opt-in. Privacy first: what is sent, where the location comes from, consent flow, off by default, offline behaviour, caching, how the result feeds the visual weather module from PK-P7a (no gameplay effect).

Depends on: nothing (tylko odczyt). Działa w kroku F4-1 razem z innymi paczkami badawczymi; wynik czytają paczki następnych kroków.

Produces (names other packages rely on): `docs/opt/foundations/R49.md` max 16000 znaków, sekcje numerowane `## 1.` .. `## 7.` dokładnie w tej kolejności:
- `## 1.` Reguły sieci i dokładne dane wychodzące
- `## 2.` Zgoda i ustawienia (UX i zapis)
- `## 3.` C# i Core: usługa, mapowanie, komunikaty (kształty DOSŁOWNIE)
- `## 4.` Web: moduł i UI zgody, mock
- `## 5.` Podział PK-WX1, PK-WX2 i kotwice
- `## 6.` Przypadki dla PK-T25
- `## 7.` Prompt fixes
Ostatnia sekcja to "Prompt fixes": lista `PK-xxx: stary tekst -> nowy tekst` dla paczek: PK-WX1, PK-WX2, PK-CV4, PK-APP4, PK-CS4, PK-T25. Sekcje z kontraktem (nazwy funkcji, pola, kształty komunikatów) podają je DOSŁOWNIE, bo implementujące paczki kodują równolegle wyłącznie według tego pliku.

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

- Moduł pogody wizualnej z fali 2 (`web/home/lib/weather.js` lub nazwa z `docs/opt/log/PK-P7a.md`), ustawienia `web/home/features/settings/`, `src/Cuy.Core/Settings`/`Settings.cs`, zasady AGENTS.md o danych osobowych i sieci (przeczytaj sekcję o sieci jeśli jest).

## Steps
1. Ustal z kodu i AGENTS.md, czy gra dziś używa sieci i jakie są reguły; zapisz dokładnie, jakie dane miałyby wyjść (tylko szerokość i długość zaokrąglona do 1 miejsca po przecinku, bez identyfikatorów, bez nazwy użytkownika), do jakiego hosta (`api.open-meteo.com`) i jak często (maks. raz na 30 minut, cache na dysku).
2. Zaprojektuj zgodę: ekran w Ustawieniach "Live weather" z opisem co jest wysyłane, przełącznik domyślnie WYŁĄCZONY, wpisanie miasta lub współrzędnych ręcznie (bez geolokalizacji IP), przycisk "Delete my location", ślad zgody w zapisie.
3. Zaprojektuj C# (`src/Cuy/dotNet/WeatherService.cs`: HttpClient z timeoutem 5 s, parsowanie, mapowanie kodów WMO na `clear|cloudy|rain|snow|storm|fog`, cache, brak wyjątków na zewnątrz) i Core (`WeatherSettings` w zapisie, bezpieczne domyślne), komunikaty `weather.setConsent`, `weather.setLocation`, stan `weather` dla web, walidacja `WeatherMessages.cs`, kontrakt `docs/contracts/weather.md`.
4. Zaprojektuj web: `web/home/lib/weather-live.js` (czyste mapowanie stanu na typ i natężenie, interfejs do modułu pogody wizualnej) i `web/home/features/weather/*` (UI zgody, mock bez sieci).
5. Rozpisz podział plików: PK-WX1 (Core/C#), PK-WX2 (web), kotwice dla PK-CV4/PK-APP4/PK-CS4 i przypadki dla PK-T25 (w tym: brak jakiegokolwiek żądania sieciowego bez zgody).
6. Uruchom Weryfikację (sprawdza tylko strukturę, 1500-16000 znaków, brak TODO/TBD). Nie edytuj żadnego innego pliku.

Prohibited: edycja kodu, danych i testów, new dependencies, touching files outside "Zmieniaj", extra refactors, running git.

Log: write `docs/opt/log/PK-R49.md` (max 10 linii: decyzje, dokładne nazwy API/pól, o co zapytałbyś właściciela i jaką wybrałeś odpowiedź, BLOCKED reason if any).
