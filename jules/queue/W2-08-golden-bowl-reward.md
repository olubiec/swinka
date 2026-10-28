Wykonaj to zadanie zgodnie z AGENTS.md (przeczytaj AGENTS.md najpierw). Jedno zadanie = jeden PR; tytuł PR = "<ID>: <tytuł>". Nie zadawaj pytań i nie zatrzymuj się. Jeśli coś jest niejasne, wybierz najprostsze rozwiązanie zgodne z plikiem zadania i AGENTS.md, a decyzję opisz w PR-ze w sekcji „Decisions”. Jeśli test nie przechodzi, znajdź przyczynę w kodzie i napraw ją w zakresie „Change”; nie zmieniaj asercji.

# W2-08: Bond level 20 gives the golden bowl once
Goal: when the bond reaches level 20 the pig gets the `golden_bowl` once, with a diary line, also after an offline level jump and never twice.
Depends on: W1-06 (`Pet.Bond.cs`, `bond.json` row `golden_bowl` at level 20) and W1-11 (earlier edits of `items_shop.json`) merged. `Pet.LevelUp` is raised inside `Pet.AddBondPoints` (`Pet.cs`).
Change: `src/Cuy.Core/Pet.Bond.cs`, `src/Cuy.Core/Pet.cs` (one call in `AddBondPoints`), `assets/data/items_shop.json` (one item), new `tests/Cuy.Core.Tests/BondRewardTests.cs`
Do not touch: everything not listed under Change; in particular `AGENTS.md`, `docs/PLAN.md`, `tasks/*`. Another task of this wave (W2-04) changes a different place in `Pet.cs` (`ApplyTime`): keep your diff to your own line, no reformatting.
Steps:
1. `items_shop.json`: add `golden_bowl`: no `price` (cannot be bought), `"permanent": true`, category `equipment`, closest existing icon (say which in the PR), a mood effect, description "A gift for a very close friendship."
2. `Pet.Bond.cs`: `private void OnBondLevelUp(int newLevel)`; for every level reached it checks the unlock table: when `BondTable` (or `BondUnlocks.Current`) has `golden_bowl` at exactly `newLevel`, and the counter `golden_bowl_granted` (use `Count`/`State.Stats.Counters`) is 0, it calls `AddItem("golden_bowl")`, `Count("golden_bowl_granted")` and `AddDiaryEntry("Level 20! My human gave me a golden bowl.")`.
3. `Pet.cs`: in the `while (bond.Level < newLevel)` loop of `AddBondPoints`, after `Raise(LevelUp, ...)`, call `OnBondLevelUp(bond.Level);`. Nothing else changes.
4. Tests: reaching level 20 in one call grants the bowl once, adds one diary line and keeps `Inventory["golden_bowl"] == 1`; a big jump from level 3 to 20 (many points in one go, respecting the daily limit: use several simulated days with `ManualClock`) grants it once; points after level 20 do not grant it again; a save/load round trip does not grant it again; levels below 20 grant nothing; the item loads from the real `items_shop.json` (`RepoFile`) and `CanBuy` is false.
Verify: `dotnet test tests/Cuy.Core.Tests/Cuy.Core.Tests.csproj -c Release` passes.
Prohibited: changing or deleting existing test assertions, new dependencies, touching files outside "Change".
PR: what was done, decisions and why, how to check by hand; screenshot if the change is visual.
