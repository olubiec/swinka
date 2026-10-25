# Task F1-06: Economy core – daily gift, daily caps, reward helpers (Cuy.Core + tests)

Read `AGENTS.md` first and follow it.

## Goal
Clovers are earned too easily and there is little to spend them on. This task builds the earning side in Cuy.Core with
fixed, tested rules (the spending side – new shop items, vet, decor – comes in later tasks). All numbers come from a new
data file so they can be tuned without code changes.

## Files you may change / add
new `assets/data/economy.json`, new `src/Cuy.Core/Economy/EconomyConfig.cs`, new `src/Cuy.Core/Economy/EconomyState.cs`,
new `src/Cuy.Core/GameState.Economy.cs`, new `src/Cuy.Core/Pet.Economy.cs`, `src/Cuy.Core/Pet.cs` (only
`RecordMinigameResult` and `CleanPoop`), `src/Cuy.Core/GameSession.cs` (one call for new games), new
`tests/Cuy.Core.Tests/EconomyTests.cs`. `GameState`, `Pet`, `Balance` are
already `partial`.

## Numbers (economy.json, these exact values)
```json
{
  "daily_gift":   { "base": 10, "per_streak_day": 5, "max": 50, "streak_resets_after_missed_days": 1 },
  "poop_clean":   { "clovers": 1 },
  "minigame":     { "points_per_clover": 10, "max_per_game": 40, "rewarded_games_per_day": 10, "max_clovers_per_day": 150 },
  "coloring":     { "cells_per_clover": 40, "min_per_picture": 5, "max_per_picture": 25, "rewarded_pictures_per_day": 5 },
  "care_task":    { "clovers": 5, "max_per_day": 6 },
  "starting_clovers": 30
}
```
Design target (write it as a comment block at the top of `EconomyConfig.cs`): an active player earns about 150-250
clovers a day (gift ~30, poops ~15, minigames up to 150, coloring ~50, real-life care tasks up to 30); daily food costs
~30-40; one-time items 60-1500 give goals for days or weeks.

## Specification
1. `EconomyConfig`: POCO matching the JSON (Newtonsoft attributes like other Core models), `Load(string json)`,
   `LoadDefault()` (searches `assets/data/economy.json` like `ItemCatalog.LoadDefault`; falls back to the defaults in code
   = the numbers above), and a static `Current` with a setter for tests.
2. `EconomyState` (saved): `LastGiftLocalDate` (string yyyy-MM-dd), `GiftStreak`, `DayLocalDate`, and per-day counters
   `MinigameCloversToday`, `ColoringRewardedToday`, `CareCloversToday` (reset when the local date changes). Add to
   `GameState.Economy.cs`: `public EconomyState Economy { get; set; } = new EconomyState();` New games start with
   `starting_clovers` (set in `GameState.CreateNew`? No – do not edit GameState.cs: apply it in `Pet.Economy.cs`
   via a method `ApplyNewGameEconomy()` that the session calls; document in the PR that `GameSession` must call it for new
   games, and DO add that one call in `src/Cuy.Core/GameSession.cs` where a new state is created).
3. `Pet.Economy.cs` (all use `Clock.LocalNow()`):
   - `DailyGiftInfo GetDailyGift()` → `{ Available, Amount, Streak }`. Streak = consecutive local days with a claimed
     gift; if the last claim was yesterday the streak continues, otherwise it restarts at 1. Amount = min(max,
     base + per_streak_day * (streak - 1)).
   - `int ClaimDailyGift()` → adds clovers, updates state, returns amount (0 if already claimed today). Raises the
     existing `DailyReward` event if there is one in `Events.cs`/`Pet` (look for `DailyRewardEventArgs`); otherwise add an
     event `DailyGiftClaimed`.
   - `int AwardColoring(int paintedCells)` → clovers = clamp(cells / cells_per_clover, min, max) while
     `ColoringRewardedToday < rewarded_pictures_per_day`, else 0.
   - `int AwardCareTask()` → `care_task.clovers` while `CareCloversToday + clovers <= max_per_day * clovers`, else 0.
   - `bool TryPay(int price, string reason)` → `TrySpendClovers` + `Count("spent_" + reason)` and
     `Count("spent_clovers", price)` if `Count` supports an amount (add an overload in Pet.Economy.cs if not).
4. `Pet.RecordMinigameResult`: keep current rules, plus cap: clovers awarded today from minigames never exceed
   `max_clovers_per_day` (use `Economy.MinigameCloversToday`). Read the per-game numbers from `EconomyConfig.Current`.
5. `Pet.CleanPoop`: clovers from `EconomyConfig.Current.PoopClean.Clovers` instead of the literal 1.
6. Old saves: `Economy` null after load must not crash (use `?? new EconomyState()` in the accessor or in Normalize via a
   partial method – you may add `partial void NormalizeEconomy();` support only if GameState.Normalize calls partial
   hooks; since GameState.cs is off limits, make the property getter lazy: backing field + `get { return _economy ??= new EconomyState(); }`).

## Tests (EconomyTests.cs, ManualClock)
gift streak 1→2→3 amounts 10/15/20; missed day resets; max 50; claim twice same day = 0; minigame daily cap 150 across
games; coloring min/max/daily limit; care task cap; TryPay fails without enough clovers and does not go negative;
old save JSON without `Economy` loads and works; existing MinigameRewardTests still pass.

## Checks
`dotnet test tests/Cuy.Core.Tests/Cuy.Core.Tests.csproj -c Release` all green.

When done, open a pull request against `main` titled `F1-06: Economy core (daily gift, caps, rewards)`.
