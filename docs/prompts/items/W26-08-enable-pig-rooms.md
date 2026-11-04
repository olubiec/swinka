# W26-08: GameSession.Open switches pig rooms and the dorm on
Zmieniaj: src/Cuy.Core/GameSession.cs, tests/Cuy.Core.Tests/GameSessionPigRoomsTests.cs
Wymagane: tests/Cuy.Core.Tests/GameSessionPigRoomsTests.cs
Weryfikacja: dotnet test tests/Cuy.Core.Tests/Cuy.Core.Tests.csproj -c Release
Pytania: nie zadawaj pytań i nie czekaj na odpowiedź. Jeśli czegoś brakuje lub coś jest niejasne, sam wybierz najrozsądniejsze rozwiązanie zgodne z AGENTS.md, zapisz decyzję w opisie PR i dokończ zadanie do końca.
Nie ruszaj: src/Cuy/*, AGENTS.md, docs/*, tasks/*
Goal: Pig rooms and the shared bedroom become active in the real game.
Depends on: W25 merged and W26-01..03 merged earlier in this wave are not required (the flags only switch on code that exists since W24). Sub-wave W26c: start only after W26-02 is merged (this task uses their code).
Facts: Add `PigRoomsActive` and `DormActive` to the flags in `GameSession.Open` (both branches), call `AttachPigRooms()` and `State.EnsurePigRooms(...)` after `EnsureWorld`. Existing tests must keep passing; record any that break only because of the flags. Test rules: use `RepoFile(...)` for repo files, inject tables and `Random`/clock instead of assigning statics (`Current`), keep tests deterministic.
Steps:
1. Implement.
2. Tests: a new session has both flags true; a new game with the two starter pigs has two rooms with their themes; an old save with three pigs gets three rooms; reopening creates nothing new; adopting another pig creates its room.
Prohibited: changing or deleting existing test assertions, new dependencies, touching files outside "Zmieniaj". Names and signatures from earlier waves are given as planned. If the real code differs, use the real code, list each difference in the PR, and continue (do not stop, nobody will answer).
PR: what was done, decisions and why, how to check by hand.
