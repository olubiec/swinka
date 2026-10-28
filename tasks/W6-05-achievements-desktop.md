# W6-05: Achievements on the desktop: state, evaluation tick and bubble
Zmieniaj: src/Cuy/dotNet/Features/AchievementsFeature.cs
Wymagane: src/Cuy/dotNet/Features/AchievementsFeature.cs
Weryfikacja: dotnet build src/Cuy/Cuy.csproj -c Release -p:EnableWindowsTargeting=true; dotnet test tests/Cuy.Core.Tests/Cuy.Core.Tests.csproj -c Release
Nie ruszaj: src/Cuy.Core/*, src/Cuy/dotNet/BrainController.cs, src/Cuy/dotNet/HomeWindow.cs, AGENTS.md, docs/PLAN.md, tasks/*
Goal: Achievements are checked while the app runs, the pig announces a new one once, and Home gets the list.
Depends on: W4-07 (`Pet.CheckAchievements()`, `GetAchievements()`, `AchievementEarned`), W4-08 (`FormPet.ShowStatusMessage`) merged.
Facts: `HomeFeatureBase` has `Tick(TimeSpan gameElapsed, BrainController brain)`, `AddState`, `HandleMessage`. Contract (also used by the W5-08 mock and the W6-07 screen): state key `achievements: [ { id, title, text, category, reward, earned, date, hidden } ]`, `date` as `yyyy-MM-dd` or null.
Steps:
1. `AchievementsFeature` (`Id = "achievements"`): `AddState` maps `Pet.GetAchievements()` to the list above.
2. `Tick`: call `Pet.CheckAchievements()` at most every 5 real seconds. For each newly earned achievement show `FormPet.ShowStatusMessage("Achievement: <title> +<reward> clovers", 4500)` once, push a page toast when Home is open, and save the game (`Session.AutoSaver.SaveNow()`). Never show the same achievement twice (Core grants once; do not keep your own list).
3. Log `[Achievement] <id> +<reward>`. No achievement logic in this file beyond calling Core.
Prohibited: changing or deleting existing test assertions, new dependencies, touching files outside "Zmieniaj". Names and signatures from earlier waves are given as planned. If the real code differs, use the real code, list each difference in the PR, and continue (do not stop, nobody will answer).
PR: what was done, decisions and why, how to check by hand.
