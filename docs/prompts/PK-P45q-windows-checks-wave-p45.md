# PK-P45q: Windows checks after wave P45 (paczka q, biegnie ostatnia)
Zmieniaj: docs/qa/UX_WAVE_CHECKS.md, docs/qa/shots, tools/qa/ux-p45-shots.js, docs/opt/log/PK-P45q.md
Wymagane: docs/qa/UX_WAVE_CHECKS.md
Weryfikacja: powershell -ExecutionPolicy Bypass -File tools/build.ps1 -Config Release && node tools/qa/ux-all.js && node tools/qa/web-smoke.js && node tools/qa/check-assets.js && node tools/qa/check-icons.js && powershell -ExecutionPolicy Bypass -File tools/qa/run-exe-smoke.ps1 -Seconds 25
Pytania: nie zadawaj pytań i nie czekaj na odpowiedź. Jeśli czegoś brakuje lub coś jest niejasne, sam wybierz najrozsądniejsze rozwiązanie zgodne z AGENTS.md, zapisz decyzję w logu i dokończ do końca.
Limity (twarde): maks. 25 wywołań narzędzi. Linię Weryfikacja uruchom maks. 2 razy. Czytaj tylko pliki z Zmieniaj/Wymagane oraz zakresy linii znalezione przez grep. Nie diagnozuj niczego spoza Zmieniaj. Gdy test pada na czymś, czego Twoja zmiana nie dotyka: zapisz nazwę testu i 5 linii błędu w logu, status BLOCKED, zakończ. Po błędzie we własnym kodzie wolno jedna poprawka i jeden ponowny bieg, potem zakończ jako BLOCKED. Nie uruchamiaj web-smoke.js (robi to paczka q).
Nie ruszaj: AGENTS.md, docs/archive/, tasks/*, every file not listed in Zmieniaj
Goal: Run the Windows checks of wave P45 and record the result. A failing check is written in the log and makes the line fail.
Depends on: all other packages of wave P45 merged.

## Steps
1. Add a section "Wave P45" to `docs/qa/UX_WAVE_CHECKS.md` in the format of the earlier sections: one row per `ux-p45-*` test from `docs/opt/log/PK-P45*.md`, plus the Weryfikacja line, plus these manual points: (a) salon in the main window: furniture stands ON the floor, not on the wall, and looks the same as in the edit drawer; (b) a 10x6 pig room fits the window whole; (c) the pig in garden, park, farm, market is neither a giant nor an ant next to a bench or a stall and has a shadow sprite; (d) the baseboard has no white or black line.
2. `tools/qa/ux-p45-shots.js` takes one screenshot per scene into `docs/qa/shots/p45-<scene>.png` (Playwright, mock `seven`, viewport 420x720).
3. Run the Weryfikacja line ONCE (each command once, no retry), compare with `docs/opt/log/baseline-smoke.txt`, write in the log (max 10 lines): PASS/FAIL per command, new vs old errors.

Prohibited: changing or deleting existing test assertions, new dependencies, touching files outside "Zmieniaj", extra refactors.
Log: write `docs/opt/log/PK-P45q.md` (max 10 lines: decisions, exact API/field names others will use, differences from the plan, BLOCKED reason if any). Do not run git.
