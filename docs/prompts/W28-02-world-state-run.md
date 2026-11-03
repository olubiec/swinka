# W28-02: WorldState.Run: who is out in the run
Zmieniaj: src/Cuy.Core/World/WorldState.cs, tests/Cuy.Core.Tests/WorldStateRunTests.cs
Wymagane: tests/Cuy.Core.Tests/WorldStateRunTests.cs
Weryfikacja: dotnet test tests/Cuy.Core.Tests/Cuy.Core.Tests.csproj -c Release
Pytania: nie zadawaj pytań i nie czekaj na odpowiedź. Jeśli czegoś brakuje lub coś jest niejasne, sam wybierz najrozsądniejsze rozwiązanie zgodne z AGENTS.md, zapisz decyzję w opisie PR i dokończ zadanie do końca.
Nie ruszaj: src/Cuy/*, AGENTS.md, docs/*, tasks/*, assets/data/*
Goal: The saved world state remembers which pigs are out in the garden run and since when.
Depends on: W27 merged.
Facts: Additive: `WorldState.Run` = `RunState { Dictionary<string,DateTime> Out (pig id -> UTC time it went out); string DayLocalDate; Dictionary<string,double> HoursToday (pig id -> hours credited today); }` lazy, non-null. Design: docs/PIG_ROOMS.md section 8. Test rules: use `RepoFile(...)` for repo files, inject tables and `Random`/clock instead of assigning statics (`Current`), keep tests deterministic.
Steps:
1. Add the types.
2. Tests: defaults; JSON round trip with UTC kinds preserved; old world JSON loads; null collections become empty.
Prohibited: changing or deleting existing test assertions, new dependencies, touching files outside "Zmieniaj". Names and signatures from earlier waves are given as planned. If the real code differs, use the real code, list each difference in the PR, and continue (do not stop, nobody will answer).
PR: what was done, decisions and why, how to check by hand.
