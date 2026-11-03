# W26-02: Pet.Dorm: unlock, move in and out, levels
Zmieniaj: src/Cuy.Core/Pet.Dorm.cs, tests/Cuy.Core.Tests/PetDormTests.cs
Wymagane: src/Cuy.Core/Pet.Dorm.cs, tests/Cuy.Core.Tests/PetDormTests.cs
Weryfikacja: dotnet test tests/Cuy.Core.Tests/Cuy.Core.Tests.csproj -c Release
Pytania: nie zadawaj pytań i nie czekaj na odpowiedź. Jeśli czegoś brakuje lub coś jest niejasne, sam wybierz najrozsądniejsze rozwiązanie zgodne z AGENTS.md, zapisz decyzję w opisie PR i dokończ zadanie do końca.
Nie ruszaj: src/Cuy/*, AGENTS.md, docs/*, tasks/*, assets/data/*
Goal: A pet can unlock and upgrade the shared bedroom and move pigs in and out.
Depends on: W25 merged. Uses W26-01 (same wave) through planned names.
Facts: Behind `Balance.DormActive` (and `PigRoomsActive`). `PlaceUnlock.CanUnlockRoom('dorm', nonMemorialPigs)` (W23-05) decides; spend with `TrySpendClovers`; counter `dorm_unlocked`; event `RoomUnlocked`-style event like W18-01 (`PlaceUnlockedEventArgs('dorm')`). `UpgradeDorm()` uses `PlaceUnlock.Upgrade`. `MoveIn(ids)` / `MoveOut(id)` call `SharedRoomOps`; diary line via the templates of W24-06. Bond bonus: expose `double DormBondBonus(string pigId)` (= `Dorm.BondGainBonus` when the pig is a resident and at least one other resident is not memorial, else 0) for the bond code (W14-01 `Pet` bond gain) to add as a multiplier; do not edit `Pet.cs`, list the missing call in the PR. Test rules: use `RepoFile(...)` for repo files, inject tables and `Random`/clock instead of assigning statics (`Current`), keep tests deterministic.
Steps:
1. `WorldResult UnlockDorm()`, `WorldResult UpgradeDorm()`, `MoveResult MoveIn(IReadOnlyList<string>)`, `bool MoveOut(string)`, `double DormBondBonus(string)`.
2. Tests: unlock fails with one pig, with 1499 clovers and succeeds at 1500; counter and achievement `shared_nest` pay once; upgrade costs 1100 then 1800 then max; move in and out round trip; bonus only for residents with a non-memorial roommate; flags off disable everything.
Prohibited: changing or deleting existing test assertions, new dependencies, touching files outside "Zmieniaj". Names and signatures from earlier waves are given as planned. If the real code differs, use the real code, list each difference in the PR, and continue (do not stop, nobody will answer).
PR: what was done, decisions and why, how to check by hand.
