# W15-05: SelfTest: pigs_named.json and baked sheets
Zmieniaj: src/Cuy/dotNet/SelfTest.cs
Wymagane: src/Cuy/dotNet/SelfTest.cs
Weryfikacja: dotnet build src/Cuy/Cuy.csproj -c Release -p:EnableWindowsTargeting=true
Pytania: nie zadawaj pytań i nie czekaj na odpowiedź. Jeśli czegoś brakuje lub coś jest niejasne, sam wybierz najrozsądniejsze rozwiązanie zgodne z AGENTS.md, zapisz decyzję w opisie PR i dokończ zadanie do końca.
Nie ruszaj: src/Cuy.Core/*, web/*, AGENTS.md, docs/*, tasks/*
Goal: The desktop self-test checks the named-pig data and that every sheet exists.
Depends on: W14 merged.
Facts: `SelfTest` runs `Check(name, action)` entries (see the top of the file). Add checks: `pigs_named.json` parses via `ParseData`; for every pig in it the five stage folders exist under `assets/sprites/pigs/<id>/<stage>/spritesheet.png`; `assets/sprites/pigs/pigs.json` parses. Use the same failure style as neighbouring checks. Test rules: use `RepoFile(...)` for repo files, inject tables and `Random`/clock instead of assigning statics (`Current`), keep tests deterministic.
Steps:
1. Add the three checks next to the other data checks; no other change.
Prohibited: changing or deleting existing test assertions, new dependencies, touching files outside "Zmieniaj". Names and signatures from earlier waves are given as planned. If the real code differs, use the real code, list each difference in the PR, and continue (do not stop, nobody will answer).
PR: what was done, decisions and why, how to check by hand.
