# PK-P42b: Adoption countdown as days, hours, minutes
Zmieniaj: web/home/features/pigs/feature.js, tools/qa/ux-p42-countdown.js, docs/opt/log/PK-P42b.md
Wymagane: tools/qa/ux-p42-countdown.js
Weryfikacja: node --check web/home/features/pigs/feature.js && node --check tools/qa/ux-p42-countdown.js && node tools/qa/ux-p42-countdown.js
Pytania: nie zadawaj pytań i nie czekaj na odpowiedź. Jeśli czegoś brakuje lub coś jest niejasne, sam wybierz najrozsądniejsze rozwiązanie zgodne z AGENTS.md, zapisz decyzję w logu i dokończ do końca.
Limity (twarde): maks. 45 wywołań narzędzi. Linię Weryfikacja uruchom maks. 2 razy. Czytaj tylko pliki z Zmieniaj/Wymagane oraz zakresy linii znalezione przez grep. Nie diagnozuj niczego spoza Zmieniaj. Gdy test pada na czymś, czego Twoja zmiana nie dotyka: zapisz nazwę testu i 5 linii błędu w logu, status BLOCKED, zakończ. Po błędzie we własnym kodzie wolno jedna poprawka i jeden ponowny bieg, potem zakończ jako BLOCKED. Nie uruchamiaj web-smoke.js (robi to paczka q).
Nie ruszaj: AGENTS.md, docs/archive/, tasks/*, every file not listed in Zmieniaj
Goal: The adoption countdown shows '100 days' with a fraction. It must show days, hours and minutes as integers.
Depends on: PK-P37a merged.


## Steps
1. grep `adopt`, `days`, `toFixed`, `countdown`, `remaining` in `web/home/features/pigs/feature.js` (and `pigs/mock.js`). Find where the remaining time is formatted.
2. Add one pure function `formatRemaining(ms)` exported as `window.CuyPigs.formatRemaining` (and `module.exports` guard for Node): `>= 1 day` -> `2d 5h 40m`; `< 1 day` -> `5h 40m`; `< 1 hour` -> `12m`; `< 1 minute` -> `<1m`; `<= 0` -> `Ready`. Integers only (floor), never a decimal point, never `NaN`. Use it everywhere the countdown is shown. Re-render every 30 s while visible.
3. Test `tools/qa/ux-p42-countdown.js` (Node, require the function): D1 `100.5-days` -> `100d 12h 0m`; D2 `3h5m` -> `3h 5m`; D3 `59s` -> `<1m`; D4 `zero-and-negative` -> `Ready`; D5 `no-dot-no-nan` over 1000 random inputs; D6 `rollover` 23h59m60s boundaries.
4. Run Weryfikacja; fix until green.

Prohibited: changing or deleting existing test assertions (poza wskazanymi w krokach), new dependencies, touching files outside "Zmieniaj", extra refactors.
Log: write `docs/opt/log/PK-P42b.md` (max 10 lines: decisions, exact API/field names others will use, differences from the plan, BLOCKED reason if any). Do not run git.
