# Plan Cuy (workflow Claude + Jules, przebudowany 27.10.2026)

Claude planuje i pisze pliki zadań, Jules robi dużo małych zadań równolegle, Ty decydujesz i mergujesz. Pro: 100 zadań na ruchome 24 h, 15 naraz.
Zasady z `Workflow Claude + Jules`: 1 zadanie = 1 zachowanie, 1–4 pliki, 50–150 linii, komenda akceptacji, w fali zadania nie dzielą plików,
zadanie zależne idzie do następnej fali, wspólne pliki wcześniej. Lepiej 40 małych niż 10 dużych. Limit otwartych PR = tyle, ile przejrzysz dziś (10–15).

## Architektura (14 linii)
1. `src/Cuy.Core` (.NET Standard 2.0): cała logika bez WinForms: `Pet`, `GameState` (zapis), `Balance`, `AI/Brain` (utility AI), `Save/`, zegar `IClock`.
2. `tests/Cuy.Core.Tests` (xUnit, net9.0): logika testowana z terminala; to główna komenda akceptacji.
3. `src/Cuy` (WinForms, .NET Framework 4.8, na bazie eSheep): okno świnki, tray, `BrainController` (klej), menedżery jedzenia/bobków, `HomeWindow` (host WebView2).
4. `src/Cuy/dotNet/Features` (`IHomeFeature`, znajdywane refleksją) i `src/Cuy/dotNet/Behaviors` (`IDesktopBehavior`): punkty rozszerzeń bez edycji wspólnych plików.
5. `web/home`: Domek w czystym HTML/JS (ES2020, bez frameworków), `bridge.js` (C# ↔ JS + tryb mock), `features/<id>/` (moduły), `minigames/` (Phaser 3).
6. Kontrakty wiadomości i stanu Domku: `docs/contracts.md`. JS nigdy nie liczy cen ani nagród: liczy C#/Core.
7. `assets/data/*.json`: wszystkie liczby do strojenia (ceny, nagrody, czasy, szanse); człowiek stroi, Jules implementuje.
8. Zapis: `%AppData%\Cuy\save.json` z wersją i migracjami; nowe pola tylko z bezpiecznymi domyślnymi.
9. Pulpit testujesz Ty na Windowsie (`tools/build.ps1`, `TESTING.md`); Jules sprawdza Core, kompilację (`EnableWindowsTargeting`) i smoke test Domku.
10. CI (`.github/workflows/ci.yml`): testy Core, kompilacja aplikacji, składnia JS/JSON, smoke test Playwright. CI Fixer Julesa naprawia czerwone checki.
11. `setup.sh`: skrypt środowiska Julesa (Run and Snapshot): .NET 9, restore, npm ci, Playwright.
12. Logika gry oddzielona od renderingu; gry i ekrany trzymają logikę w czystych funkcjach z testami (Memory, Maze).
13. Wersja 1.1 = po fali W5; wersja 2.0 = po fali W8.
14. Poza zakresem: instalator, liścik, ESP32, tryb deweloperski w paczce; opcjonalnie fala W8.

## Biblioteki i zasoby (tylko te; nowa wymaga decyzji człowieka)
| Element | Biblioteka / asset | Licencja |
| --- | --- | --- |
| Okno świnki | eSheep (DesktopPet), .NET Framework 4.8 | MIT |
| Domek | WebView2 1.0.4258.31 | Microsoft |
| JSON, dźwięk | Newtonsoft.Json 13.0.4, NAudio 1.8.4 | MIT |
| Minigry | Phaser 3.90.0 lokalnie (`pixelArt: true`, `roundPixels: true`) | MIT |
| Efekty w Domku | ZzFX 1.4.0 (`web/home/lib/zzfx.min.js`) | MIT |
| Pamiętnik | `TraceryGrammar` (własna implementacja składni Tracery) | własny kod |
| Testy | xUnit 2.9.2, Playwright 1.56.1 (tylko `tools/qa`) | Apache-2.0 / MIT |
| Muzyka, emoji, font | Juhani Junkala (CC0), Twemoji (CC-BY 4.0), Pixelify Sans (OFL) | zob. `THIRD_PARTY_NOTICES.md` |

## Szablon zadania (plik `tasks/Wn-nn-nazwa.md`)
```
# W2-03: Tytuł
Goal: jedno zdanie o zachowaniu.
Depends on: zadania zmergowane przed startem.
Change: pliki, które wolno zmienić.   Do not touch: reszta.
Steps: 1. ... 2. ...
Verify: komenda, która musi przejść.
Prohibited: zmiana istniejących asercji, nowe zależności, pliki spoza Change.
PR: co zrobiono, decyzje i dlaczego, jak sprawdzić ręcznie, screenshot przy zmianach wizualnych.
[WARIANTY]  (tylko zadania kreatywne UI/gry; start: tools/jules-wave.sh variants <plik> 3)
```
Komendy: `CORE` = `dotnet test tests/Cuy.Core.Tests/Cuy.Core.Tests.csproj -c Release`; `BUILD` = `dotnet build src/Cuy/Cuy.csproj -c Release -p:EnableWindowsTargeting=true`;
`SMOKE` = `node tools/qa/web-smoke.js`; `JS` = `node --check` na zmienionych plikach.

## Jak puszczasz falę
**Od 28.10.2026 falę puszcza Jules Loop** (`docs/JULES_LOOP.md`): wypchnij `tasks/W<n>-*.md` na `main`, reszta idzie sama. Kroki 1–2 i 7 poniżej (skrypty) są nieaktualne. 3. Dobrze opisane zadania: bez czekania na plan; ryzykowne
(wspólne pliki, migracje): przejrzyj plan; niejasne: tryb Interactive Plan. 4. Review wg checklisty (CI zielone, diff tylko w „Change”, asercje nietknięte,
brak nowych zależności, opis PR, screenshot), merge od najmniejszego PR. 5. Poprawki: komentarz w PR (`@jules W <plik>:<linia> dzieje się X, a powinno Y.`),
czerwone CI naprawia CI Fixer, po 2 rundach nowe zadanie od gałęzi PR, po trzeciej porażce rozbij zadanie. 6. Koniec fali: sesja „Integracja Wn: wszystkie testy
i build, napraw błędy, zaktualizuj status w docs/PLAN.md”. 7. Backlog: wybrane linie z `tasks/BACKLOG.md` przepisz na pliki fali (nie `tools/jules-backlog.sh`). 8. Do Claude wracasz po pliki
następnej fali (szablon A2) albo gdy błąd jest w koncepcie lub planie.

## Status aktualny (2026-11-02, wieczór)
- **Jules, fale W1-W8: zrobione** (69 zadań w `tasks/done/` + 12 starszych `W-*`; kod w repo). CI na `main` zielone (Core, kompilacja aplikacji, składnia JS/JSON, smoke Domku). Lokalnie w tej sesji przeszły też: layout self-test, web-smoke, anim-test, palette-test, minigame-fit-check, maze-test i kontrola 43 folderów arkuszy.
- **W9 (10 zadań) i W10-01: zastąpione.** Zrobiły to ręcznie fale wizualne V4-V6 (`docs/VISUAL_LOG.md`); pliki przeniesione do `tasks/done/`, żeby pętla ich nie powtórzyła.
- **Grafika (Claude Code, poza Julesem):** V0-V8 i G0-G8 zrobione; wygląd V3 wg commitów: A0-A3 i A5/A6 wykonane (pięć świnek ma osobne arkusze w `assets/sprites/pigs/<id>/<etap>/`), zostają A4, A7 (opcja) i A8 (`docs/PLAN_WYGLAD_V3.md`).
- **Nowe: stado z kolekcji (Ned, Kuki, Glen, James, Racuch)** w falach **W11-W15** (28 zadań), projekt i ekonomia: `docs/NAMED_PIGS.md`, dane: `assets/data/pigs_named.json`. Para Kuki + Ned do adopcji naraz po aktualizacji, James/Glen/Racuch jako oferty adopcji z czasem (90/105/130 dni, 100 koniczynek), losowy próg Legend dla każdej świnki, tryb pamięci dla wszystkich pięciu. W11 (5 zadań) leży w `tasks/` i czeka na start; W12-W15 rozpisuję przed ich startem.
- **Nowe: świat (dom, ogród, park, farma, targ)** w falach **W16-W22** (48 zadań; rozszerzenie o pokoje świnek i dom: W23-W30, 65 zadań) i grafice S0-S5: projekt, ekonomia i niezmienniki w `docs/WORLD.md`, dane w `assets/data/{places,world_items,farm,market,items_farm}.json`, kontrola `node tools/qa/data-check.js`. Pliki zadań W16-W22 piszę tuż przed startem każdej fali (nie leżą w `tasks/`, żeby żadna pętla ich nie podjęła przedwcześnie).
- **Pętla:** pętla Julesa jest wyłączona ręcznie (`jules-loop.yml` = disabled_manually): żadna fala nie ruszy, dopóki w Actions nie klikniesz "Enable workflow". Nowa pętla (Antigravity) jest wdrażana osobno; do jej uruchomienia niczego nie włączamy. Otwarty PR #75 (W3-04.1, diary) jest sprzed wyłączenia i czeka na decyzję.

## Status historyczny (27.10.2026, wieczór)
- Zrobione i scalone: fale 0–1 starego planu, F2-01, F2-03..F2-11 (w tym **F2-07 zabawki**), F3-02, F3-04, F3-05, **PR #32** (W1-01 karta przypomnienia + W1-02 stan kalendarza + W2-01 tick; scalone, ale z lukami).
- Luki po PR #32: dane opieki (`care.json`) nie są nigdzie wczytywane, wiadomości z JS nie są walidowane, brak mapowania snake_case. Naprawiają W1-09, W1-10 i przepisane W2-01 (stare pliki w `tasks/done/`).
- Nadal nie istnieje: tabele więzi i siana jako ładowane dane (W1-06/07), pamiętnik, host zachowań, ekran pamiętnika, filtr etapów, dźwięk w ustawieniach.
- Reguła danych (nowa w AGENTS.md): każda tabela danych ma `Current`/`Load`/`LoadDefault` jak `EconomyConfig`; testy używają wstrzykiwanych tabel `Pet`, nie statyków. Nowe zachowania Core są za flagą w `Balance` (`HayRackActive`, `DiaryActive`), włączaną w `GameSession.Open`.
- Research R1–R20 wdrożony (`RESEARCH.md`, `DECYZJE.md`); rzeczy do sprawdzenia na PC: `TESTY_RECZNE.md`. Windows: nie zbudowano `tools/build.ps1` po falach 2–3 starego planu: zrób to po „Integracji W2”.

## Fale (A1)
**Stan 28.10.2026 (wg `gh api pulls`):** W1 zamknięte (PR #3–#49). W2 zrobione poza **W2-06 (PR #61, otwarty, poza pętlą)**. W3: 9 zadań w `tasks/` (format pętli) – aktywna fala pętli: W3-01, 02, 03, 04, 05, 06, 07, 08, 11. Dawne W3-09 i W3-10 weszły do W4 (W4-01, W4-02). Fale W4–W8 są rozpisane w `tasks/` w formacie pętli; pętla uruchamia je po kolei po W3. W3-11 bez kroku `ci.yml` (pętla nie rusza `.github/workflows/`; krok dodaje człowiek). Prompty integracyjne z `docs/wave-prompts.md` są nieużywane – integrację robi pętla.
### W1 (9; bez zależności; W1-06/07 dotykają innych plików niż reszta)
| ID | Cel | Zmieniaj | Akceptacja |
| --- | --- | --- | --- |
| W1-03 | Moduł `layoutProblems` dla smoke testu + self-test | `tools/qa/lib/layout.*`, `ci.yml` | `layout.selftest.js` + SMOKE |
| W1-04 | Usunięcie przykładów i poprawna lista funkcji | `features/index.json`, `hello/`, `PingFeature.cs` | SMOKE + BUILD |
| W1-05 | 48+ szablonów pamiętnika (dane) + test | `diary.json`, `DiaryTemplatesTests.cs`, `docs/diary-grammar.md` | CORE |
| W1-06 | Tabela więzi: Current/Load, `IsUnlocked`, `NextUnlock` | `bond.json`, `Bond/BondUnlocks.cs`, `Pet.Bond.cs`, testy | CORE |
| W1-07 | Paśnik z sianem (Core): stan, dosypanie, zużycie | `hay.json`, `Hay/HayConfig.cs`, `GameState.Hay.cs`, `Pet.Hay.cs`, testy | CORE |
| W1-08 | Kontrakt wtyczek zachowań pulpitu | `Behaviors/IDesktopBehavior.cs`, `BehaviorContext.cs` | BUILD |
| W1-09 | Loader danych opieki `CareData` | `Care/CareData.cs`, testy | CORE |
| W1-10 | Walidacja wejść z formularza opieki `CareInput` | `Care/CareInput.cs`, testy | CORE |
| W1-11 | Nowe rzeczy zależne od etapu (dane) | `items_shop.json`, `items.json`, `BRAKUJACA_GRAFIKA.md`, test | CORE |
**Integracja W1** (zrobiona). Sprawdzenia pomyślne: BondUnlocks.Current, HayConfig.Current, CareData.Current (9 tasks), features/index.json. Naprawiono tools/qa/layout.selftest.js (symlink). Potem **A2-check** (Claude sprawdza, czy W2 nadal pasuje do kodu).
### W2 (10; wymaga W1)
| ID | Cel | Zmieniaj | Akceptacja |
| --- | --- | --- | --- |
| W2-01 | Kalendarz: wczytanie `CareData`, walidacja, odporne handlery | `CalendarFeature.cs` | BUILD + CORE |
| W2-02 | Smoke test: błędy, brakujące pliki, folder=index, layout | `tools/qa/web-smoke.js` | SMOKE |
| W2-03 | Pisarz pamiętnika (czysty): `DiaryWriter`, `DayStats` | `Diary/*`, testy | CORE |
| W2-04 | Siano zużywane online i offline (flaga) + scenariusz 7 dni | `Balance.cs`, `GameSession.cs`, `Pet.cs` (1 linia), testy | CORE |
| W2-05 | Host wtyczek zachowań + `SampleBehavior` (wyłączony) | `Behaviors/BehaviorHost.cs`, `SampleBehavior.cs`, `README.md` | BUILD |
| W2-06 | Powitanie i wołanie z tabeli więzi | `InteractionManager.cs` | BUILD + CORE |
| W2-07 | Filtr etapów w katalogu, ranking jedzenia | `ItemCatalog.cs`, `ItemDefinition`, `Pet.StageCare.cs`, testy | CORE |
| W2-08 | Nagroda poziomu 20: `golden_bowl` raz + wpis w pamiętniku | `Pet.Bond.cs`, `Pet.cs` (1 linia), `items_shop.json`, testy | CORE |
| W2-09 | Ustawienia dźwięku po stronie desktopu | `SoundManager.cs`, `LocalData.cs`, `SettingsFeature.cs` | BUILD |
| W2-10 | Stan Domku: `diary`, `albumDates`, `bondNext`, `hayRack` | `Features/ProgressFeature.cs`, `docs/contracts.md` | BUILD |
**Integracja W2** + **test na Windowsie** (`tools/build.ps1`, kalendarz, zabawki, karta przypomnienia), potem A2-check W3.
### W3 (11 + 1 zarezerwowane; wymaga W2)
| ID | Cel | Zmieniaj | Akceptacja |
| --- | --- | --- | --- |
| W3-01 | Smoke: przejście po funkcjach, menu More, album, gry, toast, pierwszy start | `web-smoke.js` | SMOKE |
| W3-02 | Podpięcie hosta wtyczek do `BrainController` + test w `SelfTest` | `BrainController.cs`, `LocalData.cs`, `SelfTest.cs` | BUILD |
| W3-03 | Pamiętnik: dzienny zapis wieczorem (flaga `DiaryActive`) | `Pet.Diary.cs`, `GameState.DayLog.cs`, `Pet.cs` (1 linia), testy | CORE |
| W3-04 | Ekran Pamiętnik + mock nowych kluczy stanu | `features/diary/*`, `index.json`, `bridge.js` | SMOKE |
| W3-05 | Album: sylwetki, daty, licznik | `app.js`, `style.css` | SMOKE |
| W3-06 | Lista minigier z `games.json` | `index.html`, `minigames-api.js`, `games.json` | SMOKE |
| W3-07 | Ekran ustawień dźwięku + ZzFX | `features/settings/*`, `sound.js`, `lib/zzfx.min.js` | SMOKE |
| W3-08 | Sztuczki (Core): dane i `TryPerformTrick` | `tricks.json`, `Tricks/*`, `Pet.Tricks.cs`, testy | CORE |
| W3-09 | Tryb „away” w Core + detektor pełnego ekranu | `Pet.Away.cs`, `Pet.cs` (2 linie), `FullscreenDetector.cs` | CORE + BUILD |
| W3-10 | Ładowanie arkusza sprite’ów etapu | `Graphics/SpriteSheetLoader.cs`, `SelfTest.cs` | BUILD |
| W3-11 | Generator labiryntu (czysta logika + test) | `hay-maze-logic.js`, `maze-test.js`, `ci.yml` | `maze-test.js` |
| W3-12 | (rezerwa) poprawki z tabeli problemów W2-02, pisane po Integracji W2 | wg tabeli | SMOKE |
**Integracja W3**, potem A2 dla W4.

### W4 (8; wymaga W3) – pliki w `tasks/`
| ID | Cel | Zmieniaj (główne) |
| --- | --- | --- |
| W4-01 | Tryb away + `FullscreenDetector` (Core) | `Platform/FullscreenDetector.cs`, `Pet.Away.cs`, `Pet.cs`, `AwayTests.cs` |
| W4-02 | `SpriteSheetLoader` | `Graphics/SpriteSheetLoader.cs`, `SelfTest.cs` |
| W4-03 | Noty licencyjne | `THIRD_PARTY_NOTICES.md`, `NoticesTests.cs` |
| W4-04 | Paczka: limit rozmiaru, zakazane ścieżki | `tools/package.ps1`, `tools/package/README.txt` |
| W4-05 | WebView2: komunikat o braku, utwardzenie | `HomeWindow.cs` |
| W4-06 | Gra Veggie Memory | `minigames/veggie-memory.js`, `games.json` |
| W4-07 | Osiągnięcia w Core | `achievements.json`, `Achievements/*`, `GameState.Achievements.cs`, `Pet.Achievements.cs` |
| W4-08 | Pomocnik dymków tekstowych | `StatusBubble.cs`, `FormPet.cs` |
### W5 (8; wymaga W4)
| ID | Cel | Zmieniaj (główne) |
| --- | --- | --- |
| W5-01 | Urodziny w Core | `Pet.cs`, `Pet.Birthday.cs`, `Balance.cs`, `GameSession.cs` |
| W5-02 | Self-test: kontrola danych | `SelfTest.cs` |
| W5-03 | Wygląd etapu: hot-swap bez restartu | `Xml.cs`, `StartUp.cs`, `BrainController.cs`, `FormPet.cs` |
| W5-04 | Naprawa `SoundManager.IsFullScreenOrBusy()` | `SoundManager.cs` |
| W5-05 | Chowanie przy pełnym ekranie | `Behaviors/FullscreenHideBehavior.cs`, `PoopManager.cs`, `FoodManager.cs` |
| W5-06 | Strach przed machaną myszką | `Behaviors/MouseFearBehavior.cs` |
| W5-07 | Gra Hay Maze | `minigames/hay-maze.js`, `games.json` |
| W5-08 | Pasek więzi + mock stanu | `app.js`, `style.css`, `bridge.js` |
### W6 (7; wymaga W5)
| ID | Cel | Zmieniaj (główne) |
| --- | --- | --- |
| W6-01 | Urodziny na pulpicie | `BrainController.cs` |
| W6-02 | Karmienie: siano i tort | `HomeWindow.cs`, `FoodManager.cs` |
| W6-03 | Wskaźnik siana w UI | `app.js`, `style.css`, `index.html` |
| W6-04 | Sztuczki na pulpicie | `Features/TricksFeature.cs`, `ContextMenus.cs`, `Pet.Tricks.cs` |
| W6-05 | Osiągnięcia na pulpicie | `Features/AchievementsFeature.cs` |
| W6-06 | Wybór monitora | `StartUp.cs`, `LocalData.cs`, `SettingsFeature.cs`, `FormPet.cs` |
| W6-07 | Ekran Osiągnięcia | `features/achievements/*`, `features/index.json` |
### W7 (5; wymaga W6)
| ID | Cel | Zmieniaj (główne) |
| --- | --- | --- |
| W7-01 | Hub gier w Core: limit dzienny, rekordy | `Pet.cs`, `GameState.Minigames.cs`, `Pet.Minigames.cs`, `HomeWindow.cs` |
| W7-02 | Hub gier w UI | `minigames-api.js`, `minigames.css`, `app.js`, `style.css`, `bridge.js` |
| W7-03 | „Nowa świnka” i wybór monitora w UI | `SettingsFeature.cs`, `SaveSystem.cs`, `features/settings/*` |
| W7-04 | Audyt: opcje deweloperskie tylko w Debug | `ContextMenus.cs`, `Program.cs`, `FormPet.cs`, `BrainController.cs`, `DebugOverlay.cs`, `FormDebug.cs`, `Diagnostics.cs` |
| W7-05 | Ekran Sztuczki | `features/tricks/*`, `features/index.json` |
### W8 (8; wymaga W7) → po integracji **wersja 2.0**
| ID | Cel | Zmieniaj (główne) |
| --- | --- | --- |
| W8-01 | Self-test: menu Release, DLL-e, pliki | `SelfTest.cs` |
| W8-02 | Spięcie ekranów i smoke test wszystkiego | `web-smoke.js`, `features/index.json`, `app.js`, `style.css` |
| W8-03 | README paczki dla gracza | `tools/package.ps1`, `tools/package/README.txt` |
| W8-04 | README i ARCHITECTURE | `README.md`, `ARCHITECTURE.md` |
| W8-05 | Licencje: końcowy przegląd | `THIRD_PARTY_NOTICES.md`, `assets/LICENSES/` |
| W8-06 | Lista 40 testów ręcznych | `TESTING.md` |
| W8-07 | Kontrakty zgodne z kodem | `docs/contracts.md` |
| W8-08 | Strojenie: symulacja 60 dni | `tools/Cuy.Simulator/Program.cs`, `docs/economy-report.md`, dane, testy |
Integrację (testy wygenerowane `T<n>-xx`, scalenie, wpis w `PROJECT_STATE.md`) robi pętla. Człowiek: test na Windowsie, krok `maze-test` w `ci.yml`, ZIP z `tools/package.ps1`. Velopack tylko po Twoim „yes, Velopack”.
### W9-W10 (zastąpione przez fale wizualne V4-V6; pliki w `tasks/done/`)
Dawne zadania W9 (dopasowanie gier, portret karty, sprite-check) i W10-01 wykonały ręcznie V4-V6. Poniżej zostają opcjonalne pomysły z pierwotnej W9.
### Opcjonalne po 2.0 (NIE rozpisane)
Hay Hop, towarzysz, pogoda z Open-Meteo (jedyne użycie internetu: wymaga Twojej zgody), taniec do muzyki, wygląd etapów w Domku. Claude rozpisuje pliki dopiero po Twojej decyzji. Stare prompty: `docs/archive/jules-F-tasks/`.

## Stado z kolekcji: Ned, Kuki, Glen, James, Racuch (W11-W15)
Pełny projekt (kolejność wejścia, mnożniki każdej świnki, ekonomia, niezmienniki testów, tryb pamięci, pytania do właściciela): `docs/NAMED_PIGS.md`. Skrót: oferta pary Kuki + Ned od razu (darmowa, razem lub osobno), oferty Jamesa (dzień 90), Glena (105) i Racucha (130) za 100 koniczynek; wiek liczony osobno dla każdej świnki, próg Legend losowany raz przy adopcji (Kuki 6,0-7,5 l., Ned 7,0-9,5 l.); tryb pamięci dla każdej; potrzeby wspólne; mnożniki z `pigs_named.json` uśredniane po aktywnych świnkach i obcięte do 0,5-1,5; limity ekonomii bez zmian. Wszystkie nowe zachowania Core są za flagami `Balance` (`PerPigAgeActive`, `PigModifiersActive`, `ArrivalsActive`), włączanymi dopiero w W15-01.
### W11 Fundamenty (5; bez zależności; głównie nowe pliki i dane) - pliki w `tasks/`
| ID | Cel | Zmieniaj | Akceptacja |
| --- | --- | --- | --- |
| W11-01 | Loader `pigs_named.json` (oferty, zakresy Legend; `Current`/`Load`/`LoadDefault`) | `Pigs/NamedPigCatalog.cs`, test | CORE |
| W11-02 | Pola życia w `PigProfile` (`NamedId`, `BornAtUtc`, `ArrivedAtUtc`, `LegendAtYears`, `Memorial`) i `PigLife` (wiek/etap per świnka) | `Pigs/PigProfile.cs`, `Pigs/PigLife.cs`, test | CORE |
| W11-03 | `PigModifiers`: osiem mnożników, średnia, obcięcie | `Pigs/PigModifiers.cs`, test | CORE |
| W11-04 | Flagi `Balance` (wszystkie wyłączone) | `Balance.cs`, test | CORE |
| W11-05 | Osiągnięcia `new_friend` (50), `full_house` (150) i `forever_family` (50, tryb pamięci) | `achievements.json`, test | CORE |
### W12 Logika Core (5; wymaga W11) - pliki piszę przed startem
| ID | Cel | Zmieniaj (główne) | Akceptacja |
| --- | --- | --- | --- |
| W12-01 | `OfferChecker`: czysty, idempotentny, zegar ofert (James, Glen, Racuch), wiele ofert po offline | `Pigs/OfferChecker.cs`, test | CORE |
| W12-02 | `Pet.ActiveModifiers`: średnia aktywnych świnek (flaga) | `Pet.PigModifiers.cs`, test | CORE |
| W12-03 | Wiek i etap aktywnej świnki w `Pet` (flaga `PerPigAgeActive`, próg Legend z profilu) | `Pet.cs`, `Pet.PigAge.cs`, test | CORE |
| W12-04 | `LegendRoll`: losowanie progu Legend z zakresu świnki (wstrzykiwany `Random`) | `Pigs/LegendRoll.cs`, test | CORE |
| W12-05 | Pola stanu ofert i adopcji (`OffersStartUtc`, adopted/offered, `Memorial`) w `GameState.Pigs` | `GameState.Pigs.cs`, test | CORE |
### W13 Integracja Core (5; wymaga W12)
| ID | Cel | Zmieniaj (główne) | Akceptacja |
| --- | --- | --- | --- |
| W13-01 | Mnożniki w `Brain`: activity, joy_weight, wheek_rate | `AI/Brain.cs`, test | CORE |
| W13-02 | Mnożnik appetite w zużyciu siana | `Pet.Hay.cs`, test | CORE |
| W13-03 | Adopcja z oferty w `Pet`: koszt, paczka, pamiętnik, licznik `pigs_arrived`, losowanie Legend, tryb pamięci (`SetMemorial`), zdarzenia `OfferUnlocked`/`PigAdopted` | `Pet.Adoption.cs`, `Pet.cs` (2 linie), `Events.cs`, test | CORE |
| W13-04 | Migracja zapisów i nowa gra z ofertą pary (korzysta z pól z W12-05) | `GameState.Pigs.cs`, test | CORE |
| W13-05 | `PigsFeature`: stan wiek/etap/mnożniki/oferty/tryb pamięci, `max_adopted` | `Features/PigsFeature.cs`, `pigs.json` | BUILD + CORE |
### W14 Pulpit i Home (8; wymaga W13)
| ID | Cel | Zmieniaj (główne) | Akceptacja |
| --- | --- | --- | --- |
| W14-01 | `bond_gain` i `minigame_score` w `Pet` | `Pet.cs`, test | CORE |
| W14-02 | Etap każdej świnki zamiast jednego globalnego; wypieczone arkusze `pigs/<id>/` (C#) | `Graphics/PigLook.cs`, `Xml.cs` | BUILD |
| W14-03 | Nowa oferta: toast; adopcja na pulpicie: nowy pet, `peek` | `BrainController.cs` | BUILD |
| W14-04 | Tempo bobków wg `poop_rate` | `PoopManager.cs` | BUILD |
| W14-05 | Płochliwość wg `startle` | `Behaviors/MouseFearBehavior.cs` | BUILD |
| W14-06 | My Pigs i adopcja: wiek, etap, cechy, oferty, "Adopt both", tryb pamięci | `features/pigs/feature.js`, `feature.css` | SMOKE |
| W14-07 | Mock stanu z ofertami i toast powitalny | `bridge.js`, `app.js` | SMOKE |
| W14-08 | Resolver arkuszy w Home: wypieczone `pigs/<id>/`, potem rasa + paleta | `lib/sprites.js` | SMOKE |
### W15 Domknięcie (5; wymaga W14) → funkcja włączona
| ID | Cel | Zmieniaj (główne) | Akceptacja |
| --- | --- | --- | --- |
| W15-01 | Włączenie flag w `GameSession.Open` | `GameSession.cs`, test | CORE |
| W15-02 | Oś czasu i niezmienniki ekonomii (Symulator + test + raport) | `tools/Cuy.Simulator/Program.cs`, `docs/economy-report.md`, test | CORE |
| W15-03 | Smoke My Pigs z pięcioma świnkami | `tools/qa/web-smoke.js` | SMOKE |
| W15-04 | `contracts.md` i kroki ręczne na Windowsie | `docs/contracts.md`, `TESTY_RECZNE.md` | git diff |
| W15-05 | `SelfTest`: `pigs_named.json` i arkusze wszystkich etapów | `SelfTest.cs` | BUILD |
Człowiek: test na Windowsie po W14 i po W15; decyzje z `docs/NAMED_PIGS.md` sekcja 7; włączenie pętli.

## Świat: dom, ogród, park, farma i targ (W16-W22)
Pełny projekt (zasady, mapa miejsc, edytor siatki, komfort, farma i rośliny, targ, ekonomia z tabelą wydatków i niezmiennikami, architektura, grafika S0-S5, ryzyka): `docs/WORLD.md`. Dane: `assets/data/places.json`, `world_items.json`, `farm.json`, `market.json`, `items_farm.json`; kontrola `node tools/qa/data-check.js`. Skrót: 5 miejsc (Dom z 3 pokojami, Ogród, Farma 24 grządek + 4 w sadzie, Park, Targ), 45 nowych przedmiotów do ustawiania na siatce (+ 20 dotychczasowych), 15 roślin z bezpiecznej listy, sprzedaż ograniczona modelem popytu i stropem 30 koniczynek dziennie, wydatki ok. 25 850 koniczynek (symulacja: regular kupuje Park po ok. 4 miesiącach, całość po ponad roku; `node tools/qa/economy-sim.js --check`), 2 zlecenia dziennie, komfort tylko spowalnia spadek humoru (max 15%). Fale po W15, nowe zachowania za flagami `PlacesActive`, `FarmActive`, `MarketActive`, `WorldDecorActive` (włączane w W22-01). Pliki zadań piszę tuż przed startem każdej fali.
| Fala | Zadań | Co wdraża | Wymaga |
| --- | --- | --- | --- |
| **W16** Fundamenty (8) | loadery `farm`/`market`/`places`/`world_items`, `items_farm.json` w katalogu, `GameState.World`, flagi, osiągnięcia świata | tylko nowe pliki i dane | W15 |
| **W17** Logika Core (8) | `RoomLayout`, `Comfort`, `FarmEngine`, `FarmExpansion`, `MarketPricing`, `MarketStock`, `PlaceUnlock`, `LegacyDecorMigration` | czyste funkcje z testami | W16 |
| **W18** Integracja w `Pet` (7) | miejsca, pokoje, farma, targ, spacer + różnorodność diety, pamiętnik, wersja zapisu i kącik pamięci | rozgrywka świata w Core | W17 |
| **W19** Funkcje C# (6) | `PlacesFeature`, `RoomsFeature`, `FarmFeature`, `MarketFeature`, kontrakty, walidacja wiadomości | most Core - Home | W18 |
| **W20** Home JS (8) | pasek miejsc, edytor siatki, ogród i park, farma, targ, zlecenia, mock | to, co widzi i klika gracz | W19 |
| **W21** Pulpit i dźwięk (5) | powiadomienie o zbiorach, ustawienia, dźwięki, My Pigs (kącik pamięci), limit wydajności | dopracowanie | W20 |
| **W22** Domknięcie (6) | flagi włączone, symulacja 60 dni z niezmiennikami, smoke czterech ekranów, testy ręczne, `SelfTest`, rozmiar zapisu | funkcja włączona | W21 |
Grafika (Claude Code, poza Julesem): S0 podłoże i tła, S1 rośliny, S2 meble domu, S3 ogród i farma, S4 park, S5 targ i audyt (`docs/WORLD.md` pkt 8). Zapasowe glify pozwalają fali W20 działać przed gotową grafiką. Człowiek: test na Windowsie po W20 i W22, decyzje z `docs/WORLD.md` pkt 10.

## Pokoje świnek i dom (W23-W30)
Projekt: `docs/PIG_ROOMS.md` (własny pokój każdej świnki z innym wyglądem i pełną customizacją, komfort per świnka, tryb pamięci, wspólna sypialnia, wędrowanie albo przywiązanie do pokoju z płaskim planem domku, wybieg w ogrodzie z furtką, rekwizyty z pulpitu przyczepione do domku, sklep ze wszystkim i ekonomia bez odsprzedaży). Dane: `assets/data/pig_rooms.json`, `home_economy.json`, `world_items.json` (55 przedmiotów); kontrola `node tools/qa/data-check.js`. Widok 3D odłożony. Brief dla designera: `docs/DESIGNER_BRIEF.md`.
| Fala | Zadań | Co wdraża | Wymaga |
| --- | --- | --- | --- |
| **W23** (8) | `PigRoomConfig`, pola stanu, `PigComfort`, `PigRoomOps`, poziomy pokoi, flagi i osiągnięcia, `HomeEconomyConfig`, symulator | fundamenty Core | W22 |
| **W24** (6) | pokój przy adopcji, komfort w spadku humoru, kolory (płatne), nazwy, magazyn i przenoszenie, pokój pamięci, migracja zapisów, pamiętnik | Pet | W23 |
| **W25** (7) | `RoomsFeature`, kontrakty, walidacja, zakładki pokoi, panel dopasowania, link w Moje świnki, mock | most i Home | W24 |
| **W26** (9) | wspólna sypialnia (Core, Pet, komfort, funkcja, UI, mock), włączenie flag, smoke i testy ręczne | sypialnia | W25 |
| **W27** (8) | stan i harmonogram wędrowania, tryby, funkcja, plan domku, świnki w pokojach | wędrowanie | W26 |
| **W28** (9) | wybieg (sprawdzenie ogrodzenia, zasady, Pet, funkcja, UI, mock), audyt rekwizytów | wybieg | W27 |
| **W29** (9) | rekwizyty z pulpitu zapisane i przyczepione, wrzucanie do pokoi, nakładka na pulpicie, pasek | rekwizyty | W28 |
| **W30** (9) | sklep domu, fasada zakupów, UI sklepu, pełny symulator, kontrola danych, smoke, włączenie flag | domknięcie | W29 |
Razem **141 zadań w 20 falach Julesa** (W11-W30), z czego W11 w `tasks/`, reszta w `docs/prompts/`.

## Podpięcie grafiki w grze (fala G, po W14 i W20)
Grafika jest gotowa w `assets/` (kontrakt plików: `docs/KONTRAKT_ASSETOW.md`, spis: `docs/INWENTARZ_GRAFIKI.md`). Gra używa jej dopiero po tych zadaniach; do tego czasu rysuje glify zapasowe. Zadania wchodzą do istniejących fal (te same pliki `Zmieniaj`), osobnych plików w `tasks/` nie ma, bo pisze je człowiek lub Claude tuż przed startem fali (zasada z W16-W22).

| ID | Cel | Zmieniaj (główne) | Fala | Akceptacja |
| --- | --- | --- | --- | --- |
| G1 | Portrety 128 px na ekranie Moje świnki i w ofercie adopcji (`portraits/<id>.png`, glif zapasowy gdy brak) | `features/pigs/feature.js`, `feature.css` | w W14-06 | SMOKE |
| G2 | Odtwarzanie obrotu w Home: `turn_smooth` przy zmianie kierunku, `idle_34` jako poza ciekawości (T5); na pulpicie klatki 0-3 wiersza 23 | `canvas-pig.js`, `lib/sprites.js`, `Graphics/*` | po W14-08 | SMOKE + BUILD |
| G3 | Wczytanie `assets/world/atlas.json`, `tiles.json`, `farm/farm.json`: jeden loader obrazów z cache i glifem zapasowym (reguła z W20-02) | nowy `lib/world-assets.js` | przed W20-02 | SMOKE |
| G4 | Rysowanie przedmiotów w siatce pokoju, ogrodu i parku z `atlas.json` (kotwica dół-środek, warstwy ground/floor/wall); tapeta i podłoga z kafelków `wall_*`/`floor_*` | `features/rooms/feature.js`, `features/garden/feature.js` | w W20-02, W20-04 | SMOKE |
| G5 | Tła ogrodu i parku wg pory dnia (rano, dzień, wieczór, noc), woda z 4 klatek, płot łączony maską | `features/garden/feature.js` | w W20-04 | SMOKE |
| G6 | Farma: grządki (`bed_empty`/`bed_wet`), klatki wzrostu upraw i drzewek, animacja podlewania i błysk wielkiego zbioru, tło farmy | `features/farm/feature.js` | w W20-05 | SMOKE |
| G7 | Targ: tło, stragany (podstawowy i duży), tablica zleceń, tabliczki promocji | `features/market/feature.js`, `orders.js` | w W20-06, W20-07 | SMOKE |
| G8 | Ikony 120-160: klasy `.icon-*` (dodane), użycie w pasku miejsc, edytorze, farmie, ofertach i trybie pamięci | `app.js`, `features/*` | w W20-01..W20-07 | SMOKE |
| G9 | Wypieczone arkusze `pigs/<id>/` w C# (pulpit) i `pigs.json` (T9) | `Graphics/PigLook.cs`, `Xml.cs` | W14-02 (jest w planie) | BUILD |
| G10 | Kontrola plików: skrypt `tools/qa/check-assets.js` (każdy id z `world_items.json`, `farm.json`, `pigs_named.json` ma plik; każda klasa `icon-*` ma wpis w `icons.json`) plus krok w `SelfTest` | `tools/qa/check-assets.js`, `SelfTest.cs` | W16 lub W22-05 | SMOKE + BUILD |
Poza kodem: rysunek 3 starych animacji z `Resources/animations.xml` zostaje jak jest; po wdrożeniu G1-G8 człowiek ogląda wszystkie ekrany w grze, a Claude poprawia grafikę na podstawie zrzutów (nowa mała fala S6).

## Mapa starych zadań
F2-02→PR #32 (W1-01,W1-02,W2-01 stare) + W1-09,W1-10,W2-01 · F2-07→zrobione · F3-01→W1-03,W1-04,W2-02,W3-01,W7-06 · F3-03→W4-01..W4-04,W7-07,W7-08 · F4-01→W4-07,W5-01,W5-02 · F4-02→W4-06,W6-01,W6-02 ·
F4-03→W1-05,W2-03,W3-03 · F4-04→W3-04,W3-05,W4-05 · F4-05→W1-06,W2-06,W2-08,W5-04 · F4-06→W1-07,W2-04,W5-03,W6-02,W6-03 · F4-07→W3-08,W4-08 · F4-08→W2-09,W3-07 ·
F4-09→W1-08,W2-05,W3-02 · F4-10→W7-03..W7-05 · F5-02→W4-10,W5-08 · F5-03→W4-09 · F5-04→W7-01 · F6-02→W5-07 · F6-03→W4-11,W5-05,W5-06 · F6-05→W4-12,W5-10,W6-04 ·
F7-01→W7-06 · F7-02→W6-07 · F7-03→W7-07..W7-09 · F8-01→W4-13,W5-09,W6-05 · F8-03→W6-06,W7-02 · F8-04→W1-11,W2-07 · F5-01, F6-00/01/04/06..09, F8-02→W9.

## Ustawienia Julesa i GitHuba (raz na repo)
1. Skrypt środowiska: `bash setup.sh` → Run and Snapshot. 2. CI jest (`ci.yml`): testy + build + smoke; bez niego nie działa CI Fixer. 3. Ochrona `main`: merge tylko przez PR z zielonym CI.
4. Pamięć repo (Knowledge → memory): włącz. 5. MCP: Context7 (aktualne docs bibliotek), Stitch (makiety). 6. Reactive Mode, jeśli Jules ma reagować tylko na `@jules`.
7. Powiadomienia przeglądarki i Commit Authoring „Co-authored” wg uznania. 8. Scheduled Tasks (Performance, Design, Security; dziennie na tym repo) i Suggested Tasks
(zostawiaj `// TODO:` z konkretnym opisem). 9. Sekrety i klucze tylko w ustawieniach Julesa, nigdy w repo (aktualnie nie ma żadnych).
10. Start fal przez GitHub: PR dodający pliki do `jules/queue/*.md` (kopie `tasks/Wn-*.md`) uruchamia workflow `jules-dispatch.yml` po scaleniu do `main` (jedna sesja Julesa na plik, REST API v1alpha, sekret `JULES_API_KEY`). Ponowny start pliku: `workflow_dispatch` z wejściem `file`. Alternatywa: CLI `tools/jules-wave.sh Wn`.
