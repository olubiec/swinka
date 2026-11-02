# W18-05: Pet.Walk: garden/park walk and the varied-diet bonus
Zmieniaj: src/Cuy.Core/Pet.Walk.cs, tests/Cuy.Core.Tests/PetWalkTests.cs
Wymagane: src/Cuy.Core/Pet.Walk.cs, tests/Cuy.Core.Tests/PetWalkTests.cs
Weryfikacja: dotnet test tests/Cuy.Core.Tests/Cuy.Core.Tests.csproj -c Release
Pytania: nie zadawaj pytań i nie czekaj na odpowiedź. Jeśli czegoś brakuje lub coś jest niejasne, sam wybierz najrozsądniejsze rozwiązanie zgodne z AGENTS.md, zapisz decyzję w opisie PR i dokończ zadanie do końca.
Nie ruszaj: src/Cuy/*, AGENTS.md, docs/*, tasks/*, src/Cuy.Core/Pet.cs, src/Cuy.Core/Economy/EconomyState.cs
Goal: A pig can go for a walk (humor bonus, limited per day) and a varied diet gives a small one-time mood bonus.
Depends on: W17 merged.
Facts: Design: docs/WORLD.md sections 3 and 4.1. Walk: up to `walk.per_day` (3) per local day, +`walk.mood` (6) mood, needs the garden or park unlocked and garden comfort >= `min_comfort_garden` (10); no clovers. Varied diet: when the third different vegetable (category `vegetable`) is fed in one local day, +5 mood once per day; hook into feeding by subscribing to the existing feed event, or add a public `OnFed(string itemId)` that the feeding code can call later (check how `Pet.Feed` raises events; do not edit `Pet.cs`: if no event exists, expose `OnFed` and list the missing call in the PR). Day tracking uses small in-memory plus `WorldState` fields: add `WalksToday` (int) and `WalkDate` (string) to `MarketState`? No - to `WorldState` as `WalksToday`/`WalkDate` and `FedVegToday` (HashSet) with the same pattern as `EconomyState.DayLocalDate`; since `WorldState.cs` is not in this task's files, keep the counters in a private nested `Dictionary` in this class and persist through `State.Stats.Counters` keys (`walks_today`, `walk_date_ordinal`) instead. Behind `PlacesActive`. Test rules: use `RepoFile(...)` for repo files, inject tables and `Random`/clock instead of assigning statics (`Current`), keep tests deterministic.
Steps:
1. `WalkResult Walk(string placeId)` (Ok, TooManyToday, PlaceLocked, NeedsComfort, Disabled), `void OnFed(string itemId)`, `int WalksLeftToday()`.
2. Tests: three walks then `TooManyToday`; a new local day resets; a locked garden refuses; comfort 9 refuses and 10 allows; mood rises by 6 capped at 100; three different vegetables in a day give +5 once, the fourth does nothing; a treat does not count.
Prohibited: changing or deleting existing test assertions, new dependencies, touching files outside "Zmieniaj". Names and signatures from earlier waves are given as planned. If the real code differs, use the real code, list each difference in the PR, and continue (do not stop, nobody will answer).
PR: what was done, decisions and why, how to check by hand.
