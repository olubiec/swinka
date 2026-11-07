# PK-P41d: Pig looks match everywhere, adoption clock
Zmieniaj: src/Cuy/Graphics/PigLook.cs, src/Cuy.Core/Pigs/PigRoster.cs, web/home/features/pigs/feature.js, web/home/canvas-pig.js, tools/qa/ux-p41-looks.js, docs/opt/log/PK-P41d.md
Wymagane: tools/qa/ux-p41-looks.js
Weryfikacja: node --check web/home/features/pigs/feature.js && node --check web/home/canvas-pig.js && node --check tools/qa/ux-p41-looks.js && node tools/qa/ux-p41-looks.js
Pytania: nie zadawaj pytań i nie czekaj na odpowiedź. Jeśli czegoś brakuje lub coś jest niejasne, sam wybierz najrozsądniejsze rozwiązanie zgodne z AGENTS.md, zapisz decyzję w logu i dokończ do końca.
Limity (twarde): maks. 45 wywołań narzędzi. Linię Weryfikacja uruchom maks. 2 razy. Czytaj tylko pliki z Zmieniaj/Wymagane oraz zakresy linii znalezione przez grep. Nie diagnozuj niczego spoza Zmieniaj. Gdy test pada na czymś, czego Twoja zmiana nie dotyka: zapisz nazwę testu i 5 linii błędu w logu, status BLOCKED, zakończ. Po błędzie we własnym kodzie wolno jedna poprawka i jeden ponowny bieg, potem zakończ jako BLOCKED. Nie uruchamiaj web-smoke.js (robi to paczka q).
Nie ruszaj: AGENTS.md, docs/archive/, tasks/*, every file not listed in Zmieniaj
Goal: Owner's report: the first pig got the wrong skin (looks like a radish pig, and one more pig looks like something else); Kuki on the desktop task bar looks different from Kuki in the game window (the desktop one is right); the adoption countdown shows '100 days' with a fraction. Make every place draw a pig from ONE source of truth and format the countdown as days, hours, minutes.
Depends on: PK-P37a merged.


## Steps
1. grep who decides a pig's look: `PigLook.cs` (desktop) vs the Home window (`canvas-pig.js`, `pigs/feature.js`: breed/coat/skin fields). Find the field mismatch (e.g. skin name resolved from a different key, a default skin of one named pig applied to the starter pig). Both must read the same roster entry (breed, coat, stage, named-pig skin). The desktop look is the reference.
2. If a Core file is listed above and needs changing, keep it minimal and add/adjust a Core test only if `src/Cuy.Core.Tests` already covers PigRoster; else describe the fix in the log.
3. Adoption countdown: grep `adopt` in `web/home/features/pigs/feature.js`; the remaining time must render as `Xd Yh Zm` (e.g. `2d 5h 40m`; `5h 40m` under a day; `12m` under an hour), integers only, no decimals, recomputed every minute; when time is up show `Ready`.
4. Test `tools/qa/ux-p41-looks.js` (Playwright + mock with 3 roster pigs: starter, Kuki, Ned, one more):
   - L1 `same-look-everywhere`: for each pig the sprite key drawn in the Home canvas, in My pigs, in More and in the adoption view are identical, and equal the desktop look key exposed by the mock.
   - L2 `starter-not-kuki`: the starter pig's skin differs from Kuki's and from Ned's.
   - L3 `clock-format`: given remaining 100.5 days -> `100d 12h 0m`; 3 h 5 min -> `3h 5m`; 59 s -> `1m`; no `.` in any output.
5. Run Weryfikacja; fix until green.

Prohibited: changing or deleting existing test assertions (poza wskazanymi w krokach), new dependencies, touching files outside "Zmieniaj", extra refactors.
Log: write `docs/opt/log/PK-P41d.md` (max 10 lines: decisions, exact API/field names others will use, differences from the plan, BLOCKED reason if any). Do not run git.
