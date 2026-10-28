# W8-08: Final balance pass: a 60-day simulation of the whole game
Zmieniaj: tools/Cuy.Simulator/Program.cs, docs/economy-report.md, assets/data/economy.json, assets/data/bond.json, assets/data/hay.json, assets/data/tricks.json, assets/data/achievements.json, assets/data/items_shop.json, assets/data/items_decor.json, assets/data/simulation.json, tests/Cuy.Core.Tests/
Wymagane: tools/Cuy.Simulator/Program.cs, docs/economy-report.md
Weryfikacja: dotnet run --project tools/Cuy.Simulator -- --full; dotnet test tests/Cuy.Core.Tests/Cuy.Core.Tests.csproj -c Release
Nie ruszaj: src/Cuy.Core/*, AGENTS.md, docs/PLAN.md, tasks/*
Goal: The economy, bond growth and life-stage pacing hold up over 60 days with every income source switched on.
Depends on: all earlier waves merged. `docs/economy-report.md` exists but is empty today.
Facts: New income and costs since the first balance pass: birthday reward and cake, tricks (bond points), three minigames up to the daily cap, diary, achievements, hay rack, golden bowl at bond level 20. The simulator already fast-forwards days on `ManualClock` with the real `SaveSystem` (`Program.cs`).
Steps:
1. Add `--full` (60 days): three profiles (casual, regular, heavy) that also play minigames up to the daily cap, perform every unlocked trick once a day, claim the daily gift, refill the hay rack 3 times a day and read achievements through `CheckAchievements()`.
2. Write `docs/economy-report.md` (English): life stage per day (Baby to Junior to Adult by about day 9); birthdays and their income; bond level by day per profile (targets: regular reaches level 5 by day 7 and level 10 by day 20, heavy reaches level 10 by day 12); clovers per day by source; the share of income from minigames (must stay below 50 % for the regular profile); total spending; any day with zero clovers and no food.
3. Tune numbers in the data files only where a target is missed, each change at most +-40 %, with a before/after table in the report. Raise sinks before cutting income. State every cost as days of play. Update tests that assert old numbers and list them in the PR (never loosen an assertion without saying why).
4. No-exploit check: a script that triggers every action as fast as possible for one simulated hour must not exceed the documented daily caps; list the caps found in the report.
Prohibited: changing or deleting existing test assertions, new dependencies, touching files outside "Zmieniaj". Names and signatures from earlier waves are given as planned. If the real code differs, use the real code, list each difference in the PR, and continue (do not stop, nobody will answer).
PR: what was done, decisions and why, how to check by hand; paste the `--full` output; the chosen achievement-reward-to-daily-income ratio and why..
