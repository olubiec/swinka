# UX Wave Verification & Quality Checks

## Wave P1: Windows Checks & QA Battery

| Check | Command | Pass Criterion | What a human looks at in the real app |
|---|---|---|---|
| Build + Core Tests | `powershell -File tools/build.ps1 -Config Release` | Build exit code 0, all Core xUnit tests pass | App builds cleanly with no compilation or regression errors |
| UX Lifecycle | `node tools/qa/ux-p1-lifecycle.js` | 5/5 PASS (more-after-weight, stale-container, switch-feature, back-button, reopen-resets) | Modals open and close cleanly, Back returns to More, no ghost panels |
| UX Buttons | `node tools/qa/ux-p1-buttons.js` | 4/4 PASS (coloring-play-first-click, coloring-play-each-level, vet-checkup-feedback, vet-checkup-twice) | Coloring "Play" starts level immediately; Vet "Check-up" shows result and updates clovers |
| UX Decorate | `node tools/qa/ux-p1-decorate.js` | 4/4 PASS (decorate-lamp, decorate-opens-room-editor, place-and-save, no-dead-buttons) | "Place in room" opens pig room with item preselected; tapping room places it |
| Web Smoke | `node tools/qa/web-smoke.js` | WEB SMOKE OK, exit code 0 | WebView2 home screens, navigation, and features render properly |
| Assets Check | `node tools/qa/check-assets.js` | Exit code 0, all asset references valid | Sprites, icons, and sounds exist in expected paths |
| EXE Smoke | `powershell -File tools/qa/run-exe-smoke.ps1 -Seconds 25` | Exit code 0, selftest passes, no [ERROR]/Unhandled/Exception in log | Guinea pig walks on desktop, no crashes or errors during launch |

### Manual Checklist (Do sprawdzenia po P1)
1. More → Calendar → Weight → Back: wracasz do siatki More, nie do wagi. Zamknij domek, otwórz More: siatka, nie waga.
2. Kolorowanie: Play lvl 1 od razu pokazuje planszę.
3. Klinika: Check-up działa i pokazuje wynik.
4. Kup lampę grzybek, kliknij Decorate / Place in room: otwiera się pokój.
5. Otwórz domek: świnka i jej dymek znikają razem; zamknij: wracają razem.

## Wave P2: Icons, Portraits & Player

| Check | Command | Pass Criterion | What a human looks at in the real app |
|---|---|---|---|
| UX Portraits | `node tools/qa/ux-p2-portraits.js` | 4/4 PASS (portraits-differ, portrait-matches-main-sprite, unnamed-pig-no-404, all-stages) | Miniatury świnek w More, My pigs i oknie adopcji odpowiadają wyglądowi (rasa, maść, stadium), brak 404 |
| UX Icons | `node tools/qa/ux-p2-icons.js` | 5/5 PASS (shop-icons-unique, store-icons-unique, decor-icons-unique, no-broken-images, icon-scale) | Przedmioty w sklepie, magazynie i dekoracjach mają unikalne ikony ze świata, poprawne skalowanie 16x16 / 32x32 |
| UX Player | `node tools/qa/ux-p2-player.js` | 5/5 PASS (hidden-by-default, click-gramophone-shows, hide-paths, no-gramophone-no-panel, keyboard) | Panel odtwarzacza ukryty domyślnie, pokazuje się po kliknięciu gramofonu, chowa po kliknięciu obok lub Esc, muzyka gra dalej |
| Check Assets & Icons | `node tools/qa/check-assets.js && node tools/qa/check-icons.js` | Exit code 0, ASSETS OK, ICONS OK, brak brakujących lub duplikowanych ikon | Brak brakujących assetów i ikon w interfejsie domku |

### Manual Checklist (Do sprawdzenia po P2)
1. More: każda świnka ma inną ikonę, zgodną z wyglądem.
2. Sklep: ikony przedmiotów są różne i rozpoznawalne.
3. Ekran główny bez stałego odtwarzacza; klik gramofonu go pokazuje, klik obok chowa.

## Wave P3: Places with Arrows & Consistent UI Icons

| Check | Command | Pass Criterion | What a human looks at in the real app |
|---|---|---|---|
| UX Places | `node tools/qa/ux-p3-places.js` | 6/6 PASS (A1 arrow-cycle, A2 own-window, A3 state-kept, A4 rooms-then-garden, A5 locked-hint, A6 no-plan) | Strzałki nawigacji przełączają pokoje i miejsca (dom → ogród → park → farma → targ), brak planu domu, zablokowane miejsca pokazują podpowiedź |
| UX Icons | `node tools/qa/ux-p3-icons.js` | 4/4 PASS (same-icons, size-and-hit, works, no-text-glyph) | Strzałka cofania i krzyżyk zamknięcia we wszystkich oknach to spójne ikony w stylu gry (brak znaków tekstowych) |
| Check Assets & Icons | `node tools/qa/check-assets.js && node tools/qa/check-icons.js` | Exit code 0, ASSETS OK, ICONS OK, brak błędów assetów i ikon | Brak brakujących assetów i ikon w interfejsie domku |

### Manual Checklist (Do sprawdzenia po P3)
1. Strzałki po bokach przechodzą: dom (pokoje) → ogród → park → farma → targ.
2. Każde miejsce wygląda jak własne okno, bez śladów poprzedniego.
3. Zablokowane miejsca pokazują, co je odblokuje, a nie puste okno.



## Wave P31: Core & Scene Data (Places Rework)

| Check | Command | Pass Criterion | What a human looks at in the real app |
|---|---|---|---|
| Build + Core Tests | `powershell -ExecutionPolicy Bypass -File tools/build.ps1 -Config Release` | Build exit code 0, all Core xUnit tests pass | App builds cleanly with no compilation or regression errors |
| Place Scenes Data Validator | `node tools/qa/place-scenes-check.js` | Exit code 0, 7/7 checks OK (C1-C7) | assets/data/place_scenes.json poprawnie definiuje tła, wymiary, pasy podłogi i pierścień wyjść dla wszystkich miejsc |
| Core Pig Location & Roaming | `dotnet test tests/Cuy.Core.Tests/Cuy.Core.Tests.csproj -c Release --filter "FullyQualifiedName~PigLocationTests"` | Exit code 0, 12/12 tests PASS (L1-L10, config, roamer helpers) | Logika lokacji świnki, wędrowania po sąsiednich scenach, przypinania i snu nocnego |

### Manual Checklist (Do sprawdzenia po P31)
1. Testy Core `PigLocation` i `place-scenes-check` zielone w logu `PK-P31q`.
2. `assets/data/place_scenes.json` ma 4 miejsca i pas podłogi dla każdego (log PK-P31a podaje prostokąty). Opcjonalnie: otwórz `assets/world/bg/garden_day.png` i sprawdź, czy prostokąt leży na trawie, nie na stawie.
3. Gra startuje jak dotąd, nic się nie zmieniło.

## Wave P32: Bridge & Scene Module (Places Rework)

| Check | Command | Pass Criterion | What a human looks at in the real app |
|---|---|---|---|
| Build + Core Tests | `powershell -ExecutionPolicy Bypass -File tools/build.ps1 -Config Release` | Build exit code 0, all Core xUnit tests pass | App builds cleanly with no compilation or regression errors |
| Place Scenes Data Validator | `node tools/qa/place-scenes-check.js` | Exit code 0, 7/7 checks OK (C1-C7) | assets/data/place_scenes.json poprawnie definiuje tła, wymiary, pasy podłogi i pierścień wyjść dla wszystkich miejsc |
| Scenes Data & Mock JS | `node tools/qa/ux-p32-scenes-data.js` | Exit code 0, 6/6 PASS (S1-S6) | Moduł scenes.js i mock poprawnie wyliczają kolejność, pierścień, tła wg pory dnia, pas podłogi i scenę świnki |
| Core Scene Order | `dotnet test tests/Cuy.Core.Tests/Cuy.Core.Tests.csproj -c Release --filter "FullyQualifiedName~SceneOrderTests"` | Exit code 0, 5/5 tests PASS (O1-O4, dorm locked) | Logika pierścienia scen (salon -> pokoje świnek -> dorm -> ogród -> park -> farma -> targ), sąsiedztwa i odblokowań |

### Manual Checklist (Do sprawdzenia po P32)
1. Gra startuje, Home się otwiera, brak błędów w `%LocalAppData%\Cuy\logs\cuy.log` ze słowami places/pigLocation.
2. W logu `PK-P32a` jest kontrakt wiadomości (`docs/contracts/places-pig-location.md`).
3. Wizualnie bez zmian.

## Wave P33: Scene Drawing & Canvas Background (Places Rework)

| Check | Command | Pass Criterion | What a human looks at in the real app |
|---|---|---|---|
| Build + Core Tests | `powershell -ExecutionPolicy Bypass -File tools/build.ps1 -Config Release` | Build exit code 0, all Core xUnit tests pass | App builds cleanly with no compilation or regression errors |
| UX Scene Drawing | `node tools/qa/ux-p33-scene-draw.js` | Exit code 0, 7/7 PASS (E1-E7) | Płótno CanvasPig rysuje tło sceny, sortuje elementy wg y, chowa świnkę i zachowuje wsteczną zgodność z pokojem |
| UX All Suite | `node tools/qa/ux-all.js` | ux-p32 i ux-p33 PASS (skrypty Playwright wymagają pakietu) | Wszystkie skrypty QA bez zewnętrznych zależności przechodzą pomyślnie |
| Check Assets & Icons | `node tools/qa/check-assets.js && node tools/qa/check-icons.js` | Exit code 0, ASSETS OK, ICONS OK | Brak brakujących assetów i ikon w projekcie |

### Manual Checklist (Do sprawdzenia po P33)
1. Wizualnie nadal bez belki, ale testy `ux-p33-scene-draw` pokazują, że ogród, park, farma, targ mają własne tło, a pokój nadal ma tapetę i podłogę.
2. Domek wygląda jak przed zmianą (brak regresji): tapeta, podłoga, meble, świnka chodzi.
3. Klik i przeciąganie świnki działają jak wcześniej.

## Wave P34: Pig Walking & Exits (Places Rework)

| Check | Command | Pass Criterion | What a human looks at in the real app |
|---|---|---|---|
| Build + Core Tests | `powershell -ExecutionPolicy Bypass -File tools/build.ps1 -Config Release` | Build exit code 0, all Core xUnit tests pass | App builds cleanly with no compilation or regression errors |
| UX Pig Walk | `node tools/qa/ux-p34-pig-walk.js` | Exit code 0, 8/8 PASS (W1-W8) | Świnka chodzi po całej podłodze 2D z głębią, skalowaniem wg y, y-sort z meblami, wchodzi i wychodzi przez krawędzie sceny |
| UX All Suite | `node tools/qa/ux-all.js` | ux-p32, ux-p33, ux-p34 PASS (skrypty Playwright wymagają pakietu) | Wszystkie skrypty QA bez zewnętrznych zależności przechodzą pomyślnie |
| Check Assets & Icons | `node tools/qa/check-assets.js && node tools/qa/check-icons.js` | Exit code 0, ASSETS OK, ICONS OK | Brak brakujących assetów i ikon w projekcie |

### Manual Checklist (Do sprawdzenia po P34)
1. Świnka w domku chodzi po całej podłodze, także w głąb ekranu, i jest trochę mniejsza, gdy stoi wyżej.
2. Zabawki (tunel, domek) nadal działają.
3. Przeciągnięcie świnki poza okno nadal wyprowadza ją na pulpit.
4. Brak migotania, przeskoków rozmiaru i rozmycia.

## Wave P35: UI Art & Cleanup (Places Rework)

| Check | Command | Pass Criterion | What a human looks at in the real app |
|---|---|---|---|
| Build + Core Tests | `powershell -ExecutionPolicy Bypass -File tools/build.ps1 -Config Release` | Build exit code 0, all Core xUnit tests pass | App builds cleanly with no compilation or regression errors |
| UX Cleanup | `node tools/qa/ux-p35-cleanup.js` | Exit code 0, 5/5 PASS (C1-C5) | Brak strzałek nawigacji w oknach, brak planu domu, zakładki pokoi działają, brak błędów konsoli |
| UX All Suite | `node tools/qa/ux-all.js` | Exit code 0, 12/12 PASS | Wszystkie skrypty QA pakietu UX przechodzą pomyślnie |
| Check Assets & Icons | `node tools/qa/check-assets.js && node tools/qa/check-icons.js` | Exit code 0, ASSETS OK, ICONS OK | Brak brakujących assetów i ikon w projekcie |
| UI Style Check | `python3 tools/art/style_check.py --baseline docs/album/stylbook/lint_baseline.txt` | Exit code 0, 0 violations | Nowe ikony UI (strzałki, wstecz) zgodne ze stylebookiem i paletą |

### Manual Checklist (Do sprawdzenia po P35)
1. Obejrzyj `docs/qa/shots/p35a-ui-pieces.png`: strzałki i „wstecz" są z tej samej rodziny co X (drewniana ramka, jasny znak). Jeśli nie, napisz co poprawić.
2. W oknach Pokoje, Ogród, Farma, Targ nie ma już strzałek na bokach ani planu domu. Pokoje przełączasz zakładkami w oknie Pokoi.
3. Decorate działa jak wcześniej.




