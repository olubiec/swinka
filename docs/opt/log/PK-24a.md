# PK-24a log
- PK-23b is not in the repo (no PigRoomOps, PigComfort, per-pig comfort). Built on the real code instead: room creation is `Pet.EnsureRoom` (theme wallpaper/floor, starter items put in the first free cell, no ownership check, `WorldState.PigRoomsEnsured` marks created rooms); pig comfort = `Comfort.Score` of the pig's own room only (no common/others weights).
- Added injectable `Pet.PigRooms` (PigRoomConfig) and `Pet.HomeEconomy` (HomeEconomyConfig). Room id key is `NamedId ?? Id`; `RoomIdOf` accepts either.
- W24-02: no hook existed in Pet.Rooms.cs (Pet.cs computes the factor inline), so I added `MoodDecayComfortFactor()`. Pet.cs `ApplyTime` is NOT switched to it (not in Zmieniaj): one-line follow-up there. The 10-hour test checks the arithmetic on the factor, not ApplyTime.
- W24-04: Pet.Adoption `SetMemorial` raises no event, so `OnMemorialChanged(pigId, memorial)` is public and not subscribed; the caller (PigsFeature) must call it after SetMemorial. Names follow the flag live anyway.
- W24-03: `pig_room_items` / `pig_rooms_furnished` are counted in `TransferItem` via `NotePigRoomPlacement`; `PlaceItem` (grid via PlaceCatalog, 0x0 for pig rooms) is not wired for pig rooms. Furnished counter is rebuilt from layouts (only rises).
- RenameRoom cuts over-long names to MaxNameLen instead of refusing. Pig-room grid for transfer = PigRoomConfig.Levels[0].
- Not done: W24-05 session call of AttachPigRooms. Tests were run on SDK 10 with roll-forward.
