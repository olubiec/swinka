# PK-P3q: Windows checks after wave P3 (package, wave P3, runs last)
Zmieniaj: docs/qa/UX_WAVE_CHECKS.md, docs/opt/log/PK-P3q.md
Wymagane: docs/qa/UX_WAVE_CHECKS.md
Weryfikacja: powershell -ExecutionPolicy Bypass -File tools/build.ps1 -Config Release && node tools/qa/ux-all.js && node tools/qa/web-smoke.js && node tools/qa/check-assets.js && node tools/qa/check-icons.js && powershell -ExecutionPolicy Bypass -File tools/qa/run-exe-smoke.ps1 -Seconds 25
Pytania: nie zadawaj pytań i nie czekaj na odpowiedź. Jeśli czegoś brakuje lub coś jest niejasne, sam wybierz najrozsądniejsze rozwiązanie zgodne z AGENTS.md, zapisz decyzję w logu i dokończ do końca.
Limity (twarde): każdą komendę uruchom raz, nie ponawiaj nieudanej. Nie naprawiaj kodu produktowego. Wynik porównuj z docs/opt/log/baseline-smoke.txt (jeśli istnieje): błąd obecny w baseline to „stary”. Maks. 20 wywołań narzędzi.
Nie ruszaj: AGENTS.md, docs/archive/, tasks/*, every file not listed in Zmieniaj, all product code (src/, web/home/, assets/)
Goal: Same as PK-P2q for wave P3, plus a regression run of earlier waves (`ux-all.js` without an argument). This package does NOT fix product code: a failing check is written in the log and makes the verification line fail.
Depends on: all packages of wave P3 merged.

## Steps
1. Append a section "Wave P3" to `docs/qa/UX_WAVE_CHECKS.md` in the same table format: `ux-p3-places`, `ux-p3-icons`, check-assets, check-icons, and the manual bullets of "Do sprawdzenia po P3" from `docs/PLAN_POPRAWEK_UX.md`.
2. Run the Weryfikacja line. Put the result of each part in the log (PASS/FAIL and the first failing lines). Add a line "Regression P1-P3: PASS/FAIL".
3. Extra, informational: `node tools/qa/a11y-check.js`.

Prohibited: changing product code or existing test assertions, new dependencies.
Log: write `docs/opt/log/PK-P3q.md` (max 10 lines). Do not run git.
