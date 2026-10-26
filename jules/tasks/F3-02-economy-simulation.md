# Task F3-02: Economy simulation and tuning (30 days, three player profiles)

Read `AGENTS.md` first. F1-06, F2-04, F2-05, F2-06, F2-09, F2-11 are merged.

## Goal
Check with numbers that clovers feel meaningful: daily food is affordable, toys take a few days, decor and the hammock
take one to three weeks, the vet is affordable but not trivial, and nothing can be farmed. Then tune the data files.

## Files you may change / add
`tools/Cuy.Simulator/*` (new mode), new `docs/economy-report.md`, `assets/data/economy.json`,
`assets/data/items_shop.json`, `assets/data/items_decor.json`, `assets/data/health.json` (prices only), and for step 5 only:
`src/Cuy.Core/Economy/*.cs`, `tests/Cuy.Core.Tests/EconomyTests.cs`, the daily gift UI text from F2-11 (find it with
`grep -rl daily web/home/features`).

## Steps
1. Add `--economy` mode to the simulator: simulate 30 days with `ManualClock` and the real Core rules for three
   profiles: **casual** (opens Home once a day, feeds hay + 1 vegetable, cleans poops once, 1 minigame with 150 points,
   no colouring, claims the gift 5 days of 7), **regular** (twice a day, 2 vegetables, cleans twice, 3 minigames with
   250 points, 1 colouring picture of ~500 cells, 3 care tasks, gift daily), **heavy** (all caps reached daily).
   Spending strategy per profile: buy needed food first, then the cheapest unowned toy/equipment, then decor; pay the
   vet when sick (illness rolls with a fixed seed).
2. Output a table per profile: income by source per day, spending by category, balance curve (day 1..30), day each
   one-time item was bought, illnesses and vet cost. Write `docs/economy-report.md` with the tables and a short verdict.
3. Targets (design choices, not research facts: R5.1 found no sourced "days to afford" figures; derive them from this
   simulation): regular player buys ball by day 3-5, tunnel by day 7-10, house by day 10-14, hammock by day 14-21, owns
   ~6 decor items by day 30; casual never runs out of money for daily food but buys decor rarely; heavy cannot buy
   everything before day 20. Adjust prices/rewards (each change at most ±40 %) until the targets hold; list every change
   with before/after in the report.
4. Run Core tests (they must still pass; update test expectations only where they assert old economy numbers and say so).

5. Daily gift rules (R5.2). Today `economy.json` has `daily_gift.streak_resets_after_missed_days = 1` (a missed day resets the
   streak). Change to: a 7-day cycle with mild escalation; a missed day never resets to zero: step back by one day (minimum day 1);
   one free missed day per cycle (grace, nothing lost); after day 7 the reward stays at the day-7 level. New keys:
   `cycle_days: 7`, `missed_day_steps_back: 1`, `grace_days_per_cycle: 1` (remove `streak_resets_after_missed_days`; keep loading
   old files without errors). Day-7 size is a design choice (the only documented example is about 7x day 1, UNVERIFIED as advice):
   pick it in the simulation so the gift stays a small part of income. No countdown and no red "streak lost" wording in the UI:
   replace such texts with neutral ones ("Welcome back! Day 3 of 7"). Add tests: miss one day (grace), miss two days (step back
   by one), long absence (day 1, never negative).
6. Sinks and caps (R5.1): the report must show net income of the regular profile close to zero by day 30 after the one-time items
   (faucets vs sinks), costs expressed as days of play, and that offline/uncollected income does not stockpile.

## Checks
`dotnet test tests/Cuy.Core.Tests/Cuy.Core.Tests.csproj -c Release`; `dotnet run --project tools/Cuy.Simulator -- --economy`
output pasted into the PR.

## Gotowe pliki
None: no ready-made code exists for this task.

## Testy ręczne (ZWERYFIKUJ NA PC)
- ZWERYFIKUJ NA PC: nothing UNVERIFIED depends on code here. In the PR: the day-7 gift size chosen and why (design choice).

When done, open a pull request against `main` titled `F3-02: Economy simulation and tuning`.
