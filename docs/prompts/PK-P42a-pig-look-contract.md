# PK-P42a: Core: one pig look source of truth
Zmieniaj: src/Cuy/Graphics/PigLook.cs, src/Cuy.Core/Pigs/PigRoster.cs, src/Cuy.Core.Tests/PigLookTests.cs, tools/qa/ux-p42-pig-look-core.js, docs/opt/log/PK-P42a.md
Wymagane: tools/qa/ux-p42-pig-look-core.js
Weryfikacja: node --check tools/qa/ux-p42-pig-look-core.js && node tools/qa/ux-p42-pig-look-core.js
Pytania: nie zadawaj pytań i nie czekaj na odpowiedź. Jeśli czegoś brakuje lub coś jest niejasne, sam wybierz najrozsądniejsze rozwiązanie zgodne z AGENTS.md, zapisz decyzję w logu i dokończ do końca.
Limity (twarde): maks. 45 wywołań narzędzi. Linię Weryfikacja uruchom maks. 2 razy. Czytaj tylko pliki z Zmieniaj/Wymagane oraz zakresy linii znalezione przez grep. Nie diagnozuj niczego spoza Zmieniaj. Gdy test pada na czymś, czego Twoja zmiana nie dotyka: zapisz nazwę testu i 5 linii błędu w logu, status BLOCKED, zakończ. Po błędzie we własnym kodzie wolno jedna poprawka i jeden ponowny bieg, potem zakończ jako BLOCKED. Nie uruchamiaj web-smoke.js (robi to paczka q).
Nie ruszaj: AGENTS.md, docs/archive/, tasks/*, every file not listed in Zmieniaj
Goal: The first pig got a wrong skin (looks like a radish pig, another like something else); Kuki on the desktop differs from Kuki in the Home window (desktop is right). Core must expose ONE look descriptor per pig, used by every renderer.
Depends on: PK-P37a merged.


## Steps
1. grep who decides a pig's look: `PigLook.cs` (desktop renderer), roster/named pigs (`src/Cuy.Core/Pigs`, `assets/data/named_pigs.json`, `breeds`), and what the Home page receives (`bridge`, `state.pigs[*]` fields: breed, coat, skin, stage, namedId). Read only those ranges. Write in the log the exact fields the desktop uses and the exact fields the page uses.
2. Find the mismatch (a default skin for named pig applied to the starter, skin id resolved from a different key, fallback to the first roster entry, stage-based sprite chosen differently). Fix so that a single function in Core `PigLookResolver.Resolve(pig)` (add it to `PigRoster.cs` or a new file under `src/Cuy.Core/Pigs/`) returns `{ spriteKey, breed, coat, stage, named }` and `PigLook.cs` calls it. Starter pig = default skin of its breed/coat, NOT Kuki's skin.
3. Expose the descriptor in the state sent to the page as `pigs[i].look = { spriteKey, breed, coat, stage }` (only add the field; do not rename any existing field). Do NOT touch web files in this package.
4. Core tests (xUnit in `src/Cuy.Core.Tests/PigLookTests.cs`): K1 `starter-differs-from-kuki-and-ned`, K2 `same-input-same-key`, K3 `every-roster-pig-has-sprite-file` (spriteKey resolves to an existing file under `assets/`), K4 `stage-changes-key`, K5 `unnamed-pig-no-named-skin`.
5. The JS test `tools/qa/ux-p42-pig-look-core.js` is a STATIC checker (Node, reads sources): L1 `resolver-exists` (`PigLookResolver` defined in `src/Cuy.Core/Pigs`), L2 `desktop-uses-it` (`PigLook.cs` calls it), L3 `state-exposes-look` (the state builder writes `look`; grep the file that builds `pigs` for the page), L4 `core-tests-exist` (`PigLookTests.cs` has K1-K5). Weryfikacja = syntax of the JS test below; build + Core tests run in the q package, but run `dotnet test src/Cuy.Core.Tests` only if dotnet exists in this environment, once.

Prohibited: changing or deleting existing test assertions (poza wskazanymi w krokach), new dependencies, touching files outside "Zmieniaj", extra refactors.
Log: write `docs/opt/log/PK-P42a.md` (max 10 lines: decisions, exact API/field names others will use, differences from the plan, BLOCKED reason if any). Do not run git.
