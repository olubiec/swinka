# PK-23b: PigComfort, PigRoomOps and pig-room levels in the catalog
Zmieniaj: src/Cuy.Core/World/PigComfort.cs, tests/Cuy.Core.Tests/PigComfortTests.cs, src/Cuy.Core/World/PigRoomOps.cs, tests/Cuy.Core.Tests/PigRoomOpsTests.cs, src/Cuy.Core/World/PlaceCatalog.cs, src/Cuy.Core/World/PlaceUnlock.cs, tests/Cuy.Core.Tests/PigRoomLevelsTests.cs
Wymagane: src/Cuy.Core/World/PigComfort.cs, tests/Cuy.Core.Tests/PigComfortTests.cs, src/Cuy.Core/World/PigRoomOps.cs, tests/Cuy.Core.Tests/PigRoomOpsTests.cs, tests/Cuy.Core.Tests/PigRoomLevelsTests.cs
Weryfikacja: dotnet test tests/Cuy.Core.Tests/Cuy.Core.Tests.csproj -c Release && dotnet build src/Cuy/Cuy.csproj -c Release -p:EnableWindowsTargeting=true
Pytania: nie zadawaj pytań i nie czekaj na odpowiedź. Jeśli czegoś brakuje lub coś jest niejasne, sam wybierz najrozsądniejsze rozwiązanie zgodne z AGENTS.md, zapisz decyzję w opisie PR i dokończ do końca.
Nie ruszaj: AGENTS.md, docs/archive/, tasks/*, every file not listed in Zmieniaj
Items (in this order): W23-03, W23-04, W23-05
Goal: PigComfort, PigRoomOps and pig-room levels in the catalog.
Steps: work the items below in order; after each item run the quick check (the Weryfikacja line, or only the part that concerns the item), fix, then make one commit "[<item id>] <item title>". If time runs out, finish and commit the current item and list the unfinished items in the PR. Earlier stages are "merged" = present in the repo now. Where an item has a "Package override", it wins over any conflicting file or step in the item text; the `Zmieniaj` line of this package is authoritative.
Prohibited: changing or deleting existing test assertions, new dependencies, touching files outside "Zmieniaj". Names and signatures from earlier waves are given as planned. If the real code differs, use the real code, list each difference in the PR, and continue (do not stop, nobody will answer).
Test rules: use `RepoFile(...)` for repo files, inject tables and `Random`/clock instead of assigning statics (`Current`), keep tests deterministic.
PR: one pull request for the package; for each item what was done, decisions and why, how to check by hand; a screenshot for visual changes; anything left undone.

## Item W23-03: PigComfort: personal comfort and mood factor per pig
Files of this item: src/Cuy.Core/World/PigComfort.cs, tests/Cuy.Core.Tests/PigComfortTests.cs
Goal: A pure function computes the comfort of one pig from its own room, the common places and (for roommates) the shared bedroom.
Depends on: W22 merged.
Facts: Design: docs/PIG_ROOMS.md section 4. `Score(pig) = min(cap, own*Sum(own room) + common*Sum(common places) + others*Sum(other pigs' rooms))` with weights from `PigRoomConfig` and the cap from `PlaceCatalog.ComfortCap` (100). Sums use the same item comfort as `Comfort.Score` (W17-02; reuse its per-place sum, do not copy the arithmetic). A pig that lives in the shared bedroom (`RoomShare[pig]`) counts that room as its own room. Common places are the ids in `common_places` (rooms `salon`, `bedroom`, `playroom`, `dorm` and the outdoor places). The mood factor is `Comfort.MoodDecayFactor(score, places)` (so the maximum slow-down stays 15 percent and the economy sim thresholds do not move). A memorial pig has no needs: return factor 1.0 for it.
Steps:
1. `public static class PigComfort`: `int Score(WorldState, WorldItemCatalog, PlaceCatalog, PigRoomConfig, string pigId)`, `double MoodFactor(...same..., bool memorial)`, `double AverageFactor(IEnumerable<(string pigId,bool memorial)> activePigs, ...)` (average of the factors of non-memorial pigs, 1.0 when there are none).
2. Tests: empty world 0 and factor 1.0; own sofa (comfort 6) counts 6, the same sofa in the salon counts 3, in another pig's room 0; roommates both count the dorm as own; the score is capped at 100 and the factor is exactly 0.85 at the cap; a memorial pig gives factor 1.0; the average ignores memorial pigs; weights come from the config (build a config from JSON in the test).

## Item W23-04: PigRoomOps: create a pig's room with its theme and starter set
Files of this item: src/Cuy.Core/World/PigRoomOps.cs, tests/Cuy.Core.Tests/PigRoomOpsTests.cs
Goal: A pure helper creates a pig's room (skins, 3 starter items placed, signature item owned and placed) idempotently.
Depends on: W22 merged. Uses W23-01 (`PigRoomConfig`) and W23-02 (fields) from this wave only through the interfaces below: build against the planned names and list differences.
Facts: `WorldState.Rooms[roomId]` holds a `RoomLayout` (`Wallpaper`, `Floor`, `Items`); `RoomLayoutOps.Place` (W17-01) validates cells; level 1 grid is 10x6 with 2 wall rows. Starter items are free copies: add 1 to `OwnedItems` for each starter id and for the signature id, then place them with a deterministic first-fit scan (wall items on the wall rows from the left, floor items from the bottom-left, row by row; the signature item first, in the middle of the floor). Wallpaper and floor ids are also added to `OwnedItems` (free, once). `PigRoomsEnsured` makes the whole call idempotent (a second call changes nothing, even if the player removed the starter items). Design: docs/PIG_ROOMS.md section 3.
Steps:
1. `static bool EnsureRoom(WorldState, string pigId, string pigName, bool memorial, int randomIndex, PigRoomConfig, WorldItemCatalog, Func<string> newUid)` returns true when it created the room; sets level 1 in `PlaceLevels[roomId]`, `Name` stays null.
2. Tests: kuki's room has wallpaper `wallpaper_mint`, floor `floor_wood_light`, 3 starter items plus `sig_kuki_blanket` placed inside 10x6 without overlaps; items are in `OwnedItems`; the second call returns false and changes nothing; removing the starter and calling again does not bring it back; an unknown pig gets a default theme; two pigs get independent rooms; a memorial pig also gets a room.

## Item W23-05: Rooms of pigs and the shared bedroom in PlaceCatalog and PlaceUnlock
Files of this item: src/Cuy.Core/World/PlaceCatalog.cs, src/Cuy.Core/World/PlaceUnlock.cs, tests/Cuy.Core.Tests/PigRoomLevelsTests.cs
Goal: `GridSize`, `NextLevelCost`, `Upgrade` and room lookup work for `pig:<id>` rooms and for `dorm`.
Depends on: W22 merged; W23-01 in this wave defines `PigRoomConfig` (use the planned API).
Facts: Today `PlaceCatalog.FindRoom` only knows rooms written in `places.json` and `PlaceUnlock` works on those. Add: `PlaceCatalog.PigRooms` (a `PigRoomConfig`, lazy default, settable for tests), `ResolveRoom(string id)` returning a `RoomDefinition` for `salon/bedroom/playroom` as before, for `pig:<id>` (template levels, `UnlockedAtStart` true because the room is created by `EnsureRoom`) and for `dorm` (dorm levels, locked until unlocked by the Pet). `PlaceUnlock.GridSize`, `NextLevelCost`, `Upgrade` use `ResolveRoom`. Levels live in `WorldState.PlaceLevels[roomId]` like for the other rooms. `PlaceUnlock.CanUnlockRoom('dorm')` returns `Ok` only when the caller passes the pig count (new optional parameter `int nonMemorialPigs = 0`), enough pigs (`RequiresPigs`) and not yet unlocked; cost = `Dorm.UnlockCost`. No existing behaviour or test may change.
Steps:
1. Implement as described; keep all public signatures source compatible (optional parameters only).
2. Tests: grid sizes of a pig room per level (10x6, 12x7, 14x8) and of the dorm (16x8, 20x9, 24x10); upgrade costs 400, 900 and then max; the dorm needs 2 pigs and 1500 clovers' worth cost value; unknown `pig:` ids with an empty name resolve (the pig may be unknown to the catalog) while `pig:` alone does not; salon behaviour unchanged.
