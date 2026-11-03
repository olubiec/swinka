# W27-01: WorldState.PigHomes: free roaming or tied to a room
Zmieniaj: src/Cuy.Core/World/WorldState.cs, tests/Cuy.Core.Tests/WorldStateHomesTests.cs
Wymagane: tests/Cuy.Core.Tests/WorldStateHomesTests.cs
Weryfikacja: dotnet test tests/Cuy.Core.Tests/Cuy.Core.Tests.csproj -c Release
Pytania: nie zadawaj pytań i nie czekaj na odpowiedź. Jeśli czegoś brakuje lub coś jest niejasne, sam wybierz najrozsądniejsze rozwiązanie zgodne z AGENTS.md, zapisz decyzję w opisie PR i dokończ zadanie do końca.
Nie ruszaj: src/Cuy/*, AGENTS.md, docs/*, tasks/*, assets/data/*
Goal: The saved world state remembers for each pig whether it roams the house or stays in one room.
Depends on: W26 merged. Sub-wave W27a: no dependency on other tasks of the wave.
Facts: Additive save field (AGENTS.md): `WorldState.PigHomes` = `Dictionary<string,PigHomeState>`, `PigHomeState { string Mode ("free" or "room"); string Room (room id when Mode is room, otherwise null) }`. Absent entry means the default from `HomeEconomyConfig.RoamDefaultMode` (`free`). Lazy non-null collection like the others. Design: docs/PIG_ROOMS.md section 7. Test rules: use `RepoFile(...)` for repo files, inject tables and `Random`/clock instead of assigning statics (`Current`), keep tests deterministic.
Steps:
1. Add the types and the property.
2. Tests: absent entry reads as default; JSON round trip; an old world JSON loads with an empty map; invalid mode strings are read as `free` by a small helper `PigHomeState.Normalize()`.
Prohibited: changing or deleting existing test assertions, new dependencies, touching files outside "Zmieniaj". Names and signatures from earlier waves are given as planned. If the real code differs, use the real code, list each difference in the PR, and continue (do not stop, nobody will answer).
PR: what was done, decisions and why, how to check by hand.
