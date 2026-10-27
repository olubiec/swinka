# Task W2-03: Core: bond unlocks and hay rack

Read `AGENTS.md` first and follow it (its rules about assertions and the PR description apply to this task).
Requires: wave 1 merged.
Replaces old task(s): F4-05 (Core part), F4-06 (Core part). Older F-numbers inside the text below are the old ids; the mapping table is in `jules/PLAN.md`.

## Goal
Two small Core systems in one PR, both pure logic with tests, both new files only (no shared files, no UI; the UI for both is in W3-02).

## Files you may change
New only: `assets/data/bond.json`, `assets/data/hay.json`, `src/Cuy.Core/Bond/BondUnlocks.cs`, `src/Cuy.Core/Pet.Bond.cs`,
`src/Cuy.Core/GameState.Hay.cs`, `src/Cuy.Core/Pet.Hay.cs`, `tests/Cuy.Core.Tests/BondUnlockTests.cs`, `tests/Cuy.Core.Tests/HayRackTests.cs`;
`assets/data/simulation.json` only if you add a scenario; `src/Cuy/dotNet/InteractionManager.cs` (only step A3, two literals).
Do not touch `HomeWindow.cs`, `app.js`, `bridge.js` (W3-02 does that).

## Part A: Bond unlocks (from F4-05)

1. `bond.json`: `{ "levels": [ { "level": 2, "id": "approach_cursor", "title": "Comes to your cursor instead of running away" },
   { "level": 3, "id": "greet_on_start", "title": "Wheeks hello when you start the PC" }, { "level": 5, "id": "trick_spin" ... },
   { "level": 7, "id": "come_when_called" }, { "level": 9, "id": "trick_stand_up" }, { "level": 10, "id": "companion" },
   { "level": 12, "id": "trick_popcorn" }, { "level": 15, "id": "trick_hurdle" }, { "level": 20, "id": "golden_bowl" } ] }`
   (tricks match `actions.json` `events.tricks`: spin 5, stand_up 9, popcorn 12, hurdle 15).
2. Core: `Pet.IsUnlocked(string id)`, `Pet.NextUnlock()` (level, id, title or null), pure and tested.
3. `InteractionManager` greeting (`bond >= 3`) and call (`bond >= 7`) read `Pet.IsUnlocked("greet_on_start")` / `("come_when_called")` instead
   of literals (minimal edit, same behaviour). Level 20 gives the item `golden_bowl` once (in `items_shop.json` with price null if it exists, else `items.json`) and a diary line.
4. Tests: unlock table, `NextUnlock`, level 20 reward only once, save/load.

## Part B: Hay rack (from F4-06)

1. Numbers in `assets/data/hay.json`: `{ "max": 100, "refillAmount": 50, "eatPerGameHour": 6, "offlineEatPerHour": 2,
   "fullnessPerHayUnit": 0.5, "wheekBelow": 10 }`. Hay is free and unlimited, kept in a rack (stock 0-100).
2. `Pet.RefillHay()` adds `refillAmount` (capped at `max`); no clover cost, no reward (nothing happens at 100). `Pet.Update` (online) and the
   offline catch-up in `Start()` consume hay while `Fullness < 95`, raise fullness by `fullnessPerHayUnit` per unit; offline the rack gives at most enough
   to keep fullness at the offline floor. Offline decay keeps its multiplier 1/3 with floor 20 (`actions.json` `offline`, `OfflineRulesTests.cs`): do not change it.
3. `GameState.HayRack` (new property, default 60; old saves must load). Empty rack: only the state value changes (the `begging` action already reacts to fullness).
4. Tests: refill cap, online and offline consumption, never negative, old save defaults to 60, a 7-day scenario with 3 refills a day keeps fullness above 70
   (compare `simulation.json`).

## Checks

`dotnet test tests/Cuy.Core.Tests/Cuy.Core.Tests.csproj -c Release` passes (all old tests unchanged); `dotnet build src/Cuy/Cuy.csproj -c Release -p:EnableWindowsTargeting=true` passes.

When done, open a pull request against `main` titled `W2-03: Bond unlocks and hay rack (Core)`.
