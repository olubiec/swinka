# Task F3-02: Economy simulation and tuning (30 days, three player profiles)

Read `AGENTS.md` first. F1-06, F2-04, F2-05, F2-06, F2-09, F2-11 are merged.

## Goal
Check with numbers that clovers feel meaningful: daily food is affordable, toys take a few days, decor and the hammock
take one to three weeks, the vet is affordable but not trivial, and nothing can be farmed. Then tune the data files.

## Files you may change / add
`tools/Cuy.Simulator/*` (new mode), new `docs/economy-report.md`, `assets/data/economy.json`,
`assets/data/items_shop.json`, `assets/data/items_decor.json`, `assets/data/health.json` (prices only).

## Steps
1. Add `--economy` mode to the simulator: simulate 30 days with `ManualClock` and the real Core rules for three
   profiles: **casual** (opens Home once a day, feeds hay + 1 vegetable, cleans poops once, 1 minigame with 150 points,
   no colouring, claims the gift 5 days of 7), **regular** (twice a day, 2 vegetables, cleans twice, 3 minigames with
   250 points, 1 colouring picture of ~500 cells, 3 care tasks, gift daily), **heavy** (all caps reached daily).
   Spending strategy per profile: buy needed food first, then the cheapest unowned toy/equipment, then decor; pay the
   vet when sick (illness rolls with a fixed seed).
2. Output a table per profile: income by source per day, spending by category, balance curve (day 1..30), day each
   one-time item was bought, illnesses and vet cost. Write `docs/economy-report.md` with the tables and a short verdict.
3. Targets: regular player buys ball by day 3-5, tunnel by day 7-10, house by day 10-14, hammock by day 14-21, owns
   ~6 decor items by day 30; casual never runs out of money for daily food but buys decor rarely; heavy cannot buy
   everything before day 20. Adjust prices/rewards (each change at most ±40 %) until the targets hold; list every change
   with before/after in the report.
4. Run Core tests (they must still pass; update test expectations only where they assert old economy numbers and say so).

## Checks
`dotnet test tests/Cuy.Core.Tests/Cuy.Core.Tests.csproj -c Release`; `dotnet run --project tools/Cuy.Simulator -- --economy`
output pasted into the PR.

When done, open a pull request against `main` titled `F3-02: Economy simulation and tuning`.
