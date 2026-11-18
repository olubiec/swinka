# PK-P46t1 Log
- Status: OK (8 passed, 1 skipped defect in verification run 2; A3 & A10 baseline-normalized after Normalize() roster init).
- Created `OutdoorSeedAdversarialTests` in `tests/Cuy.Core.Tests/OutdoorSeedAdversarialTests.cs` covering A1..A10 and R1/R30.7 (16x9 farm/market bounds, fixture lock & move).
- Rule A9: `WorldItemDefinition.Repeatable` is `false` for floor fixtures (`willow_tunnel`); `Pet.PlaceItem` enforces `owned - placed >= 1` (`PlaceResult.NotAllowedHere`), while `RoomLayoutOps.Place` checks geometry only (`PlaceResult.Ok`).
- Difference from plan (R30.7): `PlaceResult.FixtureLocked` enum member does not exist in `RoomLayoutOps.cs`; `RoomLayoutOps.Remove(room, uid, out string error)` returns `false` with `error == "fixture_locked"`.
- DEFECT A8 (`A8_UnknownItemIdInData_IsSkippedAndLogged`, marked `Skip = "DEFECT: ..."`):
  1. Pass JSON with unknown `itemId: "nonexistent_ufo_999"` to `OutdoorDefaults.LoadFromJson(json)`.
  2. Call `OutdoorSeed.Seed(world, "garden", table, ActiveBalance())`.
  3. Unknown `itemId` is neither skipped nor logged via `ItemCatalog.ErrorLogger`; it is added to `world.Rooms["garden"].Items` and `world.OwnedItems`.
