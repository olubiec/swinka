PK-23b status: BLOCKED, no code written. Items W23-03, W23-04, W23-05 all undone.
Blocker 1: PK-23a outputs are not in the repo: PigRoomConfig.cs, WorldState.RoomShare and pig-room fields, dorm config (HomeEconomyConfig). All three items need PigRoomConfig. Writing against it now would break the whole Cuy.Core.Tests compile for the parallel PK-23a, so nothing was written.
Blocker 2: no .NET SDK on PATH (`dotnet` not found). Test and build verification could not run here, environment reason.
Real-code differences found: Comfort.Score(world, items, placeIdOrNull) is per room or all rooms, no per-pig overload. RoomLayout and PlacedItem live in WorldState.cs, not RoomLayout.cs. PigProfile.Memorial exists (src/Cuy.Core/Pigs/PigProfile.cs). PlaceCatalog has no PigRooms property yet; pig rooms come from assets/data/pig_rooms.json, not places.json.
Decisions: none beyond stopping. Rerun PK-23b after PK-23a merges and an SDK is available.
