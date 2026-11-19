# PK-B2: Baseline repair: Core test failures and SelfTest from Q1
Zmieniaj: assets/data/world_items.json src/Cuy.Core/Input/Validation src/Cuy.Core/World tests/Cuy.Core.Tests src/Cuy/dotNet/SelfTest.cs web/home/features/index.json docs/opt/log/PK-B2.md
Weryfikacja: powershell -ExecutionPolicy Bypass -File tools/build.ps1 -Config Release
Weryfikacja: node --check web/home/lib/pig-behavior.js && node --check tools/qa/home-behavior-check.js && node --check tools/qa/ux-p110-behavior.js && node tools/qa/home-behavior-check.js && node tools/qa/ux-p110-behavior.js
Limity (twarde): maks. 80 wywołań narzędzi. Linię Weryfikacja uruchom maks. 2 razy. Czytaj tylko pliki z Zmieniaj/Wymagane, pliki wskazane w sekcji "Czytaj" oraz zakresy linii znalezione przez grep. Nie diagnozuj niczego spoza Zmieniaj. Gdy test pada na czymś, czego Twoja zmiana nie dotyka: zapisz nazwę testu i 5 linii błędu w logu, status BLOCKED, zakończ. Po błędzie we własnym kodzie wolno jedna poprawka i jeden ponowny bieg, potem zakończ jako BLOCKED. Nie uruchamiaj web-smoke.js.
Nie ruszaj: AGENTS.md, docs/archive/, tasks/*, every file not listed in Zmieniaj
Goal: Close the Q1 blockers on the C# side: 6 failing Core tests, `Cuy.exe --selftest` failures and the features folder mismatch, so the wave 3 gate (Q3) can be green.

Depends on: F2-6. Uruchamia się RAZEM z PK-B1 (pliki rozłączne: B1 to tylko JS i testy web).

## Kontekst
- Q1 (`docs/opt/log/PK-Q1.md`): `build.ps1` Build OK, `Core.Tests` 1235 PASS / 6 FAIL / 1 SKIP; `Cuy.exe --selftest` padał na (a) `features folder mismatch: missingDirs garden, rooms` (PK-APP2), (b) `world item icons: placeable willow_tunnel has no icon` (PK-R30).
- 6 czerwonych testów: `WorldItemCatalogTests.RealCatalog_LoadsAllItems_CountAtLeast50` (R30), `WorldMessageTests.OutOfRangeInt_ReturnsInvalid(room_place,x,201)` (R25), 4x `PigPinMessagesTests` (R31).
- Po Q1 weszły commity 1bdc2bf (zmiany `world_items.json`, `ui.json`, `features/index.json`, SelfTest, `OutdoorSeed`) i 4706bbf: część mogła zostać naprawiona. NAJPIERW uruchom build i testy i napraw tylko to, co nadal czerwone.
- Zasady: liczby w `assets/data/*.json`, test nie jest zmieniany, żeby przechodził, jeśli kod robi złą rzecz (zmiana asercji tylko z uzasadnieniem w logu: STARE vs WADA), walidacja per funkcja w `src/Cuy.Core/Input/Validation/<Feature>Messages.cs`.
- Środowisko cloud nie ma `dotnet`: ta paczka jest do Windowsa/Antigravity.

## Steps
1. `powershell -ExecutionPolicy Bypass -File tools/build.ps1 -Config Release` i zanotuj, co pada. Potem `Cuy.exe --selftest` (Release) i zanotuj błędy.
2. Napraw: brak ikony `willow_tunnel` (dane `world_items.json` + wpis w `icons`/atlasie, bez nowych plików graficznych: użyj istniejącej ikony zapasowej wg `docs/KONTRAKT_ASSETOW.md`), próg liczby przedmiotów (stary test zakłada >= 50, sprawdź prawdziwą liczbę), granica `x` w `room_place` (201 poza zakresem: kod i kontrakt `docs/contracts/rooms.md` muszą się zgadzać), 4 testy `PigPinMessagesTests`.
3. Zgodność `web/home/features/index.json` z folderami `features/*` (SelfTest).
4. Uruchom Weryfikację do zera FAIL; SKIP z `DEFECT` zostaw i wypisz.

Prohibited: running git, new dependencies, deleting tests, touching web JS (to robi PK-B1), extra refactors.

Log: write `docs/opt/log/PK-B2.md` (max 15 linii: co było nadal czerwone, STARE/WADA, poprawki).
