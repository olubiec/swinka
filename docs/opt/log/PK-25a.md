# PK-25a log
- Done: W25-01 (RoomsFeature state and 4 messages), W25-03 (PigRoomsMessages + tests), W25-02 (docs/contracts/pigrooms.md). Test run: 881 pass, 3 known failures unchanged (WorldAssetsTests x2, GameSessionWorldTests). Build Release: 0 errors.
- Decision: room_upgrade is not handled by RoomsFeature; it goes through the existing place_upgrade path. PlaceUnlock.Upgrade is therefore unused.
- Decision: pigRooms, storage, variants and comfortByPig are filled only while Balance.PigRoomsActive is on.
- Difference: variantNames have no source in config, so they are placeholders ("Original", "Colour N").
- Difference: Pet.VariantPrice is one price per item, so variantPrices repeats it for every index 1..N-1 instead of tiered prices.
- Difference: pig room ids come from Pet.RoomIdOf(pigId), not a literal "pig:" prefix.
- Undone: validator cannot reject control characters or count the trimmed length of room_rename name (FieldRule has no such rule, IMessageRuleSet.cs is outside Zmieniaj). The control-char test is missing. Pet.RenameRoom rejects control characters at runtime.
- Unverified: PlaceUnlock.GetLevel/NextLevelCost for pig room ids (pig rooms may return 0 or -1 there). Left as-is.
