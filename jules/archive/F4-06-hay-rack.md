# Task F4-06: Hay rack - the pig eats on its own, also while the PC is off (Core)

Read `AGENTS.md` first and follow it. Requires waves 0-3 merged.

## Goal
Original design: hay is free and unlimited, kept in a rack (stock 0-100). The pig eats from it by itself, also while
the PC is off, and the player only refills it. Offline decay already uses a multiplier of 1/3 with a floor of 20
(`assets/data/actions.json` `offline`, tests in `OfflineRulesTests.cs`); do not change that.

## Files you may change
New: `src/Cuy.Core/GameState.Hay.cs` (one property `HayRack`, default 60), `src/Cuy.Core/Pet.Hay.cs`,
`tests/Cuy.Core.Tests/HayRackTests.cs`; `assets/data/simulation.json` only if you add a scenario;
`src/Cuy/dotNet/HomeWindow.cs` (state `hayRack` and the feed handler for `hay`), `web/home/app.js` (small hay gauge on the
feed button), `web/home/bridge.js` (mock).

## Specification
1. Numbers in `assets/data/hay.json`: `{ "max": 100, "refillAmount": 50, "eatPerGameHour": 6, "offlineEatPerHour": 2,
   "fullnessPerHayUnit": 0.5, "wheekBelow": 10 }`.
2. `Pet.RefillHay()` adds `refillAmount` (capped at `max`); no clover cost, no reward (anti-exploit: nothing happens
   at 100). `Pet.Update` (online) and the offline catch-up in `Start()` consume hay while `Fullness < 95`, raise fullness
   by `fullnessPerHayUnit` per unit; offline the rack gives at most enough to keep fullness at the offline floor.
3. Empty rack: the pig behaves hungrier (the `begging` action already has weights from fullness; nothing to change) and
   the status bubble may show "The hay rack is empty" (state flag only; the bubble text is shown by existing code if
   `hayRack == 0`: add one line in `StatusBubble` if trivial, else leave a TODO in the PR description).
4. Feed menu: `hay` refills the rack (and plays the eat animation as today). State key `hayRack: { "value": 60, "max": 100 }`.
5. Tests: refill cap, online and offline consumption, never negative, save/load with an old save (property defaults to 60),
   a 7-day scenario with refills 3 times a day keeps fullness above 70 (compare `simulation.json`).

## Checks
`dotnet test ... -c Release`, `node --check`, `node tools/qa/web-smoke.js`, Cuy.csproj build.

When done, open a pull request against `main` titled `F4-06: Hay rack`.
