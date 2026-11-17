# Przebudowa fal pod pracę równoległą (17.11.2026)

Źródło: commit `58f35bf` (uwagi właściciela 24-28 w `docs/PLAN_POPRAWEK_UX.md`), wyniki badań R5-R8, R43, R46, R47 z fali 1 i stan repo po F1. **Ten plik zastępuje tabelę "Fale 1-4" z `docs/PLAN_FAL_PRZEBUDOWA_11_11.md` w części fal 2-4.** Fala 1 (F1) jest zrobiona i się nie zmienia.

Zasady bez zmian: paczki i `waves.yaml` powstają z `docs/opt/packages.spec.json` przez `python3 tools/opt/gen_packages.py`, potem `node tools/qa/plan-audit.js` (po tej przebudowie: PLAN AUDIT OK, 172 paczki, 82 wpisy). Prompty nie są pisane ręcznie w `waves.yaml`. Generator dostał opcjonalne pole `weight` (liczba "punktów" paczki ręcznej, wpływa tylko na limit czasu: 20 + 8 min na punkt, max 60).

## 1. Co zmieniło się w ocenie planu
1. **Grafika D2 i D4 jest już w repo** (commity `1024d65`, `ec65734`: stragany, grządki, drzewko, fontanna, kępki trawy, ognisko `campfire_base/flame/flame_small`). Stary plan czekał na grafika przed falami 3 i 4. Dlatego **fale 3 i 4 znikają**: P47b/P47d (podpięcie sprite'ów, ognisko) i P7c (latarnie, ognisko w nocy) wchodzą do fali 2. Co jeszcze brakuje w katalogu i atlasie, wskaże badanie PK-R35; tła, którym brakuje sprite'a, zostają namalowane (zasada w PK-P47a).
2. **Wąskie gardła plików.** Dawny plan stawiał na `canvas-pig.js` (3300 linii) 8 paczek, na `places/feature.js` 5, na `edit-panel.js` 5, na `place_scenes.json` 4. Przy zasadzie "pliki rozłączne w jednej fali" wymuszało to ok. 20 kolejnych wpisów. Rozwiązanie: **logika nowych funkcji idzie do nowych plików** (czyste moduły UMD testowane w Node), a każdy gorący plik dostaje maksymalnie dwa przejścia edycji (jedno w F2-2, jedno w F2-4). Szczegóły w sekcji 4.
3. **Stare zadania P7-01/P7-02 miały złe ścieżki** (R7, decyzje 1 i 2): jedyną władzą stawiania jest `src/Cuy.Core/World/RoomLayoutOps.cs`, edytorem `places/edit-panel.js`, nie `Decor/RoomOccupancy.cs` ani `features/decor/feature.js`.
4. **Zmiana własności `place_scenes.json`:** w F2-2 edytuje go tylko PK-P47a (flagi `bg_clean`, park 256x144, klucze sceny `room`); hotspoty PK-P43ab idą do nowego `assets/data/scene_hotspots.json`; PK-P46b nie dotyka pliku (brak klucza `bg_clean` = false).

## 2. Uwagi 24-28: analiza i paczki
| # | Uwaga | Hipoteza (do potwierdzenia pomiarem) | Badanie | Naprawa | Test |
|---|---|---|---|---|---|
| 24 | Okno ucięte od dołu (pasek, przycisk More) | wysokość sceny zależy od proporcji (pokój 1,71, park 2,0, reszta 1,78 przy szerokości 420 px), szuflada Edit nad dolnym paskiem, ewentualnie przeliczenie DPI w `HomeWindow.cs:284-291`; helper testów otwiera 400x620, a gra 420x640 | PK-R24 | PK-P47c (CSS: `index.html`, `style.css`, `places/feature.css`), PK-P24c (C#, może być NO-OP) | PK-T9 V1, V8, V10 |
| 25 | Lampy: nie da się przenieść wyżej ani na ścianę | podstawa lampy `lamp_mushroom`/`lamp_floor` to `h:2` na warstwie `floor` (a ściana to 2 górne wiersze), więc nie mieści się przy tylnej ścianie; brak rozdziału stopy od wysokości sprite'a | PK-R25 | PK-P25c (Core + `world_items.json`), PK-PE2 (czerwona/zielona komórka), PK-CV2 jeśli klient liczy blokady z `h` | PK-T7 (parytet Core i edytora) |
| 26 | Efekt nocy znika z lampy, gdy podchodzi świnka | kolejność `applySceneLight` (wołane dwa razy), `litFrame` i `drawLights` w `canvas-pig.js` ~2341-2363, ~2776 | PK-R26 (pomiar pikseli) | PK-P47r krok B (canvas), PK-P6c (`lights.js`), PK-PF2 | PK-T6 L1, L2 |
| 27 | Brak zmiany kupionej tapety i podłogi po usunięciu okna Rooms | `customize.js` nie jest już montowane; panel skórek zniknął razem z oknem | PK-R27 | moduł PK-P6s (`edit-skins.js`) + montaż w PK-PE2; wysyła istniejące `room_skin` | PK-T5 D6, PK-T11 J2 |
| 28 | Świnka nie skaluje się po upgrade pokoju | `bScale = frac * sw / 46` zależy od szerokości sceny, a ta od liczby kratek pokoju | PK-R28 (tabela skali) | PK-P47r krok A (skala ze stałej kratki 16 px, kadr 256x144) | PK-T9 V3, V4, PK-T13 V5 |

## 3. Wzorzec: 6 kroków, 54 agentów
Jedna fala (**fala 2**), sześć wpisów w `waves.yaml` (`F2-1`..`F2-6`). W jednym wpisie wszystkie paczki biegną naraz i edytują inne pliki; kolejny wpis startuje po poprzednim bez `BLOCKED`.

| Wpis | Rola | Agentów | Co robią |
|---|---|---|---|
| **F2-1** | badania (tylko odczyt) | 12 | PK-R24..R35: pomiary, kontrakty modułów (DOSŁOWNIE), kotwice w kodzie, przypadki testowe, "Prompt fixes". Wynik: `docs/opt/foundations/R24..R35.md`. Implementujący czytają je zamiast czekać na czat planujący |
| **F2-2** | implementacja: Core, dane, grafika, czyste moduły, canvas (przejście 1) | 18 | patrz tabela 3a |
| **F2-3** | analiza sklejenia (tylko odczyt) | 3 | PK-RI1..RI3 czytają scalony kod F2-2, porównują kontrakt z rzeczywistością, uruchamiają build i testy Core (RI3), piszą rzeczywiste kotwice dla F2-4 |
| **F2-4** | sklejanie gorących plików | 6 | patrz tabela 3b |
| **F2-5** | agenci testowi (niezależni, nie czytają testów implementujących) | 13 | patrz sekcja 5 |
| **F2-6** | bramki | 2 | PK-Q1 (pełny build, `ux-all`, `web-smoke`, `check-assets`, `check-icons`, `run-exe-smoke`, każda komenda raz, plus przebieg z `STRICT=1` i liczba DEFECT), PK-Q2 (arkusz właściciela + zrzuty) |

Przed implementacją są więc dwa kroki analizy: F2-1 (kontrakty) i F2-3 (rzeczywistość po równoległej implementacji). Po każdej implementacji idą testy; w F2-2 każda paczka pisze własne testy NAJPIERW, w F2-5 niezależni agenci próbują je "zepsuć".

### 3a. F2-2 (18 paczek, pliki rozłączne)
| Paczka | Zakres | Pliki (skrót) |
|---|---|---|
| PK-P46a | Core: obiekty plenerowe jako zapisane instancje, `fixture_locked`, flaga `OutdoorInstancesActive` | `outdoor_defaults.json`, `World/{OutdoorSeed,OutdoorDefaults,WorldState,RoomLayoutOps}.cs`, `world_items.json`, `atlas.json`, `places.json`, testy |
| PK-P46b | `scenes.js` rysuje instancje (`bg_clean`), blokery ze stóp, mock | `places/{scenes,mock}.js`, `place-scenes-check.js` |
| PK-P47a | czyste tła 256x144, park, klucze `room` | generatory `tools/art/world/*`, `assets/world/bg/*`, `place_scenes.json` |
| PK-P47c | pasek miejsc z grafiką D3 + poprawka układu dołu okna (24) | `index.html`, `style.css`, `places/feature.{css,js}` |
| PK-P47r | **canvas, przejście 1:** kadr 256x144 i skala świnki (28), efekt nocy na lampie (26), cień kontaktowy (P6-07) | `canvas-pig.js`, `room-geometry.js` |
| PK-P6c | światła: straż `toggle:false`, nocne źródła plenerowe, ognisko/pochodnie w danych | `lib/lights.js`, `lights.json` |
| PK-P43ab | hotspoty: plik danych i czysty silnik (bez edycji canvasa) | `scene_hotspots.json`, `lib/hotspots.js` |
| PK-P5a | moduł stanu wielu świnek w scenie | `lib/scene-pigs.js` |
| PK-P7a | pogoda wizualna (moduł + dane) | `lib/weather.js`, `weather.json` |
| PK-P7b | osiągalne cele zabawy (moduł) | `lib/play-targets.js` |
| PK-P6a | zakładki kategorii i wyszukiwanie (moduł) | `places/edit-filters.js` |
| PK-P6b | szablony pokoi (moduł) | `places/edit-templates.js` |
| PK-P6s | zmiana kupionej tapety i podłogi (27, moduł) | `places/edit-skins.js` |
| PK-P5b | przycisk przypięcia i przełącznik pulpitu, walidacja, mock, kontrakt | `pigs/{feature,feature.css,mock}`, `PlacesMessages.cs`, `PigsMessages.cs`, testy |
| PK-P5c | druga świnka na pulpicie (C#, minimalna wersja; BLOCKED dozwolone wg R29) | `BrainController.cs`, `FormPet.cs`, `PigsFeature.cs` |
| PK-P43c | targ: panel straganu w scenie | `market/feature.{js,css}` |
| PK-P43d | farma: grządki, sad, sklep w scenie | `farm/feature.{js,css}` |
| PK-P24c | okno: część C# uwagi 24 (albo NO-OP) | `HomeWindow.cs` |

### 3b. F2-4 (6 paczek, jedno przejście na gorący plik)
| Paczka | Zakres | Pliki |
|---|---|---|
| PK-CV2 | **canvas, przejście 2:** wiele świnek, cele zabawy i synchronizacja zabawki, paski klatek świateł, API hotspotów i arbitraż kliknięć, hotspoty z instancji | `canvas-pig.js`, `places/scenes.js` |
| PK-PF2 | akcje lamp, straż `toggle:false`, koniec `initCanvasLampClick` i plamy 120,65, świnki do canvasa, warstwa pogody, nocne lampy plenerowe | `places/feature.{js,css}` |
| PK-PE2 | zakładka Outdoor, `.edit-hint`, blokada fixture, filtry, szablony, skórki (27), lampy (25) | `places/edit-panel.{js,css}` |
| PK-APP2 | kolejność ładowania nowych modułów, koniec okien Farma i Targ | `app.js`, `index.html`, `features/index.json` |
| PK-P46c | C#: reguły dla `room_*` na dworze, toast `fixture_locked` | `RoomsFeature.cs`, `RoomsMessages.cs`, testy |
| PK-P25c | Core: fizyka lamp (stopa vs wysokość sprite'a), luki katalogu i atlasu | `world_items.json`, `atlas.json`, `RoomLayoutOps.cs`, testy |

## 4. Własność gorących plików (dlaczego tak mało kroków)
| Plik | F2-2 | F2-4 |
|---|---|---|
| `canvas-pig.js` | PK-P47r | PK-CV2 |
| `places/feature.js` | PK-P47c | PK-PF2 |
| `places/edit-panel.js` | nikt | PK-PE2 |
| `places/scenes.js` | PK-P46b | PK-CV2 |
| `place_scenes.json` | PK-P47a | nikt |
| `world_items.json`, `atlas.json`, `RoomLayoutOps.cs` | PK-P46a | PK-P25c |
| `index.html`, `style.css` | PK-P47c | PK-APP2 (tylko `index.html`) |
| `lib/lights.js`, `lights.json` | PK-P6c | nikt |
Nowe pliki (`lib/*.js`, `places/edit-*.js`, `scene_hotspots.json`, `weather.json`) ma każdy po jednym autorze. Generator odrzuca plan, w którym dwie paczki jednego wpisu dzielą plik.

## 5. Testy (szczegółowe)
- Każda paczka implementująca pisze testy NAJPIERW (listy przypadków w jej prompcie: ok. 90 przypadków w F2-2 i F2-4).
- **F2-5: 13 niezależnych agentów testowych, ok. 150 przypadków.** Zasada: nie czytają testów implementujących, kodu nie poprawiają, wada = `DEFECT <id>` (JS: kod 0, z `STRICT=1` kod 1; C#: `Skip = "DEFECT ..."`), brak API = `SKIP <id>: <powód>`.

| Paczka | Zakres | Przypadków |
|---|---|---|
| PK-P46t1 | Core: model instancji "na zepsucie" (stary zapis, duplikaty uid, 100 cykli zapisu, usunięte nie wracają) | 10+ |
| PK-P46t2 | przeglądarka: regresja wszystkich scen i pór dnia, Edit, pasek, chip | 8+ |
| PK-T3 | hotspoty, panele targu i farmy, lampy | 16 |
| PK-T4 | wiele świnek, przypięcie, pulpit | 14 |
| PK-T5 | szuflada Edit: Outdoor, filtry, szablony, skórki, podpowiedź | 14 |
| PK-T6 | światło pikselowo: efekt nocy (26), toggle okna, cienie, lampy plenerowe w nocy | 12 |
| PK-T7 | fizyka lamp (25): parytet Core i edytora, 5000 losowych ustawień | 14 |
| PK-T8 | zabawa, skala zabawki, pogoda | 12 |
| PK-T9 | macierz okien (24) i skali świnki (28), DPI | 11 |
| PK-T10 | Core: stare zapisy, migracje, fuzz walidacji wszystkich nowych wiadomości | 10 |
| PK-T11 | 10 scenariuszy gracza end to end na mocku | 10 |
| PK-T12 | wydajność i wycieki (klatka, pamięć, DOM, nasłuchiwacze) | 8 |
| PK-T13 | bazowe zrzuty 7 scen x 4 pory dnia, paleta, przycinanie, arkusz poglądowy | 7 |
Razem z testami wymienionymi w promptach implementujących i istniejącymi `ux-p*` (uruchamianymi przez `ux-all.js`) powstaje sieć kilkuset sprawdzeń. Nowe pliki testów mają nazwy `ux-p<liczba>-*.js`, więc `ux-all.js` je podejmuje.

## 6. Jak ruszyć
1. Scal/commituj te zmiany (nic nie jest wypchnięte; `git status`). Baseline (`docs/opt/log/baseline-smoke.txt`) już jest.
2. Sesja wg `docs/prompts/START_FALA.md` z `FALA = 2`. Orkiestra czyta `waves.yaml` (wpisy `F2-1`..`F2-6`); `max_parallel` w `orkiestra.toml` podniesiono z 4 do 10 (największy wpis ma 18 paczek, reszta czeka w kolejce).
3. **Punkt kontrolny po F2-1** (opcjonalny, 5 minut): przejrzyj 12 plików `R24..R35.md` (sekcje "Prompt fixes" i "pytania do właściciela"). Implementujący i tak stosują te poprawki sami; przerwanie ma sens tylko, gdy badanie wskaże coś, z czym się nie zgadzasz (np. `R24`: przyczyna uwagi 24).
4. Po F2-6: arkusz `docs/qa/UX_WAVE_CHECKS.md` (sekcje fali 2) i zrzuty `docs/qa/shots/owner-*.png`; gra na Windowsie wg 3-5 punktów na funkcję.

## 7. Ryzyka i decyzje właściciela (domyślne odpowiedzi w nawiasach)
1. **Równoległość kosztuje limity modeli:** każde zadanie buduje się od zera w świeżym worktree. `max_parallel = 10` (zmień w `orkiestra.toml`, jeśli limity się wyczerpują; kolejność kroków zostaje) (tak).
2. **Kontrakty zamiast scalonych API:** paczki F2-2 kodują równolegle wg plików badawczych, w testach używają atrap (`STUB`). Ryzyko rozjazdu łapie F2-3 (RI1..RI3 porównują kontrakt z rzeczywistością) i testy F2-4/F2-5 (tak, to dlatego jest krok F2-3).
3. **PK-P5c (druga świnka na pulpicie, C#)** jest weryfikowane tylko buildem i ręcznie na Windowsie; wg R29 może skończyć się BLOCKED bez zmian kodu, reszta fali idzie dalej (tak).
4. **Bez zmian zostają:** pliki fal W21-W33 w `waves.yaml` (część pokrywa się z P39-P47; osobna decyzja, domyślnie nie ruszać) i fale F1 (zrobione) (tak).
5. **Wycofane prompty** (usunięte z `docs/prompts/`, ich treść weszła do nowych paczek): PK-P43a, PK-P43b (-> PK-P43ab i PK-CV2), PK-P43e (-> PK-PF2), PK-P43f (-> PK-APP2), PK-P43q, PK-P46q1, PK-P46q2, PK-P47q (-> PK-Q1, PK-Q2); PK-P46c rozdzielono na JS (PK-PE2) i C# (PK-P46c) (tak).
