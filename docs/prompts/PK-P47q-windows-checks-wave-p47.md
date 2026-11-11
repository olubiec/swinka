# PK-P47q: Windows checks after the first part of wave P47 (package, runs last in wave 2)
Zmieniaj: docs/qa/UX_WAVE_CHECKS.md, docs/opt/log/PK-P47q.md
Wymagane: docs/qa/UX_WAVE_CHECKS.md
Weryfikacja: node --check tools/qa/ux-p47-bg.js && node --check tools/qa/ux-p47-room.js && node --check tools/qa/ux-p47-bar.js && node tools/qa/ux-p47-bg.js && node tools/qa/ux-p47-room.js && node tools/qa/ux-p47-bar.js && node tools/qa/check-assets.js && node tools/qa/check-icons.js
Pytania: nie zadawaj pytań i nie czekaj na odpowiedź. Jeśli czegoś brakuje lub coś jest niejasne, sam wybierz najrozsądniejsze rozwiązanie zgodne z AGENTS.md, zapisz decyzję w logu i dokończ do końca.
Limity (twarde): każdą komendę uruchom raz, nie ponawiaj nieudanej. Nie naprawiaj kodu produktowego. Wynik porównuj z docs/opt/log/baseline-smoke.txt (jeśli istnieje): błąd obecny w baseline to „stary”. Maks. 20 wywołań narzędzi.
Nie ruszaj: AGENTS.md, docs/archive/, tasks/*, every file not listed in Zmieniaj, all product code (src/, web/home/, assets/)
Goal: Owner sheet and checks for P47a (clean backgrounds), P47r (fixed room viewport) and P47c (places bar). Sprites (P47b) and campfire/light (P47d) come in later waves. This package does NOT fix product code: a failing check is written in the log and makes the verification line fail.
Depends on: PK-P47a, PK-P47r, PK-P47c merged, and the P46 packages of wave 2.

## Steps
1. Append a section "Wave P47 (part 1)" to `docs/qa/UX_WAVE_CHECKS.md` in the same table format: `ux-p47-bg`, `ux-p47-room`, `ux-p47-bar`, check-assets, check-icons, and the manual bullets 1, 2 and 5 of "Do sprawdzenia po P47" from `docs/PLAN_POPRAWEK_UX.md` (smooth scene switching with no size jump, natural pixel scale in the park, the new bar with readable title and Edit button). Bullets 3 and 4 (campfire, grass) wait for P47b and P47d.
2. Run the Weryfikacja line. Put the result of each part in the log (PASS/FAIL and the first failing lines). Add a line "Regression: `node tools/qa/ux-all.js` PASS/FAIL" (run it once).
3. Extra, informational: `node tools/qa/a11y-check.js`.

Prohibited: changing product code or existing test assertions, new dependencies.
Log: write `docs/opt/log/PK-P47q.md` (max 10 lines). Do not run git.
