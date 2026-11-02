# W17-07: PlaceUnlock: requirements, costs and levels
Zmieniaj: src/Cuy.Core/World/PlaceUnlock.cs, tests/Cuy.Core.Tests/PlaceUnlockTests.cs
Wymagane: src/Cuy.Core/World/PlaceUnlock.cs, tests/Cuy.Core.Tests/PlaceUnlockTests.cs
Weryfikacja: dotnet test tests/Cuy.Core.Tests/Cuy.Core.Tests.csproj -c Release
Pytania: nie zadawaj pytań i nie czekaj na odpowiedź. Jeśli czegoś brakuje lub coś jest niejasne, sam wybierz najrozsądniejsze rozwiązanie zgodne z AGENTS.md, zapisz decyzję w opisie PR i dokończ zadanie do końca.
Nie ruszaj: src/Cuy/*, AGENTS.md, docs/*, tasks/*
Goal: A pure helper decides whether a place, room or level can be unlocked and what it costs.
Depends on: W16 merged.
Facts: Data: `places.json` (garden 400, farm 600 requires garden, park 1200 requires garden; rooms bedroom 470, playroom 660; levels per place/room). House/salon/market are unlocked at the start. Level of a place: 0 = locked, 1 = first grid, 2, 3 higher grids (levels list index + 1). Costs of levels are in the list. The helper mutates `WorldState` and returns the cost; the caller spends clovers. Test rules: use `RepoFile(...)` for repo files, inject tables and `Random`/clock instead of assigning statics (`Current`), keep tests deterministic.
Steps:
1. `static class PlaceUnlock`: `UnlockResult CanUnlock(WorldState, PlaceCatalog, string placeId)` (Ok, Unknown, AlreadyUnlocked, MissingRequirement), `int UnlockCost(...)`, `bool Unlock(...)`, `UnlockResult CanUnlockRoom(...)`/`UnlockRoom`, `int NextLevelCost(WorldState, PlaceCatalog, string placeOrRoomId)` (-1 at max), `bool Upgrade(...)`, `(int cols, int rows) GridSize(WorldState, PlaceCatalog, string placeOrRoomId)`.
2. Tests: the farm needs the garden; unlocking twice is refused; levels advance 1 -> 2 -> 3 for the salon with costs 530 and 1200 (read from the file), never beyond; grid sizes match the file for every level; unknown ids are refused; a fresh `WorldState` reports house, salon and market unlocked.
Prohibited: changing or deleting existing test assertions, new dependencies, touching files outside "Zmieniaj". Names and signatures from earlier waves are given as planned. If the real code differs, use the real code, list each difference in the PR, and continue (do not stop, nobody will answer).
PR: what was done, decisions and why, how to check by hand.
