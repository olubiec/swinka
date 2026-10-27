# W2-04: Hay rack eats while the game runs and while the PC is off
Goal: in the real app the pig eats from the hay rack by itself, online and in the offline catch-up, while existing tests keep their numbers.
Depends on: W1-07 (`Pet.ConsumeHay`, `Pet.HayTable`, `GameState.HayRack`) merged. Offline decay already uses a multiplier of 1/3 with a floor of 20 (`actions.json` `offline`, `OfflineRulesTests.cs`): do not change that.
Why a flag: new pets start with a rack of 60, so an unconditional hook would change the fullness numbers that existing tests (NeedsDecay, OfflineRules, Events ...) assert. Follow the `Balance.GrowthActive` pattern: the feature is off in `new Balance()` and switched on where the app creates its session.
Change: `src/Cuy.Core/Pet.cs` (one call in `ApplyTime`), `src/Cuy.Core/Balance.cs` (one property), `src/Cuy.Core/GameSession.cs` (one line in `Open`), `assets/data/simulation.json` (one scenario), new `tests/Cuy.Core.Tests/HayRackHookTests.cs`
Do not touch: everything not listed under Change; in particular `AGENTS.md`, `docs/PLAN.md`, `tasks/*`. Another task of this wave (W2-08) changes a different place in `Pet.cs` (`AddBondPoints`): keep your diff to your own lines, no reformatting.
Steps:
1. `Balance.HayRackActive` (bool, default `false`, XML comment: "the pig eats from the hay rack; the app turns it on in GameSession.Open").
2. `GameSession.Open`: when the `balance` parameter is null create `new Balance { HayRackActive = true }` (a caller-supplied balance is used unchanged).
3. `Pet.ApplyTime(TimeSpan span, bool offline)` is the single place where both `Update()` (online, or an offline gap) and `Start()` (offline catch-up) pass time. Add at its top: `if (Balance.HayRackActive) ConsumeHay(span.TotalHours, offline);` so the hay raises fullness before the needs decay is applied. Change nothing else in `Pet.cs`.
4. Simulation scenario in `simulation.json`: 7 days, the rack refilled 3 times a day; expected fullness stays above 70 (read how the other scenarios are written and asserted and follow them; if no test runs the scenarios, run it from your test file with `HayRackActive = true`).
5. Tests (`HayRackActive = true` only inside these tests): online time raises fullness and lowers the rack; an offline catch-up uses the slower rate; an empty rack leaves the needs equal to a pig with the flag off; with the default `new Balance()` the rack never changes (this proves the old tests are unaffected); `GameSession.Open(clock, tempDir)` gives a pet whose `Balance.HayRackActive` is true; the 7-day scenario; all existing tests stay green.
Verify: `dotnet test tests/Cuy.Core.Tests/Cuy.Core.Tests.csproj -c Release` passes.
Prohibited: changing or deleting existing test assertions, new dependencies, touching files outside "Change".
PR: what was done, decisions and why, how to check by hand; screenshot if the change is visual.
