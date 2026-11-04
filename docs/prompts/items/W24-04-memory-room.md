# W24-04: Memorial pigs keep their room as a memory room
Zmieniaj: src/Cuy.Core/Pet.MemoryRoom.cs, tests/Cuy.Core.Tests/PetMemoryRoomTests.cs
Wymagane: src/Cuy.Core/Pet.MemoryRoom.cs, tests/Cuy.Core.Tests/PetMemoryRoomTests.cs
Weryfikacja: dotnet test tests/Cuy.Core.Tests/Cuy.Core.Tests.csproj -c Release
Pytania: nie zadawaj pytań i nie czekaj na odpowiedź. Jeśli czegoś brakuje lub coś jest niejasne, sam wybierz najrozsądniejsze rozwiązanie zgodne z AGENTS.md, zapisz decyzję w opisie PR i dokończ zadanie do końca.
Nie ruszaj: src/Cuy/*, AGENTS.md, docs/*, tasks/*, assets/data/*
Goal: A pig in memorial mode keeps its room, shown as a memory room, without comfort effects.
Depends on: W23 merged. Sub-wave W24a: no dependency on other tasks of the wave.
Facts: Design: docs/PIG_ROOMS.md section 5 (sensitive topic: the pigs of the owner's partner; wording is warm and quiet, never says dead or died). `SetMemorial` exists in `Pet.Adoption.cs` (W13-03). When a pig turns memorial: its room stays editable, `RoomDisplayName(pigId)` returns `NameFor(name, memorial: true)` (default 'Kuki's memory room') unless the player renamed it, comfort counts for no pig (W23-03 returns factor 1.0 for memorial), and the memory corner in the garden lists the pig (already W18-07). Turning memorial off again (the player can) restores the normal name. Never delete a room or its items. Test rules: use `RepoFile(...)` for repo files, inject tables and `Random`/clock instead of assigning statics (`Current`), keep tests deterministic.
Steps:
1. `string RoomDisplayName(string pigId)`, `bool IsMemoryRoom(string roomId)`, and a handler `OnMemorialChanged(string pigId, bool memorial)` subscribed from `AttachPigRooms` (W24-01 exposes it; if it does not exist yet, expose a public method and list the missing call in the PR).
2. Tests: names normal and memorial; a custom name wins over the template; the room and all items survive both directions; no negative strings in the output (check the text does not contain 'dead', 'died', 'death').
Prohibited: changing or deleting existing test assertions, new dependencies, touching files outside "Zmieniaj". Names and signatures from earlier waves are given as planned. If the real code differs, use the real code, list each difference in the PR, and continue (do not stop, nobody will answer).
PR: what was done, decisions and why, how to check by hand.
