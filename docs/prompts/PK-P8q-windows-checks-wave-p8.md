# PK-P8q: Windows checks after wave P8 (package, runs last)
Zmieniaj: docs/qa/UX_WAVE_CHECKS.md, docs/opt/log/PK-P8q.md
Wymagane: docs/qa/UX_WAVE_CHECKS.md
Weryfikacja: node --check web/home/features/calendar/feature.js && node --check tools/qa/ux-p8-calendar.js && node tools/qa/ux-p8-calendar.js && dotnet test tests/Cuy.Core.Tests/Cuy.Core.Tests.csproj -c Release --filter "FullyQualifiedName~Care" && dotnet build src/Cuy/Cuy.csproj -c Release -p:EnableWindowsTargeting=true
Pytania: nie zadawaj pytań i nie czekaj na odpowiedź. Jeśli czegoś brakuje lub coś jest niejasne, sam wybierz najrozsądniejsze rozwiązanie zgodne z AGENTS.md, zapisz decyzję w logu i dokończ do końca.
Limity (twarde): każdą komendę uruchom raz, nie ponawiaj nieudanej. Nie naprawiaj kodu produktowego. Wynik porównuj z docs/opt/log/baseline-smoke.txt (jeśli istnieje): błąd obecny w baseline to „stary”. Maks. 20 wywołań narzędzi.
Nie ruszaj: AGENTS.md, docs/archive/, tasks/*, every file not listed in Zmieniaj, all product code (src/, web/home/, assets/)
Goal: Same as PK-P4q for wave P8: owner sheet plus a regression run. This package does NOT fix product code: a failing check is written in the log and makes the verification line fail.
Depends on: PK-P8a and PK-P8b merged.

## Steps
1. Append a section "Wave P8" to `docs/qa/UX_WAVE_CHECKS.md` in the same table format: `ux-p8-calendar`, Core tests `Care*`, and the manual bullets of "Do sprawdzenia po P8" from `docs/PLAN_POPRAWEK_UX.md` (Settings: nothing on until switched on, day and time; Weight: entry adds a row and closes the reminder; tabs look like the game).
2. Run the Weryfikacja line. Put the result of each part in the log (PASS/FAIL and the first failing lines). Add a line "Regression: `node tools/qa/ux-all.js` PASS/FAIL" (run it once).
3. Extra, informational: `node tools/qa/a11y-check.js`.

Prohibited: changing product code or existing test assertions, new dependencies.
Log: write `docs/opt/log/PK-P8q.md` (max 10 lines). Do not run git.
