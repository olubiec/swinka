# W1-06: Bond unlock table and queries (Core)
Goal: the pig's bond level unlocks named features through a data table that Core can query.
Depends on: nothing (wave start). `Bond` (level 1-20, points, daily limit 30) and `Pet.AddBondPoints` exist.
Change: new `assets/data/bond.json`, new `src/Cuy.Core/Bond/BondUnlocks.cs`, new `src/Cuy.Core/Pet.Bond.cs`, new `tests/Cuy.Core.Tests/BondUnlockTests.cs`
Do not touch: everything not listed under Change; in particular `AGENTS.md`, `docs/PLAN.md`, `tasks/*`.
Steps:
1. `bond.json`: `{ "levels": [ { "level": 2, "id": "approach_cursor", "title": "Comes to your cursor instead of running away" }, { "level": 3, "id": "greet_on_start", "title": "Wheeks hello when you start the PC" }, { "level": 5, "id": "trick_spin", ... }, { "level": 7, "id": "come_when_called", ... }, { "level": 9, "id": "trick_stand_up", ... }, { "level": 10, "id": "companion", ... }, { "level": 12, "id": "trick_popcorn", ... }, { "level": 15, "id": "trick_hurdle", ... }, { "level": 20, "id": "golden_bowl", ... } ] }` (trick levels match `actions.json` `events.tricks`).
2. `BondUnlocks` loads the table from a JSON string passed by the caller (same pattern as `EconomyConfig`, no file access in Core). `Pet.IsUnlocked(string id)` and `Pet.NextUnlock()` (level, id, title, or null at the end) in `Pet.Bond.cs`, pure and deterministic.
3. Tests: every level in the table; `IsUnlocked` before and after a level-up; `NextUnlock` in the middle, at level 19 and at level 20 (null); an unknown id is not unlocked; save/load keeps the level.
Verify: `dotnet test tests/Cuy.Core.Tests/Cuy.Core.Tests.csproj -c Release` passes.
Prohibited: changing or deleting existing test assertions, new dependencies, touching files outside "Change".
PR: what was done, decisions and why, how to check by hand; screenshot if the change is visual.
