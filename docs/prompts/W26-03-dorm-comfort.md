# W26-03: PigComfort: roommates use the shared bedroom as their own room
Zmieniaj: src/Cuy.Core/World/PigComfort.cs, tests/Cuy.Core.Tests/PigComfortDormTests.cs
Wymagane: tests/Cuy.Core.Tests/PigComfortDormTests.cs
Weryfikacja: dotnet test tests/Cuy.Core.Tests/Cuy.Core.Tests.csproj -c Release
Pytania: nie zadawaj pytań i nie czekaj na odpowiedź. Jeśli czegoś brakuje lub coś jest niejasne, sam wybierz najrozsądniejsze rozwiązanie zgodne z AGENTS.md, zapisz decyzję w opisie PR i dokończ zadanie do końca.
Nie ruszaj: src/Cuy/*, AGENTS.md, docs/*, tasks/*, assets/data/*
Goal: Residents of the shared bedroom count it as their own room in comfort.
Depends on: W25 merged.
Facts: W23-03 already reads `RoomShare` in `PigComfort.Score`. Check it: this task only adds the missing parts. (a) The dorm's own sum is counted once per pig (each resident sees the full dorm comfort at weight `own`). (b) A resident's parked room counts for nobody (weight 0, not `others`, otherwise a shared pig would be double counted). (c) Non-residents see the dorm as a common place (weight `common`). If W23-03 already behaves like this, change nothing in production code and only add the tests (say so in the PR). Test rules: use `RepoFile(...)` for repo files, inject tables and `Random`/clock instead of assigning statics (`Current`), keep tests deterministic.
Steps:
1. Adjust `PigComfort` if needed.
2. Tests for (a), (b), (c) with a 2-pig world; the score stays capped at 100.
Prohibited: changing or deleting existing test assertions, new dependencies, touching files outside "Zmieniaj". Names and signatures from earlier waves are given as planned. If the real code differs, use the real code, list each difference in the PR, and continue (do not stop, nobody will answer).
PR: what was done, decisions and why, how to check by hand.
