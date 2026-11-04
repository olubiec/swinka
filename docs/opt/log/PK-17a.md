# PK-17a
- W17-01: Implemented RoomLayoutOps with PlaceResult enum, layer validation, footprint collision checks, and mutation methods (Place, Move, SetFlip, Remove, CountPlaced).
- W17-02: Implemented Comfort score calculation, cap at 100 via PlaceCatalog, mood decay factor down to 0.85 at cap, and per-place score filtering.
- W17-07: Implemented PlaceUnlock with UnlockResult, unlocking places/rooms, prerequisites, level progression (costs 530/1200 for salon), and GridSize lookup.
- W17-08: Implemented LegacyDecorMigration migrating old slot decor (wallpaper, floor, rug, plant, picture, lamp) into salon layout and OwnedItems; added LegacyDecorMigrated flag.
- Decisions: LegacyDecorMigration uses static registration and reflection fallback to register legacy item definitions into WorldItemCatalog instances.
- Undone: None, all items completed and verified with all 24 tests passing.
