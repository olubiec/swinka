# PK-R31: Research: play targets, toy sync, weather and animated light strips (P7)
Zmieniaj: docs/opt/foundations/R31.md, docs/opt/log/PK-R31.md
Weryfikacja: node tools/qa/foundation-check.js docs/opt/foundations/R31.md 8
Pytania: nie zadawaj pytań i nie czekaj na odpowiedź. Jeśli czegoś brakuje lub coś jest niejasne, sam wybierz najrozsądniejsze rozwiązanie zgodne z AGENTS.md, zapisz decyzję w logu i dokończ do końca.
Limity (twarde): maks. 60 wywołań narzędzi. To jest paczka badawcza: kod, dane i testy w repo tylko do odczytu. Piszesz wyłącznie dokumenty z Zmieniaj. Wolno uruchamiać pomiarowe skrypty Playwright/Node, ale tylko takie, które leżą poza repo (katalog tymczasowy systemu) i niczego w repo nie zapisują. Nie uruchamiaj git. Czytaj zakresy linii znalezione przez grep, nie całe pliki; PNG wolno oglądać tylko te wymienione w krokach. Każde twierdzenie w dokumencie ma mieć plik:linia lub nazwę znalezioną grepem; czego nie sprawdziłeś, oznacz słowem UNVERIFIED. Weryfikację uruchom maks. 2 razy.
Nie ruszaj: AGENTS.md, docs/archive/, tasks/*, every file not listed in Zmieniaj
Goal: Re-ground R7 and define the contracts for `web/home/lib/play-targets.js`, `web/home/lib/weather.js`, animated 4-frame light strips in `drawThing` and outdoor night lighting, so PK-P7a, PK-P7b, PK-P6c, PK-CV2 and PK-PF2 can be coded in parallel.

Depends on: nothing (tylko odczyt). Działa w kroku F2-1 razem z innymi paczkami badawczymi; wynik czytają paczki kroków F2-2 i dalszych.

Produces (names other packages rely on): `docs/opt/foundations/R31.md` max 16000 znaków, sekcje numerowane `## 1.` .. `## 8.` dokładnie w tej kolejności:
- `## 1.` Przebieg zabawy dziś (plik:linia)
- `## 2.` Kontrakt `play-targets.js`
- `## 3.` Synchronizacja zabawki (suppressDraw): funkcje i linie
- `## 4.` Kontrakt `weather.js` i `weather.json`
- `## 5.` Paski animacji: lista, klatki, kotwice drawThing
- `## 6.` Nocne światło na dworze (lights.js, lights.json)
- `## 7.` Przypadki dla PK-T8
- `## 8.` Prompt fixes
Ostatnia sekcja to "Prompt fixes": lista `PK-xxx: stary tekst -> nowy tekst` dla paczek: PK-P7a, PK-P7b, PK-P6c, PK-CV2, PK-PF2, PK-T8. Każda sekcja z kontraktem (nazwy funkcji, pola, kształty komunikatów) podaje je DOSŁOWNIE, bo implementujące paczki kodują równolegle wyłącznie według tego pliku.

## Kontekst (fakty sprawdzone 17.11.2026, nie szukaj drugi raz)
- Home: `web/home/` (`index.html`, `app.js`, `bridge.js`, `canvas-pig.js` ok. 3300 linii, `features/places/{feature,scenes,edit-panel,room-geometry,mock}.js`, `lib/{lights,palette,sprites,ui-assets}.js`). Moduły funkcji ładuje `app.js:963-995` z `features/index.json` (`features/<id>/feature.js`, w trybie mock też `features/<id>/mock.js`).
- Płótno: sceny 256x144 (docelowo wszystkie; pokój dziś 192x112 z siatki, park 384x192 do czasu PK-P47a/PK-P47r), świnka dorosła 32x24. Orientacyjne kotwice `canvas-pig.js` (numery linii się przesuwają, szukaj grepem): `addLayer` ~393, `isFree` ~596, `findPath` ~684, `setScene` ~872, `depthScale`/`bScale` ~904-921, `pickRandomWalkTarget` ~1131, `renderList` ~1244, `drawThing` ~1327, `applySceneLight` ~2711, `drawContactShadow` ~2721, `litFrame` ~2776, publiczny obiekt `CanvasPig` ~3024.
- Dane: `assets/data/world_items.json` (przedmiot: `id,name,place[],w,h,price,comfort,layer(ground|floor|wall),icon`; lampy: `lamp_mushroom` i `lamp_floor` w1 h2 floor, `lamp_post`/`lamp_salt`/`lamp_oil` w1 h1 floor, `lamp_arc` wall 2x3, `fairy_lights` wall 3x1), `assets/data/lights.json` (źródła z `toggle`, `frames`, `fps`), `assets/data/place_scenes.json`, `assets/data/pig_rooms.json` (motywy ~52-87), `assets/world/atlas.json`.
- Zapis i C#: `src/Cuy.Core/World/{WorldState,RoomLayoutOps}.cs`, `src/Cuy/dotNet/Features/RoomsFeature.cs` (`room_place/room_move/room_remove/room_flip/room_skin`, `room_skin` ok. linii 471), walidacja `src/Cuy.Core/Input/Validation/<Feature>Messages.cs`, kontrakty `docs/contracts/<feature>.md`.
- Okno gry ma stały rozmiar 420x640 (`src/Cuy/dotNet/HomeWindow.cs:232-235`, przeliczane o DPI ok. 284-291). Helper testów Playwright domyślnie otwiera 400x620 (`tools/qa/lib/ux.js`), więc testy układu podają rozmiar jawnie.
- Testy: Playwright przez `tools/qa/lib/ux.js` (`startServer`, `openHome`, `openMore`, `openFromMore`), mock `CuyScenesMock.state('seven')` (7 scen), `tools/qa/ux-all.js` uruchamia wszystkie `ux-p<liczba>-*.js` (nowe testy nazywaj w tym wzorcu). Core: `tests/Cuy.Core.Tests` (xUnit, `RepoFile`, `ManualClock`).
- Zasady AGENTS.md: liczby w `assets/data/*.json`, nowe pola zapisu z bezpiecznymi domyślnymi, zmiany liczb za flagą `Balance`, JS nie liczy cen, per-feature pliki (kontrakt, walidacja, mock).

- `docs/opt/foundations/R7.md` (sekcje 1-5) jest podstawą; przeczytaj je. Zadania odchudzone przez P39/P40/P45: siatka chodzenia i omijanie przeszkód już są (`canvas-pig.js` `isFree`, `findPath`), zostają: osiągalne cele zabawy (tunel, piłka), synchronizacja rysowania zabawki z animacją zabawy (`suppressDraw`), warstwa pogody (z 15 w `CanvasPig.layers`), cienie, paski animacji świateł.
- Paski klatek: `assets/world/garden/brazier_on.png` (64x16, 4 klatki), `torch_on.png` (64x32), `lantern_garden_on.png`, `lamp_oil_on.png`, oraz ognisko D4: `campfire_base.png`, `campfire_flame.png`, `campfire_flame_small.png` (+ `.json`). `drawThing` nie tnie klatek (rysuje cały pasek obok siebie): trzeba odczytać `frames`/`fps` z `assets/data/lights.json` lub z `.json` obok PNG.
- Pogoda w Core to tylko `Weather = "any"` (`src/Cuy.Core/Pet.Diary.cs:48`); decyzja R7: pogoda tylko wizualna (deszcz, odcień nieba), bez wpływu na zdrowie.

## Steps
1. Opisz przebieg zabawy dziś: wybór aktywności w `pickRandomWalkTarget`, jak zabawki (`tunnel`, `ball`, id w `world_items.json`) trafiają do `things`, skąd animacje zabawy (arkusze z wbitą zabawką) i gdzie jest ich rysowanie (`drawPig`). Numery linii.
2. Zdefiniuj kontrakt `play-targets.js` (UMD, czysty): `interactionSpots(thing, def)` (punkt wejścia tunelu, strona podejścia do piłki), `pickReachable(things, pigPos, isFree, findPath, rng)` -> `{thingUid, spot, path}` lub `null`; zachowania graniczne (brak zabawki, zabawka za meblem, brak ścieżki).
3. Zdefiniuj synchronizację zabawki z animacją (`suppressDraw` w `drawThing`, rysowanie spritu z katalogu w skali `scaleAt(y)` zsynchronizowanym z ruchem świnki, powrót w to samo miejsce po zabawie); wskaż funkcje i linie dla PK-CV2 oraz co robi przerwanie (zmiana sceny w trakcie).
4. Zdefiniuj kontrakt `weather.js` + `assets/data/weather.json` (UMD, czysty): `stateFor(dateKey, sceneKind, settings)` (deterministycznie z daty), `draw(ctx, state, tMs, w, h)` (deszcz: smugi, odcień chmur, bez pogody w pokojach), parametry w JSON; rejestracja przez istniejące `CanvasPig.addLayer('weather', 15, fn)` z `places/feature.js` (PK-PF2), bez edycji canvasa. Sprawdź, czy da się to zrobić bez zmiany canvasa.
5. Specyfikacja pasków animacji: lista przedmiotów z `_on.png` i liczba klatek/fps (zweryfikuj odczytem plików `.json` i wymiarów PNG), jak `drawThing` ma ciąć klatkę (`frame = floor(t*fps) % frames`), kiedy rysuje wersję `_on` (źródło światła aktywne), i jak ognisko D4 łączy bazę i płomień; kotwice dla PK-CV2.
6. Nocne światło na dworze: jak `lib/lights.js` (`activeSources`, `autoOn`) ma włączać pochodnie, latarnie, lampy olejowe i ognisko o zmierzchu bez ręcznego przełącznika, jakie pola w `lights.json` to opisują, i kiedy ręczne `toggle` je nadpisuje (dla PK-P6c i PK-PF2).
7. Zaprojektuj przypadki dla PK-T8 (cele osiągalne i nieosiągalne, jedna zabawka rysowana, skala zabawki, pogoda deterministyczna i tylko na dworze, brak wpływu na statystyki, koszt rysowania).
8. Uruchom Weryfikację (sprawdza tylko strukturę, 1500-16000 znaków, brak TODO/TBD). Nie edytuj żadnego innego pliku.

Prohibited: edycja kodu, danych i testów, new dependencies, touching files outside "Zmieniaj", extra refactors, running git.

Log: write `docs/opt/log/PK-R31.md` (max 10 linii: decyzje, dokładne nazwy API/pól, o co zapytałbyś właściciela i jaką wybrałeś odpowiedź, BLOCKED reason if any).
