# PK-P25c log
- Decyzje: dodano `FootW`, `FootH`, `SpriteH` oraz `EffectiveFootW`, `EffectiveFootH`, `EffectiveSpriteH` do `WorldItemDefinition` (domyślnie `0`, czyli zachowanie jak `W`/`H`); `RoomLayoutOps.CanPlace` i `RoomsFeature.ResolveGridCoordinates` używają `EffectiveFootW`/`EffectiveFootH`.
- Dane: `lamp_mushroom` i `lamp_floor` mają `foot_h: 1, sprite_h: 2`; `lamp_arc` ma `foot_h: 1, sprite_h: 3` oraz `anchor: [16, 16]` w `atlas.json`.
- Katalog/atlas: dopisano 21 brakujących wpisów z `RI3.md` sekcja 4 do `world_items.json` i 18 brakujących do `atlas.json`; pominięto `fruit_tree` (40x64), bo `WorldAssetsTests.cs:108` wymaga `size[0] == cells[0]*16`.
- Różnice od R25.md sekcja 6: w `LampPlacementTests` użyto rzeczywistych id z `world_items.json`: `side_table` (za `chair` w T14), `wall_clock` (za `picture_small` w T15) i `sofa_cosy` (za `sofa` w T15).
- Pre-existing fail: `WorldItemCatalogTests.RealCatalog_LoadsAllItems_CountAtLeast50` (`WorldItemCatalogTests.cs:41`) padał już przed `PK-P25c` (`80 != 75` po `PK-P46a`, teraz `101 != 75`); testu nie edytowano zgodnie z `RI3.md` sekcja 6.
- Testy `LampPlacementTests` (20 przypadków), `RoomLayoutOpsTests`, `WorldAssetsTests`, `WorldMigrationTests` oraz `node tools/qa/check-assets.js` (`ASSETS OK`) przeszły.
