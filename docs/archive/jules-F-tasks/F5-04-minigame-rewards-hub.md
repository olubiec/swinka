# Task F5-04: Minigame rewards, daily limit display and records for all games

Read `AGENTS.md` first and follow it. Requires F4-08 merged.

## Goal
The shared result screen and Core rules exist (`Pet.RecordMinigameResult`: clovers = min(40, points / 10), mood +15 for
rewarded games, +3 over the daily limit, 0 for score 0; `GameState.HighScores`, `MinigamesDailyCount`). Make the
hub honest and fun now that there are several games.

## Files you may change
`web/home/minigames/minigames-api.js`, `web/home/app.js` (games screen only), `web/home/style.css`,
`web/home/bridge.js` (mock), `src/Cuy/dotNet/HomeWindow.cs` (state fields only), `src/Cuy.Core/Pet.cs` /
new `src/Cuy.Core/Pet.Minigames.cs` (read-only helpers), `tests/Cuy.Core.Tests/MinigameRewardTests.cs`.

## Specification
1. State key `minigames`: `{ "dailyCount": 3, "dailyMax": 10, "highScores": { "veggie_rain": 140 }, "plays": { "veggie_rain": 6 } }`.
   Add the play counter (`GameState.MinigamePlays`, new property with default empty dictionary via a partial file).
2. Hub header: "Rewarded games today 3 / 10" with 10 small paw/clover dots. When the limit is reached, a tile note
   "Over the daily limit: only a little mood" (no reward claims).
3. Result screen: shows points, the record (with "New record!" flash), clovers earned, mood gained (from the Core result,
   not recomputed in JS), and two buttons Play again / Back. Never show a reward when the Core returned 0.
4. Per game "How to play" one-liner (from `desc`) shown on a first-play overlay (remember in `localStorage` in try/catch).
5. Unit tests for the new counter and for the first game of the day vs the 11th.

## Checks
`dotnet test ... -c Release`, `node --check`, smoke test, Cuy.csproj builds.

When done, open a pull request against `main` titled `F5-04: Minigame hub and results`.
