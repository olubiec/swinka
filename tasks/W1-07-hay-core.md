# W1-07: Hay rack (Core): stock, refill and consumption
Goal: a hay rack holds 0-100 hay, the player refills it for free and Core can consume it online and offline.
Depends on: nothing (wave start). Offline decay already uses a multiplier of 1/3 with a floor of 20 (`actions.json` `offline`, `OfflineRulesTests.cs`): do not change that.
Change: new `assets/data/hay.json`, new `src/Cuy.Core/GameState.Hay.cs`, new `src/Cuy.Core/Pet.Hay.cs`, new `tests/Cuy.Core.Tests/HayRackTests.cs`
Do not touch: everything not listed under Change; in particular `AGENTS.md`, `docs/PLAN.md`, `tasks/*`.
Steps:
1. `hay.json`: `{ "max": 100, "refillAmount": 50, "eatPerGameHour": 6, "offlineEatPerHour": 2, "fullnessPerHayUnit": 0.5, "wheekBelow": 10 }`; loaded like `EconomyConfig` (JSON string from the caller).
2. `GameState.Hay.cs`: `public sealed partial class GameState` with one property `HayRack` (double, default 60; old saves must load).
3. `Pet.RefillHay()` adds `refillAmount`, capped at `max`; no clover cost and no reward (nothing happens at 100). `Pet.ConsumeHay(double gameHours, bool offline)`: while `Fullness < 95` consume hay and raise fullness by `fullnessPerHayUnit` per unit; offline it gives at most enough to hold fullness at the offline floor; the stock never goes negative. Do NOT call these from `Pet.Update` or `Start` yet (W2-04 does).
4. Tests: refill and the cap, consumption online and offline, never negative, an old save without the property loads with 60, save/load round trip.
Verify: `dotnet test tests/Cuy.Core.Tests/Cuy.Core.Tests.csproj -c Release` passes.
Prohibited: changing or deleting existing test assertions, new dependencies, touching files outside "Change".
PR: what was done, decisions and why, how to check by hand; screenshot if the change is visual.
