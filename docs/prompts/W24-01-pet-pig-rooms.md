# W24-01: Pet.PigRooms: a room for every adopted pig
Zmieniaj: src/Cuy.Core/Pet.PigRooms.cs, tests/Cuy.Core.Tests/PetPigRoomsTests.cs
Wymagane: src/Cuy.Core/Pet.PigRooms.cs, tests/Cuy.Core.Tests/PetPigRoomsTests.cs
Weryfikacja: dotnet test tests/Cuy.Core.Tests/Cuy.Core.Tests.csproj -c Release
Pytania: nie zadawaj pytań i nie czekaj na odpowiedź. Jeśli czegoś brakuje lub coś jest niejasne, sam wybierz najrozsądniejsze rozwiązanie zgodne z AGENTS.md, zapisz decyzję w opisie PR i dokończ zadanie do końca.
Nie ruszaj: src/Cuy/*, AGENTS.md, docs/*, tasks/*, assets/data/*
Goal: The pet creates the room of a pig when it is adopted and keeps rooms in sync with the roster.
Depends on: W23 merged.
Facts: Behind `Balance.PigRoomsActive` (off: every method returns without doing anything). `Pet` is partial (pattern `Pet.Economy.cs`). The adoption code (W13-03, `Pet.Adoption.cs`) raises `PigAdopted` (planned event args with the pig id); subscribe in a method `AttachPigRooms()` that the session calls once (W24-05 tests it) instead of editing `Pet.Adoption.cs`. `EnsurePigRooms()` loops over the roster (`State.Pigs`), calls `PigRoomOps.EnsureRoom` with the pig's display name, `Memorial` flag and the position in the roster as `randomIndex`, adds the counter `pig_rooms_furnished` when a room reaches 6 placed items (check after each placement, hook documented for W24-03). Test rules: use `RepoFile(...)` for repo files, inject tables and `Random`/clock instead of assigning statics (`Current`), keep tests deterministic.
Steps:
1. Implement `AttachPigRooms`, `EnsurePigRooms`, `string RoomIdOf(string pigId)`.
2. Tests: with the flag on, adopting a pig creates its room once; adopting in memorial mode also creates it; `EnsurePigRooms` after loading a roster of three creates three rooms; flag off creates nothing; calling twice changes nothing.
Prohibited: changing or deleting existing test assertions, new dependencies, touching files outside "Zmieniaj". Names and signatures from earlier waves are given as planned. If the real code differs, use the real code, list each difference in the PR, and continue (do not stop, nobody will answer).
PR: what was done, decisions and why, how to check by hand.
