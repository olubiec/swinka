# W24-05: GameState.PigRooms: rooms for old saves
Zmieniaj: src/Cuy.Core/GameState.PigRooms.cs, tests/Cuy.Core.Tests/PigRoomsMigrationTests.cs
Wymagane: src/Cuy.Core/GameState.PigRooms.cs, tests/Cuy.Core.Tests/PigRoomsMigrationTests.cs
Weryfikacja: dotnet test tests/Cuy.Core.Tests/Cuy.Core.Tests.csproj -c Release
Pytania: nie zadawaj pytań i nie czekaj na odpowiedź. Jeśli czegoś brakuje lub coś jest niejasne, sam wybierz najrozsądniejsze rozwiązanie zgodne z AGENTS.md, zapisz decyzję w opisie PR i dokończ zadanie do końca.
Nie ruszaj: src/Cuy/*, AGENTS.md, docs/*, tasks/*, assets/data/*
Goal: Opening any save creates the missing pig rooms and loses nothing.
Depends on: W23 merged. Sub-wave W24a: no dependency on other tasks of the wave.
Facts: Like `GameState.World.cs` (`EnsureWorld`): `public int EnsurePigRooms(PigRoomConfig, WorldItemCatalog, ...)` creates rooms for every roster pig that has none (uses `PigRoomOps`), returns how many it created. Called by the session in W26-08, here only tested. Do not bump `GameState.CurrentVersion`. Test rules: use `RepoFile(...)` for repo files, inject tables and `Random`/clock instead of assigning statics (`Current`), keep tests deterministic.
Steps:
1. Implement idempotently.
2. Tests: a state with 3 roster pigs (one memorial) gets 3 rooms; a second call returns 0; an old save JSON (fixtures) loads and works; existing salon layouts and `Decor` are untouched; the pre-World save without `World` works after `EnsureWorld` then `EnsurePigRooms`.
Prohibited: changing or deleting existing test assertions, new dependencies, touching files outside "Zmieniaj". Names and signatures from earlier waves are given as planned. If the real code differs, use the real code, list each difference in the PR, and continue (do not stop, nobody will answer).
PR: what was done, decisions and why, how to check by hand.
