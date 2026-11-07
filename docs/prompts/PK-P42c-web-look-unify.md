# PK-P42c: Home window draws pigs from the look descriptor
Zmieniaj: web/home/canvas-pig.js, web/home/features/pigs/feature.js, web/home/features/pigs/mock.js, tools/qa/ux-p42-web-look.js, docs/opt/log/PK-P42c.md
Wymagane: tools/qa/ux-p42-web-look.js
Weryfikacja: node --check web/home/canvas-pig.js && node --check web/home/features/pigs/feature.js && node --check tools/qa/ux-p42-web-look.js && node tools/qa/ux-p42-web-look.js
Pytania: nie zadawaj pytań i nie czekaj na odpowiedź. Jeśli czegoś brakuje lub coś jest niejasne, sam wybierz najrozsądniejsze rozwiązanie zgodne z AGENTS.md, zapisz decyzję w logu i dokończ do końca.
Limity (twarde): maks. 45 wywołań narzędzi. Linię Weryfikacja uruchom maks. 2 razy. Czytaj tylko pliki z Zmieniaj/Wymagane oraz zakresy linii znalezione przez grep. Nie diagnozuj niczego spoza Zmieniaj. Gdy test pada na czymś, czego Twoja zmiana nie dotyka: zapisz nazwę testu i 5 linii błędu w logu, status BLOCKED, zakończ. Po błędzie we własnym kodzie wolno jedna poprawka i jeden ponowny bieg, potem zakończ jako BLOCKED. Nie uruchamiaj web-smoke.js (robi to paczka q).
Nie ruszaj: AGENTS.md, docs/archive/, tasks/*, every file not listed in Zmieniaj
Goal: Every place in the Home window (scene canvas, My pigs, More, pig room tabs) must draw the pig from `pigs[i].look` from Core (PK-P42a), so it matches the desktop pig.
Depends on: PK-P42a merged (read docs/opt/log/PK-P42a.md first for the field names).


## Steps
1. Read `docs/opt/log/PK-P42a.md`. grep in `canvas-pig.js` and `pigs/feature.js` for where the sprite/skin/breed/coat is chosen (`sheet`, `skin`, `breed`, `coat`, `spriteUrl`, `portrait`).
2. Replace the local look logic with ONE helper `window.CuyLook.spriteFor(pig)` (put it at the top of `pigs/feature.js` or in `canvas-pig.js`, whichever loads first; the other uses it) reading `pig.look`. Fallback for old state without `look`: the previous logic, so old saves and the mock keep working.
3. Update `pigs/mock.js` so mock pigs have `look` (starter, Kuki, Ned, one more).
4. Test `tools/qa/ux-p42-web-look.js` (Playwright, mock): L1 `same-key-everywhere` (the sprite key used by the canvas, My pigs list, More tile and pig room tab are equal for each pig), L2 `starter-not-kuki`, L3 `old-state-fallback` (pig without `look` still draws), L4 `no-404` (no failed image requests).
5. Run Weryfikacja; fix until green.

Prohibited: changing or deleting existing test assertions (poza wskazanymi w krokach), new dependencies, touching files outside "Zmieniaj", extra refactors.
Log: write `docs/opt/log/PK-P42c.md` (max 10 lines: decisions, exact API/field names others will use, differences from the plan, BLOCKED reason if any). Do not run git.
