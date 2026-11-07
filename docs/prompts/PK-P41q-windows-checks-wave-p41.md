# PK-P41q: Windows checks after wave P41 (paczka q, biegnie ostatnia)
Zmieniaj: docs/qa/UX_WAVE_CHECKS.md, docs/qa/shots, tools/qa/ux-p41-shots.js, docs/opt/log/PK-P41q.md
Wymagane: docs/qa/UX_WAVE_CHECKS.md
Weryfikacja: powershell -ExecutionPolicy Bypass -File tools/build.ps1 -Config Release && node tools/qa/ux-all.js && node tools/qa/web-smoke.js && node tools/qa/check-assets.js && node tools/qa/check-icons.js && powershell -ExecutionPolicy Bypass -File tools/qa/run-exe-smoke.ps1 -Seconds 25
Pytania: nie zadawaj pytań i nie czekaj na odpowiedź. Jeśli czegoś brakuje lub coś jest niejasne, sam wybierz najrozsądniejsze rozwiązanie zgodne z AGENTS.md, zapisz decyzję w logu i dokończ do końca.
Limity (twarde): każdą komendę uruchom raz, nie ponawiaj nieudanej. Nie naprawiaj kodu produktowego. Maks. 25 wywołań narzędzi.
Nie ruszaj: AGENTS.md, docs/archive/, tasks/*, every file not listed in Zmieniaj, all product code (src/, web/home/, assets/, tools/art/)
Goal: Run the Windows checks of wave P41 and record the result. A failing check is written in the log and makes the line fail.
Depends on: all other packages of wave P41 merged.

## Steps
1. Dopisz sekcję "Wave P41" do `docs/qa/UX_WAVE_CHECKS.md` w formacie wcześniejszych sekcji: wiersz na każdy test `ux-p41-*` z logów `docs/opt/log/PK-P41*.md` plus linię Weryfikacja, oraz punkty ręczne z "Do sprawdzenia po P41" z `docs/PLAN_POPRAWEK_UX.md`.
2. Odpal wszystkie testy `ux-p41-*`. W `docs/qa/UX_WAVE_CHECKS.md` zapisz, które z 5 napraw (Bond, labirynt, audio, kolorowanie, gramofon) mają zielony test.
3. Uruchom linię Weryfikacja RAZ (każdą komendę raz, bez ponawiania), porównaj z `docs/opt/log/baseline-smoke.txt`, zapisz w logu (maks. 10 linii): PASS/FAIL na komendę, nowe vs stare błędy.

Prohibited: product code changes.
Log: write `docs/opt/log/PK-P41q.md` (max 10 lines). Do not run git.
