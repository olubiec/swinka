- Status: BLOCKED (22/22 `HayHop*` tests pass; full suite fails on 18 pre-existing unrelated tests).
- Files: `assets/data/hayhop.json`, `src/Cuy.Core/Minigames/HayHopReward.cs` (per R44 §6), `src/Cuy.Core/Input/Validation/HayHopMessages.cs`, `docs/contracts/hayhop.md`, `tests/Cuy.Core.Tests/HayHopRewardTests.cs`, `tests/Cuy.Core.Tests/HayHopMessagesTests.cs`.
- API: `HayHopConfig` (`Current`, `Load`, `LoadFromFile`, `LoadDefault`), `HayHopRewardResult`, `HayHopReward.Compute(...)`, `HayHopMessages` (`minigame.hay_hop.result`, `ValidateResultPayload`).
- Differences from R44: none; `HayHopReward.Compute` guards `PointsPerClover >= 1` and `dailyCloversToday >= 0`.
- Unrelated failures (18 total, e.g. `WorldItemCatalogTests.RealCatalog_LoadsAllItems_CountAtLeast50`):
  `Assert.Equal() Failure: Values differ`
  `Expected: 75`
  `Actual:   101`
  `at Cuy.Core.Tests.WorldItemCatalogTests.RealCatalog_LoadsAllItems_CountAtLeast50() in .../WorldItemCatalogTests.cs:line 41`
  Also failing unrelated: `WorldMessageTests`, `WorldAssetsTests`, `NewFeaturesAdversarialTests`, `PigPinMessagesTests`, `LampPlacementTests`, `LampPlacementAdversarialTests`.
