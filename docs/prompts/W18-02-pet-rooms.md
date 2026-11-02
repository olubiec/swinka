# W18-02: Pet.Rooms: buy, place, move and remove items; comfort in mood decay
Zmieniaj: src/Cuy.Core/Pet.Rooms.cs, tests/Cuy.Core.Tests/PetRoomsTests.cs
Wymagane: src/Cuy.Core/Pet.Rooms.cs, tests/Cuy.Core.Tests/PetRoomsTests.cs
Weryfikacja: dotnet test tests/Cuy.Core.Tests/Cuy.Core.Tests.csproj -c Release
Pytania: nie zadawaj pytań i nie czekaj na odpowiedź. Jeśli czegoś brakuje lub coś jest niejasne, sam wybierz najrozsądniejsze rozwiązanie zgodne z AGENTS.md, zapisz decyzję w opisie PR i dokończ zadanie do końca.
Nie ruszaj: src/Cuy/*, AGENTS.md, docs/*, tasks/*, src/Cuy.Core/Pet.cs
Goal: A pet can buy placeable items and arrange them; comfort slows the decay of mood.
Depends on: W17 merged.
Facts: Behind `Balance.WorldDecorActive`. Buying adds to `WorldState.OwnedItems` (price from the catalog, `free` items cost 0, `memory_corner` requires a memorial pig in the roster). Placing needs `owned - placed >= 1` except `repeatable` items (any number once owned). Uses `RoomLayoutOps` with the grid from `PlaceUnlock.GridSize`. Counter `items_placed` counts every successful placement. Mood decay: where the needs decay is applied (find `DecayPerHour` in `Pet`), multiply the Mood decay by `Comfort.MoodDecayFactor` when the flag is on; do this through one small hook method in this file plus the smallest possible call in `Pet.cs` only if unavoidable (then say so in the PR and keep the call to a single line). Test rules: use `RepoFile(...)` for repo files, inject tables and `Random`/clock instead of assigning statics (`Current`), keep tests deterministic.
Steps:
1. `BuyResult BuyItem(string id)`, `PlaceResult PlaceItem(string placeOrRoomId, string itemId, int x, int y, bool flip)`, `PlaceResult MoveItem(string place, string uid, int x, int y)`, `bool FlipItem(...)`, `bool RemoveItem(string place, string uid)`, `int ComfortScore()`.
2. Tests: buying twice a 1-per item and placing both; placing without owning is refused; a repeatable fence can be placed 10 times after one purchase; memory corner is refused without a memorial pig and free with one; `items_placed` counts; removing returns the item to the free pool; mood decay is 15 percent slower at the comfort cap in a 10-hour simulated decay and unchanged with the flag off.
Prohibited: changing or deleting existing test assertions, new dependencies, touching files outside "Zmieniaj". Names and signatures from earlier waves are given as planned. If the real code differs, use the real code, list each difference in the PR, and continue (do not stop, nobody will answer).
PR: what was done, decisions and why, how to check by hand.
