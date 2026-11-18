# PK-RI3 Log
- Status: OK. Verification (`node tools/qa/foundation-check.js docs/opt/foundations/RI3.md 6`) passed.
- Build & Core tests: `dotnet build` PASS (0 warnings, 0 errors); `dotnet test` 1162 passed, 5 failed (`WorldItemCatalogTests.cs:41` from `PK-P46a` `80!=75`; 4 `PigPinMessagesTests` from `PK-P5b`).
- F2-2 logs: all 18 present; 2 `BLOCKED` (`PK-P5b`, `PK-P47r`), 1 `NO-OP` (`PK-P24c`), 15 `OK`.
- Key divergences found: `Pet.RemoveItem` drops `RoomLayoutOps.Remove` `out error` and `RoomsFeature.cs:105-113` omits `movable`/`removable`; `RoomsMessages.cs:14,21` caps `x` at `200` (needs `256` for outdoor scenes); `WorldAssetsTests.cs:108` still requires `size[0] == cells[0]*16` (so `PK-P25c` must skip `fruit_tree` 40x64).
- Decisions: recorded concrete `Prompt fixes` in `RI3.md` section 6 for `PK-P46c` and `PK-P25c`.
