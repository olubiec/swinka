# PK-P39q: Windows checks after wave P39 (paczka q, biegnie ostatnia)
Zmieniaj: docs/qa/UX_WAVE_CHECKS.md, docs/qa/shots, tools/qa/ux-p39-shots.js, docs/opt/log/PK-P39q.md
Wymagane: docs/qa/UX_WAVE_CHECKS.md
Weryfikacja: powershell -ExecutionPolicy Bypass -File tools/build.ps1 -Config Release && node tools/qa/ux-all.js && node tools/qa/web-smoke.js && node tools/qa/check-assets.js && node tools/qa/check-icons.js && powershell -ExecutionPolicy Bypass -File tools/qa/run-exe-smoke.ps1 -Seconds 25
Pytania: nie zadawaj pytań i nie czekaj na odpowiedź. Jeśli czegoś brakuje lub coś jest niejasne, sam wybierz najrozsądniejsze rozwiązanie zgodne z AGENTS.md, zapisz decyzję w logu i dokończ do końca.
Limity (twarde): każdą komendę uruchom raz, nie ponawiaj nieudanej. Nie naprawiaj kodu produktowego. Maks. 25 wywołań narzędzi.
Nie ruszaj: AGENTS.md, docs/archive/, tasks/*, every file not listed in Zmieniaj, all product code (src/, web/home/, assets/, tools/art/)
Goal: Run the Windows checks of wave P39 and record the result. A failing check is written in the log and makes the line fail.
Depends on: PK-P39a, PK-P39b, PK-P39c1, PK-P39c2, PK-P39d, PK-P39e merged.

## Steps
1. Dopisz sekcję "Wave P39" do `docs/qa/UX_WAVE_CHECKS.md` w formacie wcześniejszych sekcji: wiersz na każdy test (`ux-p39-blockers`, `ux-p39-layout`, `ux-p39-grid`, `ux-p39-snap`, `ux-p39-light`, `ux-p39-depth`) z logów `docs/opt/log/PK-P39*.md` plus linię Weryfikacja, oraz punkty ręczne z "Do sprawdzenia po P39" z `docs/PLAN_POPRAWEK_UX.md`.
2. Zapisz zrzuty wszystkich scen stanu mocka `seven` (Playwright, `tools/qa/lib/ux.js` `openHome`, okno 400x620) do `docs/qa/shots/p39-<scena>.png` małym skryptem `tools/qa/ux-p39-shots.js` i dopisz go do logu.
3. Uruchom linię Weryfikacja RAZ (każdą komendę raz, bez ponawiania), porównaj z `docs/opt/log/baseline-smoke.txt`, zapisz w logu (maks. 10 linii): PASS/FAIL na komendę, nowe vs stare błędy.

Prohibited: product code changes.
Log: write `docs/opt/log/PK-P39q.md` (max 10 lines). Do not run git.
