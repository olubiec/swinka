# PK-PF-DATA
- Fixed 5 out-of-bounds `park` items (`tree_3` 10,1; `tree_4` 0,4; `bench_right` 13,7; `lamp_mid` 9,5; `lamp_right` 14,5) in `assets/data/outdoor_defaults.json` and `src/Cuy.Core/World/OutdoorDefaults.cs` inside 16x9 with no overlap.
- Differences from prompt: actual codebase has 11 `park` items (`bench_right`, `tree_3`, `tree_4`, `lamp_mid`, `lamp_right` — no `bench_2`/`lamp_2`/`bush_2`), `OutdoorSeed.Seed` (not `EnsureSeeded`), `room.Items` (not `Placed`), and no `OutdoorSeedVersion` or `RemovedFixtures`.
- Decisions: used `"park#v2"` marker in `world.OutdoorSeeded` for one-time park backfill + OOB coordinate repair in `OutdoorSeed.cs` so subsequent `RoomLayoutOps.Remove` deletions stay removed; used anchor-cell check instead of `RoomLayoutOps.TryPlace` because `Seed` takes no `WorldItemCatalog`.
- Gaps outside `Zmieniaj` (untouched): `WorldState.cs` (no `OutdoorSeedVersion` field added), `web/home/features/places/mock.js` (excluded from `Czytaj tylko`/`Zmieniaj`, not checked or synced).
- Added `S9_ParkDefaultsInBoundsAndNonOverlapping` and `S10_ParkPartialAndLegacySaveBackfillsAndRespectsRemovals` in `tests/Cuy.Core.Tests/OutdoorSeedTests.cs` without altering existing assertions.
- Verify: `OutdoorSeed` tests 21 passed, 0 failed, 1 pre-existing skip (`A8_UnknownItemIdInData_IsSkippedAndLogged`); `Cuy.csproj` Release build succeeded (0 warnings, 0 errors).
