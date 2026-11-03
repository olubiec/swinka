# W27-03: Pet.Homes: choose roaming or a home room
Zmieniaj: src/Cuy.Core/Pet.Homes.cs, src/Cuy.Core/Balance.cs, tests/Cuy.Core.Tests/PetHomesTests.cs
Wymagane: src/Cuy.Core/Pet.Homes.cs, tests/Cuy.Core.Tests/PetHomesTests.cs
Weryfikacja: dotnet test tests/Cuy.Core.Tests/Cuy.Core.Tests.csproj -c Release
Pytania: nie zadawaj pytań i nie czekaj na odpowiedź. Jeśli czegoś brakuje lub coś jest niejasne, sam wybierz najrozsądniejsze rozwiązanie zgodne z AGENTS.md, zapisz decyzję w opisie PR i dokończ zadanie do końca.
Nie ruszaj: src/Cuy/*, AGENTS.md, docs/*, tasks/*, assets/data/*
Goal: A pet can set a pig's home mode and read where each pig is now.
Depends on: W26 merged.
Facts: Add the flag `HomesActive` (bool, default false) to `Balance.cs`; it is switched on in W30-09, not here. Behind that flag. `SetHome(string pigId, string mode, string roomId)` validates: pig on the roster; mode `free` or `room`; for `room` the room is one the pig can use (its own room, a common room that is unlocked, or the dorm when it is a resident). `LocationOf(string pigId)` uses `PigWander.Where` with the pet's clock. `IReadOnlyList<(string pigId,string room,string activity)> Locations()` for the page. Memorial pigs are always shown in their memory room and never wander. Test rules: use `RepoFile(...)` for repo files, inject tables and `Random`/clock instead of assigning statics (`Current`), keep tests deterministic.
Steps:
1. Implement the three methods and the flag.
2. Tests: default mode is free; set tied then read the location; invalid room refused; a dorm resident cannot be tied to a room it cannot use; memorial pig always in its memory room; flag off returns the pig's own room for everybody.
Prohibited: changing or deleting existing test assertions, new dependencies, touching files outside "Zmieniaj". Names and signatures from earlier waves are given as planned. If the real code differs, use the real code, list each difference in the PR, and continue (do not stop, nobody will answer).
PR: what was done, decisions and why, how to check by hand.
