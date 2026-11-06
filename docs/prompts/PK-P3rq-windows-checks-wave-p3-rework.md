# PK-P3rq: Windows checks after the P3 rework (package, waves P3c-P3f, runs last)
Zmieniaj: docs/qa/UX_WAVE_CHECKS.md, docs/opt/log/PK-P3rq.md
Wymagane: docs/qa/UX_WAVE_CHECKS.md
Weryfikacja: powershell -ExecutionPolicy Bypass -File tools/build.ps1 -Config Release && node tools/qa/ux-all.js && node tools/qa/web-smoke.js && node tools/qa/check-assets.js && node tools/qa/check-icons.js && node tools/qa/place-scenes-check.js && python3 tools/art/style_check.py --baseline docs/album/stylbook/lint_baseline.txt && powershell -ExecutionPolicy Bypass -File tools/qa/run-exe-smoke.ps1 -Seconds 25
Pytania: nie zadawaj pytań i nie czekaj na odpowiedź. Jeśli czegoś brakuje lub coś jest niejasne, sam wybierz najrozsądniejsze rozwiązanie zgodne z AGENTS.md, zapisz decyzję w logu i dokończ do końca.
Limity (twarde): każdą komendę uruchom raz, nie ponawiaj nieudanej. Nie naprawiaj kodu produktowego. Wynik porównuj z docs/opt/log/baseline-smoke.txt (jeśli istnieje): błąd obecny w baseline to „stary”. Maks. 20 wywołań narzędzi.
Nie ruszaj: AGENTS.md, docs/archive/, tasks/*, every file not listed in Zmieniaj, all product code (src/, web/home/, assets/)
Goal: Same as PK-P3q for the reworked wave P3 (packages PK-P3c..PK-P3f). It does NOT fix product code: a failing check goes into the log.
Depends on: all packages P3c-P3f merged.

## Steps
1. Append a section "Wave P3 rework" to `docs/qa/UX_WAVE_CHECKS.md` in the same table: `PigLocation` Core tests, `place-scenes-check`, `ux-p3-scenes`, `ux-p3-world`, `ux-p3-icons`, `ux-p3-places`, check-assets, check-icons, style_check, plus the manual bullets of "Do sprawdzenia po P3 (rework)" from `docs/PLAN_POPRAWEK_UX.md`.
2. Run the Weryfikacja line; log PASS/FAIL per part with the first failing lines. Add "Regression P1-P3r: PASS/FAIL" (`ux-all.js` has no argument).
3. Informational: `node tools/qa/a11y-check.js`; list the screenshots in `docs/qa/shots/p3f-*.png`.

Prohibited: changing or deleting existing test assertions (poza wskazanymi), new dependencies, touching files outside "Zmieniaj".
Log: write `docs/opt/log/PK-P3rq.md` (max 10 lines). Do not run git.
