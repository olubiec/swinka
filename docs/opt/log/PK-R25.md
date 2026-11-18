Decyzje: rozdzielono stopę blokującą (`foot_w`, `foot_h`) od wysokości sprite'a (`sprite_h`) z domyślnym fallbackiem na `w`/`h`, aby stare zapisy i testy `RoomLayoutOpsTests` pozostały w 100% ważne.
Decyzja o `lamp_arc`: `foot_h=1`, `sprite_h=3`, `anchor: [16, 16]` w `atlas.json`, dzięki czemu kinkiet wiesza się w `cy=0..1` i zwisa w dół bez blokowania ścieżki (`rebuildGrid` pomija `layer === 'wall'`).
API/pola: `foot_w`/`foot_h`/`sprite_h` w `world_items.json`; `FootW`/`FootH`/`SpriteH` oraz `EffectiveFootW`/`EffectiveFootH`/`EffectiveSpriteH` w `WorldItemDefinition`.
Rozszerzono `Zmieniaj` dla `PK-P25c` w `Prompt fixes` o `WorldItemCatalog.cs` i `RoomsFeature.cs` (`ResolveGridCoordinates` używa `h` przy konwersji pikseli i clampie).
Pytanie do właściciela, które wybrałem sam: czy `lamp_mushroom`/`lamp_floor` w starych zapisach na `y=2` mają przesunąć się pod ścianę (wybrano: tak, bez migracji `y`, zachowując ważność zapisu).
Różnice/uwagi: brak kolizji z istniejącymi asercjami w `RoomLayoutOpsTests.cs:23-185`.
Weryfikacja: `node tools/qa/foundation-check.js docs/opt/foundations/R25.md 6` — PASS.
