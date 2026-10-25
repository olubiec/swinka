# Task F7-02: Final balance pass - economy, bond, growth and care in one 60-day simulation

Read `AGENTS.md` first. All F4-F6 tasks are merged. Builds on F3-02 (`docs/economy-report.md`, simulator `--economy`).

## Goal
The new systems add income and costs: birthday gift (100 clovers + cake), tricks, minigames (three new games), diary,
bond unlocks, hay rack, companion care, level-20 golden bowl. Check they do not break the economy or the pacing.

## Files you may change
`tools/Cuy.Simulator/*`, `docs/economy-report.md` (append a section "60-day full game"), data files
(`economy.json`, `items_shop.json`, `items_decor.json`, `bond.json`, `tricks.json`, `hay.json`, `companion.json`) for tuning only.

## Steps
1. Extend the simulator with `--full` (60 days, ManualClock): the three profiles of F3-02 plus: every profile plays
   minigames up to the daily cap, performs every unlocked trick once a day, claims the gift, refills the hay rack 3x a day
   and adopts the companion as soon as it is possible.
2. Report: life stage per day (Baby -> Junior -> Adult by day ~9), birthdays and their income, bond level by day for each
   profile (targets: regular reaches level 5 by day 7, level 10 by day 20, level 20 by day 90+; heavy reaches level 10 by day 12),
   clovers per day by source, share of income from minigames (must stay below 50 % for the regular profile), how fast
   the companion becomes possible, total spending, any day with zero clovers and no food.
3. Tune numbers (each change at most +-40 %), keep a before/after table in the report. Update tests that assert old
   numbers and say so.
4. Check "no exploits": a script that clicks everything as fast as possible for one simulated hour must not exceed the
   documented daily caps; list the caps found.

## Checks
`dotnet test ... -c Release`; `dotnet run --project tools/Cuy.Simulator -- --full` output pasted into the PR.

When done, open a pull request against `main` titled `F7-02: Final balance pass`.
