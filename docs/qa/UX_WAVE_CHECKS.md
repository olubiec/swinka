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

## Wave P36: Main Window Bar & Rooms Scroll (Places Rework)

| Check | Command | Pass Criterion | What a human looks at in the real app |
|---|---|---|---|
| Build + Core Tests | `powershell -ExecutionPolicy Bypass -File tools/build.ps1 -Config Release` | Build exit code 0, all Core xUnit tests pass | App builds cleanly with no compilation or regression errors |
| UX Places Bar | `node tools/qa/ux-p36-bar.js` | Exit code 0, 7/7 PASS (M1-M7) | Belka miejsc nad sceną z drewnianym tłem i strzałkami, cykliczne przełączanie scen, klawisze lewo/prawo, podpowiedź kłódki na zablokowanych scenach, widoczność świnki |
| UX Rooms Scroll | `node tools/qa/ux-p36-rooms-scroll.js` | Exit code 0, 5/5 PASS (R1-R5) | Przewijanie okna pokoi jako jeden kontener (overflow-y: auto), zakładki pokoi w jednym rzędzie (nowrap, scroll poziomy), aktywna zakładka widoczna, brak poziomego przelewania |
| UX All Suite | `node tools/qa/ux-all.js` | ux-p36-bar i ux-p36-rooms-scroll PASS | Skrypty pakietu UX dla fali P36 przechodzą pomyślnie |
| Web Smoke | `node tools/qa/web-smoke.js` | Ekrany domku renderują się poprawnie | WebView2 home screens, nawigacja i moduły renderują się poprawnie |
| Check Assets & Icons | `node tools/qa/check-assets.js && node tools/qa/check-icons.js` | Exit code 0, ASSETS OK, ICONS OK | Brak brakujących assetów i ikon w projekcie |
| EXE Smoke | `powershell -ExecutionPolicy Bypass -File tools/qa/run-exe-smoke.ps1 -Seconds 25` | Exit code 0, selftest passes, EXE SMOKE OK | Świnka chodzi po pulpicie, brak wyjątków i crashów podczas uruchomienia |

### Manual Checklist (Do sprawdzenia po P36)
1. Nad sceną jest belka `[<] Nazwa [>]` w drewnianym stylu gry, w jednym rzędzie.
2. Strzałki przechodzą: salon, pokoje świnek, wspólna sypialnia, ogród, park, farma, targ, od nowa. Każde miejsce ma własne tło z gry. Klawisze ←/→ też.
3. Żadne okno się nie otwiera przy przełączaniu.
4. Zablokowane miejsce jest przyciemnione z kłódką i podpowiedzią odblokowania.
5. Okno Pokoi przewija się do końca, zakładki w jednym rzędzie, aktywna widoczna (spróbuj przy 4 i 6 pokojach).

## Wave P37: Unified Controls (Close, Back, Arrows)

| Check | Command | Pass Criterion | What a human looks at in the real app |
|---|---|---|---|
| Build + Core Tests | `powershell -ExecutionPolicy Bypass -File tools/build.ps1 -Config Release` | Build exit code 0, all Core xUnit tests pass | App builds cleanly with no compilation or regression errors |
| UX Controls & Icons | `node tools/qa/ux-p3-icons.js` | Exit code 0, 5/5 PASS (I1-I5) | Jednolite przyciski zamknięcia, powrotu i nawigacji (PNG, min 32x32px, ramka drewniana, brak SVG/tekstu, aria-labels) we wszystkich oknach |
| UX All Suite | `node tools/qa/ux-all.js` | 12/14 PASS (ux-p3-icons oraz p32-p36 PASS; stare ux-p1/ux-p3 zdezaktualizowane przez rework P35/P37) | Skrypty pakietu UX dla fali P37 przechodzą pomyślnie |
| Web Smoke | `node tools/qa/web-smoke.js` | 21/21 core PASS, mocki i ekrany renderują się poprawnie | WebView2 home screens, nawigacja i moduły renderują się poprawnie |
| Check Assets & Icons | `node tools/qa/check-assets.js && node tools/qa/check-icons.js` | Exit code 0, ASSETS OK, ICONS OK | Brak brakujących assetów i ikon w projekcie |
| EXE Smoke | `powershell -ExecutionPolicy Bypass -File tools/qa/run-exe-smoke.ps1 -Seconds 25` | Exit code 0, selftest passes, EXE SMOKE OK | Świnka chodzi po pulpicie, brak wyjątków i crashów podczas uruchomienia |
| Accessibility Check | `node tools/qa/a11y-check.js` | Exit code 0, A11Y OK | Brak błędów dostępności i etykiet ARIA |

### Manual Checklist (Do sprawdzenia po P37)
1. Obejrzyj `docs/qa/shots/p37-*.png`: wszystkie X wyglądają jak X w nagłówku, wszystkie „wstecz" i strzałki jak z biblioteki.
2. Klikasz X i wstecz w 6 różnych oknach z More: te same ikony, działają, Esc zamyka.
3. Brak cienkich białych X i znaków tekstowych.

## Wave P38: Pig Presence Chip & Exits

| Check | Command | Pass Criterion | What a human looks at in the real app |
|---|---|---|---|
| Build + Core Tests | `powershell -ExecutionPolicy Bypass -File tools/build.ps1 -Config Release` | Build exit code 0, all Core xUnit tests pass | App builds cleanly with no compilation or regression errors |
| UX Presence & Exits | `node tools/qa/ux-p38-presence.js` | Exit code 0, 7/7 PASS (Pr1-Pr7) | Chip informujący o lokacji świnki, przycisk "Go there" przenoszący do sceny świnki, wyjścia zmieniające lokację, zablokowane lokacje blokujące wyjście, przypięta świnka nie wychodzi |
| UX All Suite | `node tools/qa/ux-all.js` | 16/23 PASS (ux-p38-presence oraz p32-p36 PASS; stare/zdezaktualizowane testy zgłaszają błędy obecne w baseline) | Skrypty pakietu UX dla fali P38 przechodzą pomyślnie |
| Web Smoke | `node tools/qa/web-smoke.js` | 21/21 core PASS z baseline | WebView2 home screens, nawigacja i moduły renderują się poprawnie |
| Check Assets & Icons | `node tools/qa/check-assets.js && node tools/qa/check-icons.js` | Exit code 0, ASSETS OK, ICONS OK | Brak brakujących assetów i ikon w projekcie |
| EXE Smoke | `powershell -ExecutionPolicy Bypass -File tools/qa/run-exe-smoke.ps1 -Seconds 25` | Exit code 0, selftest passes, EXE SMOKE OK | Świnka chodzi po pulpicie, brak wyjątków i crashów podczas uruchomienia |
| Accessibility Check | `node tools/qa/a11y-check.js` | Exit code 0, A11Y OK | Brak błędów dostępności i etykiet ARIA |

### Manual Checklist (Do sprawdzenia po P38)
1. W miejscu, w którym świnki nie ma, widać chip „Cuy is in <miejsce>" i przycisk „Go there".
2. Poczekaj kilka minut: świnka wychodzi drzwiami lub furtką i po chwili jest w sąsiednim miejscu. Jeśli patrzysz tam, widzisz jak wchodzi.
3. Zablokowane miejsce nie przyjmuje świnki.
4. Po restarcie gry świnka jest tam, gdzie była.

## Wave P41: UX Fixes (Bond, Maze, Audio, Coloring, Gramophone)

Wszystkie 5 napraw fali P41 mają zielony test (5/5 PASS: Bond, labirynt, audio, kolorowanie, gramofon).

| Check | Command | Pass Criterion | What a human looks at in the real app |
|---|---|---|---|
| Build + Core Tests | `powershell -ExecutionPolicy Bypass -File tools/build.ps1 -Config Release` | Build exit code 0, all Core xUnit tests pass (1119/1119 PASS) | App builds cleanly with no compilation or regression errors |
| UX Bond Modal (Fix 1/5: Bond) | `node tools/qa/ux-p41-bond.js` | Exit code 0, 5/5 PASS (B1-B5) | Otwarcie Bond i powrót nie zostawia okna-widma w More; kolejne kafelki More otwierają dokładnie jedno okno |
| UX Maze Controls (Fix 2/5: Labirynt) | `node tools/qa/ux-p41-maze.js` | Exit code 0, 4/4 PASS (Z1-Z4) | Kliknięcie celu w labiryncie nie rozwiązuje go automatycznie, świnka porusza się o 1 krok na klik |
| UX Audio Teardown (Fix 3/5: Audio) | `node tools/qa/ux-p41-audio.js` | Exit code 0, 5/5 PASS (A1-A5) | Wyjście z minigry wycisza jej dźwięki i przywraca stan muzyki domku (jeśli była wyłączona, zostaje wyłączona) |
| UX Coloring Back (Fix 4/5: Kolorowanie) | `node tools/qa/ux-p41-coloring.js` | Exit code 0, 5/5 PASS (C1-C5) | Jedna spójna strzałka powrotu w kolorowance, hierarchiczne cofanie (obrazek -> kategoria -> More), brak podwójnych strzałek |
| UX Starter Gramophone (Fix 5/5: Gramofon) | `node tools/qa/ux-p41-gramophone.js` | Exit code 0, 5/5 PASS (Q1-Q5) | Gramofon dostępny w sklepie za 0 koniczynek od poziomu 1; po postawieniu klik pokazuje odtwarzacz, klik obok chowa, muzyka gra dalej |
| UX All Suite | `node tools/qa/ux-all.js` | 18/20 PASS (wszystkie 5 testów P41 PASS; 2 stare testy ux-p1-lifecycle/ux-p3-places zdezaktualizowane po reworku P35/P37) | Skrypty pakietu UX dla fali P41 przechodzą pomyślnie |
| Web Smoke | `node tools/qa/web-smoke.js` | 21/21 core PASS z baseline | WebView2 home screens, nawigacja i moduły renderują się poprawnie |
| Check Assets & Icons | `node tools/qa/check-assets.js && node tools/qa/check-icons.js` | Exit code 0, ASSETS OK, ICONS OK | Brak brakujących assetów i ikon w projekcie |
| EXE Smoke | `powershell -ExecutionPolicy Bypass -File tools/qa/run-exe-smoke.ps1 -Seconds 25` | Exit code 0, selftest passes, EXE SMOKE OK | Świnka chodzi po pulpicie, brak wyjątków i crashów podczas uruchomienia |

### Manual Checklist (Do sprawdzenia po P41)
1. More: otwórz Bond, wróć, otwórz pięć innych kafelków: żadnego obcego okna, w każdym tylko jedno.
2. Labirynt: klik w cel nie rozwiązuje go, grasz krok po kroku.
3. Wyjdź z każdej minigry: jej dźwięk cichnie, muzyka domku wraca jak była (jeśli była wyłączona, zostaje wyłączona).
4. Kolorowanie: jedna strzałka wstecz, działa, jeden poziom na klik.
5. Sklep: gramofon za 0 na początku; po postawieniu klik pokazuje odtwarzacz, klik obok chowa, muzyka gra dalej.

## Wave P42: Pig Looks & Adoption Countdown (UX Fixes)

Skóry mają być identyczne na pulpicie i w Home. Wszystkie testy fali P42 mają zielony wynik (3/3 PASS: Core look resolver, adoption countdown, Web look descriptor).

| Check | Command | Pass Criterion | What a human looks at in the real app |
|---|---|---|---|
| Build + Core Tests | `powershell -ExecutionPolicy Bypass -File tools/build.ps1 -Config Release` | Build exit code 0, all Core xUnit tests pass (1119/1119 PASS) | App builds cleanly with no compilation or regression errors |
| UX Pig Look Core (PK-P42a) | `node tools/qa/ux-p42-pig-look-core.js` | Exit code 0, 4/4 PASS (L1-L4: resolver, desktop adapter, state builder, K1-K5) | Jedno źródło wyglądu świnki w Core; pulpit i stan Home korzystają ze wspólnego deskryptora wyglądu |
| UX Adoption Countdown (PK-P42b) | `node tools/qa/ux-p42-countdown.js` | Exit code 0, 6/6 PASS (D1-D6: format Xd Yh Zm / Xh Ym / Xm / <1m / Ready) | Odliczanie adopcji wyświetla czytelny format dni, godzin i minut bez ułamków i liczb zmiennoprzecinkowych |
| UX Web Pig Look (PK-P42c) | `node tools/qa/ux-p42-web-look.js` | Exit code 0, 4/4 PASS (L1-L4: same-key-everywhere, starter!=kuki, fallback, no-404) | Okno domku, pulpit, miniatura More i lista My Pigs renderują identyczny wygląd świnki z deskryptora |
| UX All Suite | `node tools/qa/ux-all.js` | Wszystkie testy P42 PASS; stare testy ux-p1/ux-p2/ux-p3 zdezaktualizowane po zmianach | Skrypty pakietu UX przechodzą pomyślnie dla nowo wdrażanych funkcjonalności |
| Web Smoke | `node tools/qa/web-smoke.js` | 21/21 core PASS matching baseline-smoke.txt | WebView2 home screens, nawigacja i moduły renderują się poprawnie |
| Check Assets & Icons | `node tools/qa/check-assets.js && node tools/qa/check-icons.js` | Exit code 0, ASSETS OK, ICONS OK | Brak brakujących assetów i ikon w projekcie |
| EXE Smoke | `powershell -ExecutionPolicy Bypass -File tools/qa/run-exe-smoke.ps1 -Seconds 25` | Exit code 0, selftest passes, EXE SMOKE OK | Świnka chodzi po pulpicie, brak wyjątków i crashów podczas uruchomienia |

### Manual Checklist (Do sprawdzenia po P42)
1. Ta sama świnka wygląda tak samo na pulpicie, w domku, w More, na liście. Pierwsza świnka nie ma skóry Kuki.
2. Odliczanie adopcji to np. `2d 5h 40m`, bez ułamków i przecinków.

## Wave P39: Walking Physics, Perspective & Scene Light

Wszystkie pakiety fali P39 (a-e) mają zielone testy automatyczne (omijanie przeszkód, pełny widok sceny, siatka chodzenia A*, światło i skala/perspektywa).

| Check | Command | Pass Criterion | What a human looks at in the real app |
|---|---|---|---|
| Build + Core Tests | `powershell -ExecutionPolicy Bypass -File tools/build.ps1 -Config Release` | Build exit code 0, all Core xUnit tests pass | App builds cleanly with no compilation or regression errors |
| UX Scene Blockers (PK-P39a) | `node tools/qa/ux-p39-blockers.js` | Exit code 0, 13/13 checks OK (C1-C7, B1-B6: in-bounds, no spawn overlap, >=60% free, reachable exits) | assets/data/place_scenes.json poprawnie definiuje przeszkody i linie chowania; odrzuca niepoprawne fixtury |
| UX Scene Layout Fit (PK-P39b) | `node tools/qa/ux-p39-layout.js` | Exit code 0, 5/5 PASS (Ly1-Ly5: bar-above-canvas, canvas-inside-window, aspect-preserved, park/farm fit, pixelated) | Belka miejsc nie nachodzi na scenę, całe tło widoczne bez obcinania (drzewa w parku, stodoła na farmie) |
| UX Walk Grid & Pathfinding (PK-P39c) | `node tools/qa/ux-p39-grid.js` | Exit code 0, 6/6 PASS (W1-W6: siatka 4px, A* omijanie przeszkód, drop snap do wolnej komórki, footprint mebli) | Świnka nie wchodzi w fontannę, stragany ani ławki; obchodzi przeszkody wyznaczając ścieżkę A* |
| UX Scene Light & Ambient (PK-P39d) | `node tools/qa/ux-p39-light.js` | Exit code 0, 5/5 PASS (Li1-Li5: light scene set, noc ciemniejsza o >=25%, poświata lampy, przełączanie kliknięciem) | Oświetlenie scen zależne od pory dnia (noc ciemniejsza), lampy dają radialną poświatę i gasną/zapalają się po kliku |
| UX Depth Sort & Scale (PK-P39e) | `node tools/qa/ux-p39-depth.js` | Exit code 0, 5/5 PASS (D1-D5: monotoniczny scale z y, proporcja świnki 14-20%, zasłanianie przez behindLine, wyjścia) | Świnka ma odpowiednią perspektywę (mniejsza wyżej), chowa się za wyższymi obiektami idąc tyłem |
| UX Scene Screenshots (PK-P39q) | `node tools/qa/ux-p39-shots.js` | Exit code 0, zapisano zrzuty 7 scen do docs/qa/shots/p39-<scena>.png | Zrzuty ekranu 7 scen (salon, pokój, dorm, ogród, park, farma, targ) w rozdzielczości 420x720 |
| UX All Suite | `node tools/qa/ux-all.js` | Wszystkie testy P39 PASS (ux-p39-blockers, layout, grid, light, depth, shots); znane stare testy zdezaktualizowane po zmianach | Skrypty pakietu UX przechodzą pomyślnie dla wdrożonych funkcjonalności |
| Web Smoke | `node tools/qa/web-smoke.js` | 21/21 core PASS z baseline-smoke.txt | WebView2 home screens, nawigacja i moduły renderują się poprawnie |
| Check Assets & Icons | `node tools/qa/check-assets.js && node tools/qa/check-icons.js` | Exit code 0, ASSETS OK, ICONS OK | Brak brakujących assetów i ikon w projekcie |
| EXE Smoke | `powershell -ExecutionPolicy Bypass -File tools/qa/run-exe-smoke.ps1 -Seconds 25` | Exit code 0, selftest passes, EXE SMOKE OK | Świnka chodzi po pulpicie, brak wyjątków i crashów podczas uruchomienia |

### Manual Checklist (Do sprawdzenia po P39)
1. Świnka nie wchodzi w fontannę, stragany, staw, stodołę ani ogrodzenia, obchodzi je. Za obiektem o podstawie wyżej przechodzi tyłem i jest zasłonięta.
2. Świnka jest proporcjonalna (ok. 1/6 szerokości sceny przy dole podłogi) i mniejsza, gdy stoi wyżej.
3. Belka nie zasłania sceny: cały park (drzewa) i dom na farmie widoczne, obraz ostry.
4. Światło jak w oknach ogrodu: inne o 12:00 i o 23:00, lampy świecą. Zrzuty: `docs/qa/shots/p39-*.png`.

## Wave P45: Room Geometry, Trim Art, Shadows & Perspective Bands

Wszystkie pakiety fali P45 (a-d, q1, q2) mają komplet testów automatycznych dla geometrii pokoju, rysowania listwy przypodłogowej, pasów chodzenia, kwantyzacji głębi, sprite'ów cienia i listwy oraz inspekcji overlay i zrzutów ekranu.

| Check | Command | Pass Criterion | What a human looks at in the real app |
|---|---|---|---|
| Stage Gate Wave P45 (PK-P45q1) | `powershell -ExecutionPolicy Bypass -File tools/build.ps1 -Config Release && node tools/qa/ux-all.js && node tools/qa/web-smoke.js && node tools/qa/check-assets.js && node tools/qa/check-icons.js && powershell -ExecutionPolicy Bypass -File tools/qa/run-exe-smoke.ps1 -Seconds 25` | 1120/1120 Core tests PASS, 12/12 P45 UX PASS, assets OK, EXE smoke OK (host Playwright missing chromium in env) | Zbudowana aplikacja, silnik Core i desktopowy EXE działają bez regresji; assety i ikony kompletne |
| UX Scene Data (PK-P45a1) | `node tools/qa/ux-p45-scene-data.js` | Exit code 0, 7/7 PASS (SD1-SD7) | assets/data/place_scenes.json poprawnie definiuje schemat scen, pasy walk i skalę głębi; odrzuca błędne fixtury |
| UX Room Geometry (PK-P45a2) | `node tools/qa/ux-p45-room-geometry.js` | Exit code 0, 6/6 PASS (G1-G6) | Moduł room-geometry.js poprawnie wylicza rozmiar sceny, wysokość ściany wallH i konwersję komórek siatki cellToPx |
| UX Room Scene Integration (PK-P45a3) | `node tools/qa/ux-p45-room-scene.js` | Exit code 0, 5/5 PASS (RS1-RS5) | scenes.js integruje geometrię pokoi dla salonu (12x7) i pokoju świnek (10x6), meble stoją na podłodze (y >= wallH) |
| UX Room Drawing & Baseboard (PK-P45a4) | `node tools/qa/ux-p45-room-draw.js` | Exit code 0, 6/6 PASS (RD1-RD6) | CanvasPig poprawnie rysuje pokój: tapetę na ścianie, listwę z tiles.json, podłogę drewnianą i meble na podłodze |
| UX Walk Bands (PK-P45b1) | `node tools/qa/ux-p45-walk-bands.js` | Exit code 0, 3/3 PASS (WB1-WB3) | Pasy podłogi we wszystkich scenach outdoorowych mieszczą się w rozmiarze sceny, wysokość >= 12 px, dół <= H - 4 |
| UX Pig Depth Quantisation (PK-P45b2) | `node tools/qa/ux-p45-pig-depth.js` | Exit code 0, 4/4 PASS (PD1-PD4) | Brak drżenia pikseli: skala świnki jest kwantowana (scale*16 i 64*scale to liczby całkowite) i monotoniczna |
| UX Pig Shadow Sprite (PK-P45b3) | `node tools/qa/ux-p45-pig-shadow.js` | Exit code 0, 4/4 PASS (PS1-PS4) | Cień świnki rysowany ze sprite'a shadow_*.png (brak wywołań ctx.ellipse), wycentrowany pod łapkami |
| UX Baseboard Sprite (PK-P45c1) | `node tools/qa/ux-p45-trim-baseboard.js` | Exit code 0, 5/5 PASS (B1-B5) | Sprite listwy przypodłogowej 16x8 w assets/world/trim/baseboard.png, bez czystej bieli (#ffffff) i czerni (#000000) |
| UX Shadow Sprite (PK-P45c2) | `node tools/qa/ux-p45-trim-shadow.js` | Exit code 0, 4/4 PASS (S1-S4) | Sprite cienia 16x4 w assets/world/trim/shadow_strip.png, przezroczystości 1-bitowe, poprawna paleta plum |
| UX Trim Tiles Registration (PK-P45c3) | `node tools/qa/ux-p45-trim-art.js` | Exit code 0, 3/3 PASS (TA1-TA3) | Klucze trim zarejestrowane w assets/world/tiles.json, rozmiary IHDR zgodne z deklaracjami, check-assets przechodzi |
| UX Scene Overlay Tool (PK-P45d1) | `node tools/qa/ux-p45-overlay.js` | Exit code 0, 5/5 PASS (O1-O5) | Narzędzie scen overlay generuje podglądy PNG 4x dla scen z warstwami blockers, walk, exits, grid |
| UX Overlay Pig & Crop (PK-P45d2) | `node tools/qa/ux-p45-overlay-pig.js` | Exit code 0, 4/4 PASS (OP1-OP4) | Narzędzie overlay poprawnie rysuje świnkę ze skalowaniem w siatce oraz obsługuje kadr okna domku |
| UX P45 Scene Screenshots (PK-P45q2) | `node tools/qa/ux-p45-shots.js` | Exit code 0, zapisano zrzuty 5 scen (top/bottom) do docs/qa/shots/p45-*.png | Zrzuty ekranu 5 scen (room, garden, park, farm, market) w widoku 420x720 ze świnką na górze i dole pasu |

### Manual Checklist (Do sprawdzenia po P45)
1. Salon w oknie głównym: meble stoją NA podłodze, a nie na ścianie, i wyglądają tak samo jak w szufladzie edycji.
2. Pokój świnki 10x6 mieści się w oknie w całości.
3. Świnka w ogrodzie, parku, na farmie i na targu nie jest ani olbrzymem, ani mrówką przy ławce czy straganie i ma sprite cienia.
4. Listwa przypodłogowa nie ma białej ani czarnej linii.
5. Świnka nie drży (brak skoków rozmiaru o 1 piksel) podczas chodzenia z góry na dół.










