# PK-P45q1: Stage gate for wave P45 (full checks) (wave P45q)
Zmieniaj: docs/opt/log/PK-P45q1.md
Weryfikacja: powershell -ExecutionPolicy Bypass -File tools/build.ps1 -Config Release && node tools/qa/ux-all.js && node tools/qa/web-smoke.js && node tools/qa/check-assets.js && node tools/qa/check-icons.js && powershell -ExecutionPolicy Bypass -File tools/qa/run-exe-smoke.ps1 -Seconds 25
Pytania: nie zadawaj pytań i nie czekaj na odpowiedź. Jeśli czegoś brakuje lub coś jest niejasne, sam wybierz najrozsądniejsze rozwiązanie zgodne z AGENTS.md, zapisz decyzję w logu i dokończ do końca.
Limity (twarde): maks. 20 wywołań narzędzi. Linię Weryfikacja uruchom maks. 2 razy. Czytaj tylko pliki z Zmieniaj/Wymagane oraz zakresy linii znalezione przez grep. Nie diagnozuj niczego spoza Zmieniaj. Gdy test pada na czymś, czego Twoja zmiana nie dotyka: zapisz nazwę testu i 5 linii błędu w logu, status BLOCKED, zakończ. Po błędzie we własnym kodzie wolno jedna poprawka i jeden ponowny bieg, potem zakończ jako BLOCKED. Nie uruchamiaj web-smoke.js (robi to paczka q).
Nie ruszaj: AGENTS.md, docs/archive/, tasks/*, every file not listed in Zmieniaj
Goal: Run the full Windows checks after wave P45 and record the result. A failing command is written in the log and makes the line fail.
Depends on: All other packages of wave P45 merged (including PK-P45d3 and PK-P45q2, which runs one wave earlier so the gate sees the final tree and `ux-p45-shots.js` is not half-written while `ux-all` runs). `ux-all.js` runs every `tools/qa/ux-p<N>-*.js` automatically, so all `ux-p45-*` tests are part of the line. This stage gate also covers the overlaps with P39 (blockers, fit, grid, light, depth) because the older `ux-p39-*` tests run in the same `ux-all`.
Produces (names other packages rely on): Result table in `docs/opt/log/PK-P45q1.md`.

## Steps
1. Do not edit any file except the log. Run the Weryfikacja line ONCE (each command once, no retry).
2. Compare with `docs/opt/log/baseline-smoke.txt` and write in the log (max 10 lines): PASS/FAIL per command, new vs old errors, and the names of any `ux-p45-*` tests that failed.
3. If a command fails because of this wave, mark status BLOCKED and name the package (e.g. PK-P45e2) that most likely caused it, using the 5 first error lines.

Prohibited: changing or deleting existing test assertions, new dependencies, touching files outside "Zmieniaj", extra refactors, running git.
Log: write `docs/opt/log/PK-P45q1.md` (max 10 lines: decisions, exact API/field names others will use, differences from the plan, BLOCKED reason if any). Do not run git.
