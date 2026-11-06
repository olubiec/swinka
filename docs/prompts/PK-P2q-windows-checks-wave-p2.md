# PK-P2q: Windows checks after wave P2 (package, wave P2, runs last)
Zmieniaj: docs/qa/UX_WAVE_CHECKS.md, docs/opt/log/PK-P2q.md
Wymagane: docs/qa/UX_WAVE_CHECKS.md
Weryfikacja: powershell -ExecutionPolicy Bypass -File tools/build.ps1 -Config Release && node tools/qa/ux-all.js && node tools/qa/web-smoke.js && node tools/qa/check-assets.js && node tools/qa/check-icons.js && powershell -ExecutionPolicy Bypass -File tools/qa/run-exe-smoke.ps1 -Seconds 25
Pytania: nie zadawaj pytań i nie czekaj na odpowiedź. Jeśli czegoś brakuje lub coś jest niejasne, sam wybierz najrozsądniejsze rozwiązanie zgodne z AGENTS.md, zapisz decyzję w logu i dokończ do końca.
Limity (twarde): każdą komendę uruchom raz, nie ponawiaj nieudanej. Nie naprawiaj kodu produktowego. Wynik porównuj z docs/opt/log/baseline-smoke.txt (jeśli istnieje): błąd obecny w baseline to „stary”. Maks. 20 wywołań narzędzi.
Nie ruszaj: AGENTS.md, docs/archive/, tasks/*, every file not listed in Zmieniaj, all product code (src/, web/home/, assets/)
Goal: Same as PK-P1q for wave P2, and a regression run of wave P1 (`ux-all.js` without an argument runs p1 and p2). This package does NOT fix product code: a failing check is written in the log and makes the verification line fail.
Depends on: PK-P2a, PK-P2b, PK-P2c merged.

## Steps
1. Append a section "Wave P2" to `docs/qa/UX_WAVE_CHECKS.md` in the same table format: `ux-p2-portraits`, `ux-p2-icons`, `ux-p2-player`, check-assets (icons), and the manual bullets of "Wave P2" from `docs/PLAN_POPRAWEK_UX.md`.
2. Run the Weryfikacja line. Put the result of each part in the log (PASS/FAIL and the first failing lines). Add a line "P1 regression: PASS/FAIL".
3. Extra, informational: `node tools/qa/a11y-check.js` and `node tools/qa/check-css-vars.js`.
Prohibited: changing product code or existing test assertions, new dependencies.
Log: write `docs/opt/log/PK-P2q.md` (max 10 lines + one line per failed check). Do not run git.
