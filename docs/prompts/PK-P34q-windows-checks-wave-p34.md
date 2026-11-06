# PK-P34q: Windows checks after wave P34 (pig walking) (package, runs last)
Zmieniaj: docs/qa/UX_WAVE_CHECKS.md, docs/opt/log/PK-P34q.md
Wymagane: docs/qa/UX_WAVE_CHECKS.md
Weryfikacja: powershell -ExecutionPolicy Bypass -File tools/build.ps1 -Config Release && node tools/qa/ux-all.js && node tools/qa/check-assets.js && node tools/qa/check-icons.js
Pytania: nie zadawaj pytań i nie czekaj na odpowiedź. Jeśli czegoś brakuje lub coś jest niejasne, sam wybierz najrozsądniejsze rozwiązanie zgodne z AGENTS.md, zapisz decyzję w logu i dokończ do końca.
Limity (twarde): każdą komendę uruchom raz, nie ponawiaj nieudanej. Nie naprawiaj kodu produktowego. Wynik porównuj z docs/opt/log/baseline-smoke.txt (jeśli istnieje): błąd obecny w baseline to „stary”. Maks. 20 wywołań narzędzi.
Nie ruszaj: AGENTS.md, docs/archive/, tasks/*, every file not listed in Zmieniaj, all product code (src/, web/home/, assets/, tools/art/)
Goal: Run the Windows checks of wave P34 and record the result. This package does NOT fix product code: a failing check is written in the log and makes the line fail.
Depends on: all other packages of wave P34 merged.

## Steps
1. Append a section "Wave P34" to `docs/qa/UX_WAVE_CHECKS.md` in the same table format as the earlier sections: one row per test/script of this wave (the verification line below, plus the new `ux-p34-*`/Core tests named in the logs `docs/opt/log/PK-P34*.md`) and the manual bullets of "Do sprawdzenia po P34" from `docs/PLAN_POPRAWEK_UX.md`.
2. Run the Weryfikacja line. Log PASS/FAIL per part with the first failing lines (max 10 lines in the log). If `tools/build.ps1` reports "vswhere not found" write that exact fact and run `dotnet test tests/Cuy.Core.Tests/Cuy.Core.Tests.csproj -c Release` once instead.
3. Informational, once each: `node tools/qa/a11y-check.js`. List any screenshots written to `docs/qa/shots/` in this wave.
Prohibited: changing product code or existing test assertions, new dependencies.
Log: write `docs/opt/log/PK-P34q.md` (max 10 lines). Do not run git.
