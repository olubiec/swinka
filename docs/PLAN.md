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
13. Wersja 1.1 = po fali W4 (kalendarz, zabawki, pamiętnik, więź, paśnik w Core, paczka); wersja 2.0 = po fali W7.
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

## Status (27.10.2026, wieczór)
- Zrobione i scalone: fale 0–1 starego planu, F2-01, F2-03..F2-11 (w tym **F2-07 zabawki**), F3-02, F3-04, F3-05, **PR #32** (W1-01 karta przypomnienia + W1-02 stan kalendarza + W2-01 tick; scalone, ale z lukami).
- Luki po PR #32: dane opieki (`care.json`) nie są nigdzie wczytywane, wiadomości z JS nie są walidowane, brak mapowania snake_case. Naprawiają W1-09, W1-10 i przepisane W2-01 (stare pliki w `tasks/done/`).
- Nadal nie istnieje: tabele więzi i siana jako ładowane dane (W1-06/07), pamiętnik, host zachowań, ekran pamiętnika, filtr etapów, dźwięk w ustawieniach.
- Reguła danych (nowa w AGENTS.md): każda tabela danych ma `Current`/`Load`/`LoadDefault` jak `EconomyConfig`; testy używają wstrzykiwanych tabel `Pet`, nie statyków. Nowe zachowania Core są za flagą w `Balance` (`HayRackActive`, `DiaryActive`), włączaną w `GameSession.Open`.
- Research R1–R20 wdrożony (`RESEARCH.md`, `DECYZJE.md`); rzeczy do sprawdzenia na PC: `TESTY_RECZNE.md`. Windows: nie zbudowano `tools/build.ps1` po falach 2–3 starego planu: zrób to po „Integracji W2”.

## Fale (A1)
**Stan 28.10.2026 (wg `gh api pulls`):** W1 zamknięte (PR #3–#49). W2 zrobione poza **W2-06 (PR #61, otwarty, poza pętlą)**. W3: 9 zadań w `tasks/` (format pętli) – aktywna fala pętli: W3-01, 02, 03, 04, 05, 06, 07, 08, 11. **W3-09 i W3-10 odłożone** (`tasks/plan/`): konflikt zakresów z W3 (Pet.cs, SelfTest.cs); startują jako W4 po integracji W3, po przepisaniu na format pętli. W3-11 bez kroku `ci.yml` (pętla nie rusza `.github/workflows/`; krok dodaje człowiek). Prompty integracyjne z `docs/wave-prompts.md` są nieużywane – integrację robi pętla.
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

### W4 (13; wymaga W3) → po integracji **wersja 1.1**
| ID | Cel | Zmieniaj | Akceptacja |
| --- | --- | --- | --- |
| W4-01 | Self-test nowych danych (muzyka, kolorowanie, pamiętnik, więź, siano) | `SelfTest.cs` | BUILD |
| W4-02 | Paczka: limit rozmiaru i zakazane ścieżki | `tools/package.ps1`, `tools/package/README.txt` | skrypt się parsuje |
| W4-03 | Noty licencyjne: muzyka, Twemoji, ZzFX, NAudio | `THIRD_PARTY_NOTICES.md`, `NoticesTests.cs` | CORE |
| W4-04 | Komunikat o braku WebView2 i obsługa wyjątku | `HomeWindow.cs` | BUILD |
| W4-05 | Album: sylwetki „???”, daty, licznik | `app.js`, `style.css` | SMOKE |
| W4-06 | Urodziny w Core: nagroda raz, tort, wpis, limit 3 | `Pet.cs`, `Pet.Birthday.cs`, testy | CORE |
| W4-07 | `SpriteSheetLoader`: arkusze etapów z `assets/sprites` | `SpriteSheetLoader.cs` (nowy) | BUILD |
| W4-08 | Ustawienia dźwięku w Domku + ZzFX | `features/settings/*`, `sound.js`, `lib/zzfx.min.js`, `bridge.js` | SMOKE |
| W4-09 | Gra Veggie Memory [WARIANTY] | `minigames/veggie-memory.js` | SMOKE + JS |
| W4-10 | Generator labiryntu + test w Node | `minigames/hay-maze-logic.js`, `tools/qa/maze-test.js` | `maze-test.js` |
| W4-11 | `FullscreenDetector` + `Pet.SetAway` (Core) | `Platform/FullscreenDetector.cs`, `Pet.Away.cs`, `AwayTests.cs` | CORE + BUILD |
| W4-12 | Sztuczki w Core: `TryPerformTrick` | `Pet.Tricks.cs`, `tricks.json`, testy | CORE |
| W4-13 | Osiągnięcia w Core: katalog, ewaluator, `AchievementEarned` | `Achievements/*`, `GameState.Achievements.cs`, testy | CORE |
**Integracja W4**, test na Windowsie, wydanie **1.1** (ZIP z `tools/package.ps1`).
### W5 (10; wymaga W4)
| ID | Cel | Zmieniaj | Akceptacja |
| --- | --- | --- | --- |
| W5-01 | Wygląd świnki zależny od etapu, hot-swap bez restartu | `Xml.cs`, `StartUp.cs`, `BrainController.cs` | BUILD |
| W5-02 | Self-test: arkusz z loadera = osadzony | `SelfTest.cs` | BUILD |
| W5-03 | `HomeWindow`: stany `bond`, `hayRack`, `minigames`, `tricks`, `achievements`, wiadomości ustawień i resetu | `HomeWindow.cs` | BUILD |
| W5-04 | Pasek więzi pod imieniem | `app.js`, `style.css`, `bridge.js` | SMOKE |
| W5-05 | Chowanie przy pełnym ekranie (zachowanie + pomocnicze Hide/Show) | `Behaviors/FullscreenHideBehavior.cs`, `PoopManager.cs`, `FoodManager.cs` | BUILD |
| W5-06 | Naprawa `SoundManager.IsFullScreenOrBusy()` | `SoundManager.cs` | BUILD |
| W5-07 | Strach przed machaną myszką + sztuczka podejścia do kursora | `Behaviors/MouseFearBehavior.cs` | BUILD |
| W5-08 | Gra Hay Maze: rysowanie i sterowanie [WARIANTY] | `minigames/hay-maze.js` | SMOKE + JS |
| W5-09 | Ekran Osiągnięcia | `features/achievements/*` | SMOKE |
| W5-10 | Ekran Sztuczki | `features/tricks/*` | SMOKE |
**Integracja W5**.
### W6 (7; wymaga W5)
| ID | Cel | Zmieniaj | Akceptacja |
| --- | --- | --- | --- |
| W6-01 | Urodziny na pulpicie: party, bąbelek, dźwięk | `BrainController.cs` | BUILD |
| W6-02 | Karmienie: dosypanie siana, tort uruchamia `party` | `HomeWindow.cs` | BUILD + CORE |
| W6-03 | Wskaźnik siana przy przycisku karmienia | `app.js`, `style.css`, `bridge.js` | SMOKE |
| W6-04 | Sztuczki na pulpicie: wiadomość `trick`, menu Tricks | `Features/TricksFeature.cs`, `ContextMenus.cs` | BUILD |
| W6-05 | Osiągnięcia na pulpicie: dymek przy zdobyciu | `Features/AchievementsFeature.cs` | BUILD |
| W6-06 | Wybór monitora dla świnki | `StartUp.cs`, `LocalData.cs` | BUILD |
| W6-07 | Strojenie ekonomii, więzi i tempa: symulacja 60 dni | `tools/Cuy.Simulator/*`, `docs/economy-report.md`, dane | symulator + CORE |
**Integracja W6**, test na Windowsie (strach, fullscreen: `TESTY_RECZNE.md`).
### W7 (10; wymaga W6) → po integracji **wersja 2.0**
| ID | Cel | Zmieniaj | Akceptacja |
| --- | --- | --- | --- |
| W7-01 | Hub gier: limit dzienny, rekordy, ekran wyniku | `minigames-api.js`, `app.js`, `style.css`, `bridge.js`, test Core | SMOKE + CORE |
| W7-02 | Ustawienia: „Nowa świnka” z kopią zapisu i wybór monitora | `features/settings/*`, `SaveSystem.cs` (helper), testy | SMOKE + CORE |
| W7-03 | Audyt: opcje deweloperskie tylko w Debug | `ContextMenus.cs`, `DebugOverlay.cs`, `FormDebug.cs`, `Diagnostics.cs`, `Program.cs` | BUILD (Debug i Release) |
| W7-04 | Ustawienia WebView2 dla Release | `HomeWindow.cs` | BUILD |
| W7-05 | Self-test: brak pozycji deweloperskich w menu Release; smoke: brak `#btnDevTest` | `SelfTest.cs`, `web-smoke.js` | BUILD + SMOKE |
| W7-06 | Spięcie: lista funkcji i smoke test dla diary, tricks, achievements | `features/index.json`, `web-smoke.js` | SMOKE |
| W7-07 | Paczka końcowa: kontrola rozmiaru, README dla gracza | `tools/package.ps1`, `tools/package/README.txt` | skrypt się parsuje |
| W7-08 | Dokumentacja końcowa i licencje | `README.md`, `ARCHITECTURE.md`, `THIRD_PARTY_NOTICES.md`, `assets/LICENSES/*` | `git diff` tylko te pliki |
| W7-09 | Lista 40 testów ręcznych | `TESTING.md` | `git diff` tylko ten plik |
| W7-10 | Kontrakty zgodne z kodem | `docs/contracts.md` | `git diff` tylko ten plik |
**Integracja W7**, końcowy test na Windowsie, wydanie **2.0**. Velopack (opcjonalnie) tylko po Twoim „yes, Velopack”.
### W8 (opcjonalna, po 2.0; Claude rozpisuje pliki dopiero po Twojej decyzji)
Hay Hop [WARIANTY] (logika w czystym module + rysowanie), towarzysz (Core, pulpit, Domek), pogoda z Open-Meteo (jedyne użycie internetu: wymaga Twojej zgody),
taniec do muzyki (NAudio 2.2.1, sonda audio: tylko kompilacja i testy ręczne), wygląd etapów w Domku. Pełne stare prompty: `docs/archive/jules-F-tasks/` (F5-01, F6-00, F6-01, F6-04, F6-06..F6-09, F8-02).

## Mapa starych zadań
F2-02→PR #32 (W1-01,W1-02,W2-01 stare) + W1-09,W1-10,W2-01 · F2-07→zrobione · F3-01→W1-03,W1-04,W2-02,W3-01,W7-06 · F3-03→W4-01..W4-04,W7-07,W7-08 · F4-01→W4-07,W5-01,W5-02 · F4-02→W4-06,W6-01,W6-02 ·
F4-03→W1-05,W2-03,W3-03 · F4-04→W3-04,W3-05,W4-05 · F4-05→W1-06,W2-06,W2-08,W5-04 · F4-06→W1-07,W2-04,W5-03,W6-02,W6-03 · F4-07→W3-08,W4-08 · F4-08→W2-09,W3-07 ·
F4-09→W1-08,W2-05,W3-02 · F4-10→W7-03..W7-05 · F5-02→W4-10,W5-08 · F5-03→W4-09 · F5-04→W7-01 · F6-02→W5-07 · F6-03→W4-11,W5-05,W5-06 · F6-05→W4-12,W5-10,W6-04 ·
F7-01→W7-06 · F7-02→W6-07 · F7-03→W7-07..W7-09 · F8-01→W4-13,W5-09,W6-05 · F8-03→W6-06,W7-02 · F8-04→W1-11,W2-07 · F5-01, F6-00/01/04/06..09, F8-02→W8.

## Ustawienia Julesa i GitHuba (raz na repo)
1. Skrypt środowiska: `bash setup.sh` → Run and Snapshot. 2. CI jest (`ci.yml`): testy + build + smoke; bez niego nie działa CI Fixer. 3. Ochrona `main`: merge tylko przez PR z zielonym CI.
4. Pamięć repo (Knowledge → memory): włącz. 5. MCP: Context7 (aktualne docs bibliotek), Stitch (makiety). 6. Reactive Mode, jeśli Jules ma reagować tylko na `@jules`.
7. Powiadomienia przeglądarki i Commit Authoring „Co-authored” wg uznania. 8. Scheduled Tasks (Performance, Design, Security; dziennie na tym repo) i Suggested Tasks
(zostawiaj `// TODO:` z konkretnym opisem). 9. Sekrety i klucze tylko w ustawieniach Julesa, nigdy w repo (aktualnie nie ma żadnych).
10. Start fal przez GitHub: PR dodający pliki do `jules/queue/*.md` (kopie `tasks/Wn-*.md`) uruchamia workflow `jules-dispatch.yml` po scaleniu do `main` (jedna sesja Julesa na plik, REST API v1alpha, sekret `JULES_API_KEY`). Ponowny start pliku: `workflow_dispatch` z wejściem `file`. Alternatywa: CLI `tools/jules-wave.sh Wn`.
