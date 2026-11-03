# W23-05: Rooms of pigs and the shared bedroom in PlaceCatalog and PlaceUnlock
Zmieniaj: src/Cuy.Core/World/PlaceCatalog.cs, src/Cuy.Core/World/PlaceUnlock.cs, tests/Cuy.Core.Tests/PigRoomLevelsTests.cs
Wymagane: tests/Cuy.Core.Tests/PigRoomLevelsTests.cs
Weryfikacja: dotnet test tests/Cuy.Core.Tests/Cuy.Core.Tests.csproj -c Release
Pytania: nie zadawaj pytań i nie czekaj na odpowiedź. Jeśli czegoś brakuje lub coś jest niejasne, sam wybierz najrozsądniejsze rozwiązanie zgodne z AGENTS.md, zapisz decyzję w opisie PR i dokończ zadanie do końca.
Nie ruszaj: src/Cuy/*, AGENTS.md, docs/*, tasks/*, assets/data/*
Goal: `GridSize`, `NextLevelCost`, `Upgrade` and room lookup work for `pig:<id>` rooms and for `dorm`.
Depends on: W22 merged; W23-01 in this wave defines `PigRoomConfig` (use the planned API).
Facts: Today `PlaceCatalog.FindRoom` only knows rooms written in `places.json` and `PlaceUnlock` works on those. Add: `PlaceCatalog.PigRooms` (a `PigRoomConfig`, lazy default, settable for tests), `ResolveRoom(string id)` returning a `RoomDefinition` for `salon/bedroom/playroom` as before, for `pig:<id>` (template levels, `UnlockedAtStart` true because the room is created by `EnsureRoom`) and for `dorm` (dorm levels, locked until unlocked by the Pet). `PlaceUnlock.GridSize`, `NextLevelCost`, `Upgrade` use `ResolveRoom`. Levels live in `WorldState.PlaceLevels[roomId]` like for the other rooms. `PlaceUnlock.CanUnlockRoom('dorm')` returns `Ok` only when the caller passes the pig count (new optional parameter `int nonMemorialPigs = 0`), enough pigs (`RequiresPigs`) and not yet unlocked; cost = `Dorm.UnlockCost`. No existing behaviour or test may change. Test rules: use `RepoFile(...)` for repo files, inject tables and `Random`/clock instead of assigning statics (`Current`), keep tests deterministic.
Steps:
1. Implement as described; keep all public signatures source compatible (optional parameters only).
2. Tests: grid sizes of a pig room per level (10x6, 12x7, 14x8) and of the dorm (16x8, 20x9, 24x10); upgrade costs 400, 900 and then max; the dorm needs 2 pigs and 1500 clovers' worth cost value; unknown `pig:` ids with an empty name resolve (the pig may be unknown to the catalog) while `pig:` alone does not; salon behaviour unchanged.
Prohibited: changing or deleting existing test assertions, new dependencies, touching files outside "Zmieniaj". Names and signatures from earlier waves are given as planned. If the real code differs, use the real code, list each difference in the PR, and continue (do not stop, nobody will answer).
PR: what was done, decisions and why, how to check by hand.
