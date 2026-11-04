# PK-23a log
- Items done in order: W23-01, W23-02, W23-06, W23-07, W23-08. All five filter groups pass: 50/50 in the scratch harness.
- Env: no .NET 9 SDK on the box (apt has only 8.0, and a .NET 9 feed install was denied). The test project targets net9.0, so the official Weryfikacja line cannot run here. Same test files were built as net8.0 in a harness outside the repo (scratchpad, Cuy.sln + assets symlink).
- Names: `Current` is get-only (no setter, tests inject via `Load`). `RoomId`/`TryParseRoomId` are instance methods using the file's `id_prefix`. `Dorm` is typed `PigRoomDorm`. Levels reuse `GridLevel` from PlaceCatalog.
- HomeEconomy: flat properties (e.g. `VariantUnlockPercent`, `RunGateItem`) instead of nested groups. Hour clamp 0-23 applied to the 4 clock hours only, not `max_hours_per_day`. `min_price` floored at 0.
- NameFor cuts the pig name to `max_name_len` (not the final string). Empty name becomes "Pig".
- Flags test pre-records the other achievements as earned: earning one writes a diary entry, which fires `first_diary`.
- Risk: new loaders log via the static `ItemCatalog.ErrorLogger`. One full-suite run failed `PlaceCatalogTests` (parallel static logger); three later runs passed.
- Not caused by this package (fail with or without the new tests in the harness): NoPolishIds and Notices (harness has no docs/src), WorldAssets icons/tiles, GameSessionWorldTests.Open_OldSaveWithEquippedDecor.
- Left undone: nothing in the W23 list.
