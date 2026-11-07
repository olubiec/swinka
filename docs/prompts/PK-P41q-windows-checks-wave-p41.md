# PK-P41q: Windows checks after wave P41
Zmieniaj: docs/qa/UX_WAVE_CHECKS.md, docs/opt/log/PK-P41q.md
Wymagane: docs/qa/UX_WAVE_CHECKS.md
Weryfikacja: powershell -ExecutionPolicy Bypass -File tools/build.ps1 -Config Release && node tools/qa/ux-all.js && node tools/qa/web-smoke.js && node tools/qa/check-assets.js && node tools/qa/check-icons.js && powershell -ExecutionPolicy Bypass -File tools/qa/run-exe-smoke.ps1 -Seconds 25
Pytania: nie zadawaj pytań i nie czekaj na odpowiedź. Jeśli czegoś brakuje lub coś jest niejasne, sam wybierz najrozsądniejsze rozwiązanie zgodne z AGENTS.md, zapisz decyzję w logu i dokończ do końca.
Limity (twarde): maks. 45 wywołań narzędzi. Linię Weryfikacja uruchom maks. 2 razy. Czytaj tylko pliki z Zmieniaj/Wymagane oraz zakresy linii znalezione przez grep. Nie diagnozuj niczego spoza Zmieniaj. Gdy test pada na czymś, czego Twoja zmiana nie dotyka: zapisz nazwę testu i 5 linii błędu w logu, status BLOCKED, zakończ. Po błędzie we własnym kodzie wolno jedna poprawka i jeden ponowny bieg, potem zakończ jako BLOCKED. Nie uruchamiaj web-smoke.js (robi to paczka q).
Nie ruszaj: AGENTS.md, docs/archive/, tasks/*, every file not listed in Zmieniaj
Goal: Run the Windows checks of wave P41 and record the result. This package does NOT fix product code.
Depends on: all other packages of wave P41 merged.


## Steps
1. Append a section "Wave P41" to `docs/qa/UX_WAVE_CHECKS.md` in the format of the earlier sections: one row per test of this wave (`ux-p41-*`) plus the verification line, and the manual bullets of "Do sprawdzenia po P41" from `docs/PLAN_POPRAWEK_UX.md`.
2. Run the verification line once (each command once, never retry), compare with `docs/opt/log/baseline-smoke.txt`, write the result in the log (max 10 lines: PASS/FAIL per command, new vs old errors).

Prohibited: changing or deleting existing test assertions (poza wskazanymi w krokach), new dependencies, touching files outside "Zmieniaj", extra refactors.
Log: write `docs/opt/log/PK-P41q.md` (max 10 lines: decisions, exact API/field names others will use, differences from the plan, BLOCKED reason if any). Do not run git.
