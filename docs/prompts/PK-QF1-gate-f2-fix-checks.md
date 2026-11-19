# PK-QF1: Stage gate (F2-FIX): Release & Debug build, Cuy.exe --selftest, Core tests, and all UX tests
Zmieniaj: docs/opt/log/PK-QF1.md
Weryfikacja: powershell -ExecutionPolicy Bypass -File tools/build.ps1 -Config Release && powershell -ExecutionPolicy Bypass -File tools/build.ps1 -Config Debug && dotnet test tests/Cuy.Core.Tests/Cuy.Core.Tests.csproj -c Release && node tools/qa/ux-p71-lag-and-drag-fix.js && node tools/qa/ux-p72-layout-bar-bgs.js && node tools/qa/ux-p73-drag-collision-lamps.js && node tools/qa/ux-p74-market-farm-ux.js && node tools/qa/web-smoke.js && node tools/qa/check-assets.js && node tools/qa/check-icons.js && node tools/qa/plan-audit.js && powershell -ExecutionPolicy Bypass -File tools/qa/run-exe-smoke.ps1 -Seconds 25
Pytania: nie zadawaj pytań i nie czekaj na odpowiedź. Jeśli czegoś brakuje lub coś jest niejasne, sam wybierz najrozsądniejsze rozwiązanie zgodne z AGENTS.md, zapisz decyzję w logu i dokończ do końca.
Limity (twarde): maks. 25 wywołań narzędzi. Linię Weryfikacja uruchom maks. 2 razy. Czytaj tylko pliki z Zmieniaj. Nie uruchamiaj git.
Nie ruszaj: AGENTS.md, docs/archive/, tasks/*, every file not listed in Zmieniaj
Goal: Build both `Release` and `Debug` desktop binaries (`tools/build.ps1`), run `Cuy.exe --selftest` (`run-exe-smoke.ps1`), run Core xUnit tests, run the 4 new `ux-p71..74` test suites plus `ux-all.js` with `STRICT=1`, and record the results in `docs/opt/log/PK-QF1.md`.

Depends on: wszystkie paczki kroków F2F-1..F2F-5 scalone w `main`. Biegnie w kroku F2F-6 równolegle z `PK-QF2`.

Produces (names other packages rely on): `docs/opt/log/PK-QF1.md`, zaktualizowane `src/Cuy/bin/Release/Cuy.exe` i `src/Cuy/bin/Debug/Cuy.exe`.

## Czytaj tylko (zakaz czytania innych plików)
- `docs/opt/log/PK-TF1.md`, `PK-TF2.md`, `PK-TF3.md`, `PK-TF4.md`

## Nie czytaj
Wszystkich pozostałych plików w repozytorium.

## Steps
1. Uruchom komendy z linii `Weryfikacja`.
2. Uruchom dodatkowo `set STRICT=1 && node tools/qa/ux-p71-lag-and-drag-fix.js && node tools/qa/ux-p72-layout-bar-bgs.js && node tools/qa/ux-p73-drag-collision-lamps.js && node tools/qa/ux-p74-market-farm-ux.js` i upewnij się, że jest `0` DEFECT.
3. Zapisz zwięzłą tabelę wyników (PASS/FAIL, liczba testów, czas) w `docs/opt/log/PK-QF1.md` (max 10 linii).

Prohibited: changing or deleting existing test assertions, new dependencies, touching files outside "Zmieniaj", running git.
Log: write `docs/opt/log/PK-QF1.md`. Do not run git.
