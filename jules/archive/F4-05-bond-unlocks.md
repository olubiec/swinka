# Task F4-05: Bond levels with real unlocks (Core + Home display)

Read `AGENTS.md` first and follow it. Requires waves 0-3 merged.

## Goal
`Bond` (level 1-20, points, daily limit 30 from `Balance`) and `Pet.AddBondPoints` exist; `LevelUp` fires. The level
unlocks nothing yet. Add the unlock table from the original plan and show it.

## Files you may change
New: `assets/data/bond.json`, `src/Cuy.Core/Bond/BondUnlocks.cs`, `src/Cuy.Core/Pet.Bond.cs`,
`tests/Cuy.Core.Tests/BondUnlockTests.cs`; `src/Cuy/dotNet/HomeWindow.cs` (state only), `web/home/app.js` + `style.css`
(small bond bar under the name), `web/home/bridge.js` (mock).

## Specification
1. `bond.json`: `{ "levels": [ { "level": 2, "id": "approach_cursor", "title": "Comes to your cursor instead of running away" },
   { "level": 3, "id": "greet_on_start", "title": "Wheeks hello when you start the PC" }, { "level": 5, "id": "trick_spin" ... },
   { "level": 7, "id": "come_when_called" }, { "level": 9, "id": "trick_stand_up" }, { "level": 10, "id": "companion" },
   { "level": 12, "id": "trick_popcorn" }, { "level": 15, "id": "trick_hurdle" }, { "level": 20, "id": "golden_bowl" } ] }`
   (levels for tricks match `actions.json` `events.tricks`: spin 5, stand_up 9, popcorn 12, hurdle 15).
2. Core: `Pet.IsUnlocked(string id)`, `Pet.NextUnlock()` (level, id, title or null), pure and tested.
3. Use the unlocks where the desktop already checks bond levels: `InteractionManager` greeting (`bond >= 3`) and call
   (`bond >= 7`) must read `Pet.IsUnlocked("greet_on_start")` / `("come_when_called")` instead of literals
   (minimal edit, keep behaviour). Level 20 gives the item `golden_bowl` once (add it to `assets/data/items_shop.json`
   only if F2-05 exists, otherwise to `items.json` with price null) and a diary line.
4. Home state key `bond`: `{ "level": 4, "points": 61, "pointsToNext": 24, "next": { "level": 5, "title": "..." }, "pointsToday": 12, "dailyLimit": 30 }`.
   UI: thin bar under the pig name "Bond 4", tooltip with the next unlock.
5. Tests: unlock table, `NextUnlock`, level 20 reward only once, save/load.

## Checks
`dotnet test ... -c Release` passes; `node --check` + `node tools/qa/web-smoke.js` pass; Cuy.csproj builds.

When done, open a pull request against `main` titled `F4-05: Bond unlocks`.
