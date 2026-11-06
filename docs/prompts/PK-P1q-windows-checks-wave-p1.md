# PK-P1q: Windows checks after wave P1 (package, wave P1, runs last)
Zmieniaj: tools/qa/run-exe-smoke.ps1, tools/qa/ux-all.js, docs/qa/UX_WAVE_CHECKS.md, docs/opt/log/PK-P1q.md
Wymagane: tools/qa/run-exe-smoke.ps1, docs/qa/UX_WAVE_CHECKS.md
Weryfikacja: powershell -ExecutionPolicy Bypass -File tools/build.ps1 -Config Release && node tools/qa/ux-all.js p1 && node tools/qa/web-smoke.js && node tools/qa/check-assets.js && powershell -ExecutionPolicy Bypass -File tools/qa/run-exe-smoke.ps1 -Seconds 25
Pytania: nie zadawaj pytań i nie czekaj na odpowiedź. Jeśli czegoś brakuje lub coś jest niejasne, sam wybierz najrozsądniejsze rozwiązanie zgodne z AGENTS.md, zapisz decyzję w logu i dokończ do końca.
Limity (twarde): każdą komendę uruchom raz, nie ponawiaj nieudanej. Nie naprawiaj kodu produktowego. Wynik porównuj z docs/opt/log/baseline-smoke.txt (jeśli istnieje): błąd obecny w baseline to „stary”. Maks. 20 wywołań narzędzi.
Nie ruszaj: AGENTS.md, docs/archive/, tasks/*, every file not listed in Zmieniaj, all product code (src/, web/home/, assets/)
Goal: After the wave P1 packages are merged, run the full battery on Windows and report what really works. This package does NOT fix product code. If a check fails, write it in the log with the output lines and let the verification line fail: the human decides.
Depends on: PK-P1a, PK-P1b, PK-P1c, PK-P1d merged. Run on Windows with the .NET SDK, Node and Playwright chromium installed (`bash setup.sh` equivalent: `npm --prefix tools/qa ci` and `npx --prefix tools/qa playwright install chromium`).

## Steps
1. `tools/qa/run-exe-smoke.ps1` (new, PowerShell 5.1 compatible, param `-Seconds 25 -Config Release`):
   - Back up `%AppData%\Cuy\save.json` to `save.json.qa-backup` (if it exists) and restore it in a `finally` block, so a real player's progress is never changed. Print the backup path.
   - Run `src\Cuy\bin\<Config>\Cuy.exe --selftest`; exit code must be 0; print the `PASS`/`FAIL` lines from `%TEMP%\cuy-selftest.txt` for failures only.
   - Remember the length of `%LocalAppData%\Cuy\logs\cuy.log`, start `Cuy.exe` normally, wait `-Seconds`, kill the process tree (`taskkill /T /F`), read the log lines added since the start.
   - FAIL (exit 1) if the new log lines contain `[ERROR]`, `Unhandled`, `Exception` (ignore lines already known as harmless: keep an array `$Allowed` at the top, empty at first) or if the process died before the time passed. Print at most 20 offending lines. Also print the count of `[Bubble]` lines (informational).
2. `docs/qa/UX_WAVE_CHECKS.md` (new, max 60 lines): for wave P1 the table "check | command | pass criterion | what a human looks at in the real app". Rows: build+Core tests, `ux-p1-lifecycle`, `ux-p1-buttons`, `ux-p1-decorate`, web smoke, assets check, exe smoke, and the manual checklist from the section "Wave P1" of `docs/PLAN_POPRAWEK_UX.md` ("Do sprawdzenia" bullets, copy them). Later waves append their own section in the same format.
3. Run the whole Weryfikacja line. Copy into the log the result of each part (PASS/FAIL and the first failing lines). If `tools/build.ps1` already runs the Core tests, do not run them twice.
4. Also run these extra checks and put the result in the log (they are not part of the verification line): `node tools/qa/data-check.js`, `node tools/qa/check-icons.js`, `node tools/qa/a11y-check.js` (a failure here is information, not a blocker).
Prohibited: changing product code or existing test assertions, new dependencies, editing `tools/qa/web-smoke.js`.
Log: write `docs/opt/log/PK-P1q.md` (max 10 lines + one line per failed check). Do not run git.
