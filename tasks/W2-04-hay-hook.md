# W2-04: Hay rack eats while the game runs and while the PC is off
Goal: the pig eats from the hay rack by itself, online and in the offline catch-up.
Depends on: W1-07 (hay core) merged.
Change: `src/Cuy.Core/Pet.cs`, new `tests/Cuy.Core.Tests/HayRackHookTests.cs`, `assets/data/simulation.json` (one scenario)
Do not touch: everything not listed under Change; in particular `AGENTS.md`, `docs/PLAN.md`, `tasks/*`.
Steps:
1. In `Pet.Update` call `ConsumeHay(gameHoursElapsed, false)`; in the offline catch-up in `Pet.Start()` call `ConsumeHay(offlineHours, true)` before the existing offline decay is applied. Change nothing else in `Pet.cs`.
2. Add a simulation scenario to `simulation.json`: 7 days, hay refilled 3 times a day; expected fullness stays above 70 (compare how other scenarios are asserted).
3. Tests: online consumption raises fullness and lowers the rack; offline consumption respects the offline floor; an empty rack changes nothing else; the 7-day scenario; existing `OfflineRulesTests` untouched and green.
Verify: `dotnet test tests/Cuy.Core.Tests/Cuy.Core.Tests.csproj -c Release` passes.
Prohibited: changing or deleting existing test assertions, new dependencies, touching files outside "Change".
PR: what was done, decisions and why, how to check by hand; screenshot if the change is visual.
