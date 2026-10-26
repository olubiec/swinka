# Task F3-02: Economy simulation (30 days, three player profiles), tuning, and a gentler daily gift

Read `AGENTS.md` first and follow it. F1-06, F2-04, F2-05, F2-06, F2-09, F2-11 are merged (checked on main, 26.10.2026). This task does
not depend on F2-02 or F2-07.

## Goal
Show with numbers that clovers feel meaningful (daily food is affordable, toys take days, decor and the hammock take weeks, the vet is
affordable but not trivial, nothing can be farmed), tune the data files, and replace the "missed day resets the streak" rule of the daily gift.

## Research status (read this, it limits what you may claim)
- No source gives "days to afford" figures for pet games (R5.1) or a reward-to-income ratio for achievements (R5.3). Everything below
  marked "target" is a DESIGN CHOICE of this project. Do not look up or cite external numbers; none of the reference figures found
  (a secondary-source note that Neko Atsume's gift box holds 100; no Pou figures) is usable as a target.
- Sourced principles (R5.1, R5.2) you may follow and name in the report: balance faucets and sinks to roughly net-zero; add sinks
  rather than cutting income; state costs as days of play; be generous early and taper; cap stockpiled/offline income; a daily reward
  uses a 7-day cycle with mild escalation, never resets to zero, has a small grace tool, and uses no countdown or red "streak lost" text.
  The day-7 size has no source (the only example is about 7x day 1, UNVERIFIED): choose it in the simulation.

## Facts about the repo (checked on main; do not re-derive)
- `assets/data/economy.json` now: `daily_gift {base 10, per_streak_day 5, max 50, streak_resets_after_missed_days 1}`, `poop_clean {clovers 1}`,
  `minigame {points_per_clover 10, max_per_game 40, rewarded_games_per_day 10, max_clovers_per_day 150}`, `coloring {cells_per_clover 40,
  min_per_picture 5, max_per_picture 25, rewarded_pictures_per_day 5}`, `care_task {clovers 5, max_per_day 6}`, `starting_clovers 30`.
- Daily gift code: `Pet.GetDailyGift()` / `Pet.ClaimDailyGift()` in `src/Cuy.Core/Pet.Economy.cs`; config class `EconomyConfig.DailyGiftConfig`
  (`src/Cuy.Core/Economy/EconomyConfig.cs`, Newtonsoft, unknown JSON keys are ignored); save data `EconomyState { LastGiftLocalDate,
  GiftStreak, ... }` (`src/Cuy.Core/Economy/EconomyState.cs`). `GiftStreak` stores the day number (1-based) of the last claim.
- Other Core entry points the simulation can call: `Pet.AwardColoring(cells)`, `Pet.AwardCareTask()`, `Pet.TryPay(price, reason)`,
  `Pet.AddClovers`, `Pet.TrySpendClovers`, `Pet.Checkup()`, `Pet.Treat(conditionId)`, `Pet.TickHealth(elapsed)`.
- Prices live in `assets/data/items.json`, `items_shop.json` and `items_decor.json` (`items[]` with `id`, `price`, `category`, `one_time`,
  `daily_limit`) and `assets/data/health.json` (`checkup_price`, `conditions[]`).
- Existing tests that assert the OLD gift rule and must be updated: `GiftStreak_IncreasesAmount_AndMissedDayResets` and
  `MaxGiftLimit_IsEnforced` in `tests/Cuy.Core.Tests/EconomyTests.cs`.
- The Home daily screen text is in `web/home/features/daily/feature.js` (`Day ${dailyState.streak} in a row!`, 7 streak boxes).
  `src/Cuy/dotNet/Features/DailyFeature.cs` sends `{ available, amount, streak }`.

## Files you may change / add
`tools/Cuy.Simulator/Program.cs` (only the `--economy` switch and dispatch), new `tools/Cuy.Simulator/EconomySim.cs`, new `docs/economy-report.md`,
`assets/data/economy.json`, `assets/data/items_shop.json`, `assets/data/items_decor.json`, `assets/data/health.json` (prices only),
`src/Cuy.Core/Economy/EconomyConfig.cs`, `src/Cuy.Core/Economy/EconomyState.cs`, `src/Cuy.Core/Pet.Economy.cs`,
`tests/Cuy.Core.Tests/EconomyTests.cs`, `web/home/features/daily/feature.js`, `src/Cuy/dotNet/Features/DailyFeature.cs`
(only add `cycleDays` to the state), and `jules/contracts.md` (only: add `cycleDays` to the `daily` state if that section exists).

## Part A: simulation
1. `dotnet run --project tools/Cuy.Simulator -- --economy [--days 30] [--report docs/economy-report.md]`. Reuse the existing simulator
   loop (`ManualClock`, real `Pet`/`GameSession` rules, the same hourly ticking as `--care`); do not copy Core rules into the simulator.
   Fixed seed `12345` for every random choice (illness rolls included), start `2025-01-01 08:00`, the same output on every run.
2. Three profiles, each performing its list once per simulated day:
   - **casual**: Home once a day; feeds hay + 1 vegetable; cleans poops once; 1 minigame with 150 points; no colouring; no care tasks;
     claims the daily gift on 5 days out of 7 (days 3 and 6 of each week are skipped).
   - **regular**: Home twice a day; hay + 2 vegetables; cleans poops twice; 3 minigames with 250 points each; 1 colouring picture of 500
     cells; 3 care tasks; claims the gift every day.
   - **heavy**: reaches every daily cap (minigames, colouring pictures, care tasks), claims the gift every day.
   Spending order for all: needed food first, then the cheapest unowned toy/equipment, then decor (cheapest first); pay the vet
   (`checkup_price` + treatment) when sick.
3. Report (`docs/economy-report.md`), per profile: a table with one row per day (income by source: gift, poops, minigames, colouring,
   care tasks; spending by category; balance), the day each one-time item was bought, illnesses and vet cost. Then a verdict table: each target below,
   the measured value, PASS/FAIL. Costs are also written as "days of regular income".
4. Targets (design choices): the regular profile buys the ball on day 3-5, the tunnel on day 7-10, the house on day 10-14, the hammock on day
   14-21 and owns about 6 decor items by day 30; casual never has less than one day of food money left after the first week and buys decor
   rarely; heavy cannot buy every item before day 20. Faucet/sink check: the regular profile's balance on day 30 is at most 7 times its average
   daily income (state the number you got). Offline check: after 7 simulated days without opening Home nothing has accumulated except a
   single claimable gift.
5. Tuning: change prices/rewards only in the listed data files, each value by at most +/-40 % of its current value, until the targets hold.
   List every change (file, id, before, after) in the report. If a target cannot hold within +/-40 %, leave it FAIL and say so; do not exceed
   the limit.

## Part B: daily gift (7-day cycle, no reset to zero)
6. `economy.json` `daily_gift`: replace `streak_resets_after_missed_days` with `cycle_days: 7`, `missed_day_steps_back: 1`, `grace_days_per_cycle: 1`
   (keep `base`, `per_streak_day`, `max`). `DailyGiftConfig` gets the three properties with these defaults and loses the old one; an old
   `economy.json` that still contains `streak_resets_after_missed_days` must load without error (add a test that calls `EconomyConfig.Load` with it).
7. New save field `EconomyState.GiftGraceUsed` (bool, default false; old saves load, AGENTS rule 6).
8. Rules in `GetDailyGift()` (it stays free of side effects; `Streak` = the day number, 1..`cycle_days`). With `last` = `LastGiftLocalDate`,
   `prev` = `GiftStreak`, `missed` = whole days skipped = `(today - last).Days - 1`:
   - never claimed (`last` empty or `prev <= 0`): day 1.
   - `missed <= 0`: day = `min(prev + 1, cycle_days)`.
   - `missed >= 1`: `covered` = 1 if `GiftGraceUsed` is false else 0; `effective = missed - covered`. If `effective <= 0` the day is
     `min(prev + 1, cycle_days)` (the grace day forgives the miss); otherwise `max(1, prev - missed_day_steps_back * effective)`.
   - Amount = `base + per_streak_day * (day - 1)`, capped by `max`. After day 7 the reward stays at the day-7 amount.
   `ClaimDailyGift()` stores `GiftStreak = day` and updates the grace flag: set `GiftGraceUsed = true` when `missed >= 1` and the grace was
   available; set it back to false when the claim moves the day up to `cycle_days` from a lower day. Pick `base`/`per_streak_day` so the
   day-7 amount is a small part of the regular profile's income (state the share in the report); today's values give day 7 = 40.
9. Tests in `EconomyTests.cs` (derive expected amounts from `EconomyConfig`, do not hard-code 10/15/20): first claim = day 1; seven daily claims
   climb to day 7 and days 8-9 stay at the day-7 amount; miss one day at day 3 -> day 4 and `GiftGraceUsed` true; miss one more day at day 4
   (grace used) -> day 3; fresh grace, miss two days at day 5 -> day 4; a 60-day absence -> day 1 and one gift only; the day never goes below 1;
   reaching day 7 again refills the grace; claiming twice the same day still returns 0; old config JSON loads; a save without `GiftGraceUsed`
   loads with false. Replace the two old tests.
10. UI: `daily/feature.js` shows `Welcome back! Day N of M` (M = `dailyState.cycleDays`, default 7 when missing) instead of "in a row", and the
    streak boxes use M. `DailyFeature.cs` adds `cycleDays = EconomyConfig.Current.DailyGift.CycleDays` to the state. No countdown, no red text,
    no "streak lost" wording anywhere (`grep -rn "streak" web/home` and fix user-visible strings you find).

## Checks
`dotnet test tests/Cuy.Core.Tests/Cuy.Core.Tests.csproj -c Release` (update expectations only where they assert the old gift rule and say so);
`dotnet build src/Cuy/Cuy.csproj -c Release -p:EnableWindowsTargeting=true`; `node --check web/home/features/daily/feature.js`;
`dotnet run --project tools/Cuy.Simulator -- --economy` output pasted into the PR (run it twice: identical output).

## Gotowe pliki
None: no ready-made code exists for this task.

## Testy ręczne (ZWERYFIKUJ NA PC)
- ECO-01: play two real days with the real clock and compare how long the first toy takes with the report. Report day-7 gift size and why (design choice).

When done, open a pull request against `main` titled `F3-02: Economy simulation and tuning`.
