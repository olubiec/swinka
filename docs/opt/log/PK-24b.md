# PK-24b log
- W24-05: `PigRoomOps` does not exist in the repo, so `GameState.EnsurePigRooms(PigRoomConfig, WorldItemCatalog, Func<string> uidGen = null, Random rng = null)` builds rooms itself (theme wallpaper/floor, NameFor name, starter items via RoomLayoutOps.Place with placeId null because pig:* is not in item `place` lists).
- Starter items are placed first-fit on level 0 (wall rows 2); OwnedItems is raised to the placed count so layouts stay consistent. Signature items are not placed.
- Idempotence via World.PigRoomsEnsured plus existing-room check; pigs listed in RoomShare are skipped; memorial pigs get a memory-room name. Theme index is a stable hash of the pig id when no Random is given. Version not bumped.
- W24-06: 12 templates t_room_* (all stages) and 2 symbols (room_cosy_thing, room_friend_word) appended to diary.json; BOM and existing content kept.
- Nothing left undone.
