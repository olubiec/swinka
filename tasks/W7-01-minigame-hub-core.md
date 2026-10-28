# W7-01: Minigame hub: play counters and the result data (Core + Home state)
Zmieniaj: src/Cuy.Core/Pet.cs, src/Cuy.Core/GameState.Minigames.cs, src/Cuy.Core/Pet.Minigames.cs, tests/Cuy.Core.Tests/MinigameHubTests.cs, src/Cuy/dotNet/HomeWindow.cs
Wymagane: src/Cuy.Core/GameState.Minigames.cs, tests/Cuy.Core.Tests/MinigameHubTests.cs
Weryfikacja: dotnet test tests/Cuy.Core.Tests/Cuy.Core.Tests.csproj -c Release; dotnet build src/Cuy/Cuy.csproj -c Release -p:EnableWindowsTargeting=true
Nie ruszaj: web/home/*, AGENTS.md, docs/PLAN.md, tasks/*
Goal: Home can show an honest minigame hub: how many rewarded games are left today, per-game play counts, and exactly what the last game paid.
Depends on: nothing from earlier waves. The existing rules stay: clovers = min(MaxPerGame, score / PointsPerClover), mood +15 for a rewarded game, +3 over the daily limit, 0 for score 0, daily limit `EconomyConfig.Current.Minigame.RewardedGamesPerDay`.
Facts: `Pet.RecordMinigameResult(gameId, score, out clovers, out isNewRecord)` (in `Pet.cs`) updates `State.HighScores`, `MinigamesDailyDate/Count` and counters. `HomeWindow.HandleMinigameResult` calls it. The page state key today is `minigames: { records, dailyRewardedDate, dailyRewardedCount }` (keep these names; the older contract text with `highScores` is wrong). Contract after this task, used by the W5-08 mock and the W7-02 UI: `minigames: { records: {id: score}, dailyRewardedDate, dailyRewardedCount, dailyMax, plays: {id: n}, lastResult: { gameId, score, clovers, mood, isNewRecord, rewarded } | null }`.
Steps:
1. `GameState.Minigames.cs` (partial): `MinigamePlays` (`Dictionary<string,int>`, default empty, null-safe; old saves load).
2. `Pet.Minigames.cs`: `MinigameResult` (class with Clovers, Mood, IsNewRecord, Rewarded, GameId, Score) and `public MinigameResult LastMinigameResult { get; }` (not saved).
3. `Pet.cs`: only inside `RecordMinigameResult`: increment `MinigamePlays[gameId]` and fill `LastMinigameResult` (mood is 15 for a rewarded game, 3 over the limit, 0 for score 0, as the code already computes). Nothing else changes; existing numbers stay.
4. `HomeWindow.SendStateToWebView`: extend the `minigames` object with `dailyMax`, `plays` and `lastResult` (null until a game was played in this run). `HandleMinigameResult` needs no change: the state push after a handled message already happens.
5. Tests: plays counter per game; the first rewarded game of the day vs the 11th (clovers 0 over the limit, mood 3); score 0 gives no mood and no clovers; `LastMinigameResult` matches the out values; save and load keeps `MinigamePlays`.
Prohibited: changing or deleting existing test assertions, new dependencies, touching files outside "Zmieniaj". Names and signatures from earlier waves are given as planned. If the real code differs, use the real code, list each difference in the PR, and continue (do not stop, nobody will answer).
PR: what was done, decisions and why, how to check by hand.
