# PK-26a: Shared bedroom: SharedRoomOps, Pet.Dorm and roommate comfort
Zmieniaj: src/Cuy.Core/World/SharedRoomOps.cs, tests/Cuy.Core.Tests/SharedRoomOpsTests.cs, src/Cuy.Core/Pet.Dorm.cs, tests/Cuy.Core.Tests/PetDormTests.cs, src/Cuy.Core/World/PigComfort.cs, tests/Cuy.Core.Tests/PigComfortDormTests.cs, docs/opt/log/PK-26a.md
Wymagane: src/Cuy.Core/World/SharedRoomOps.cs, tests/Cuy.Core.Tests/SharedRoomOpsTests.cs, src/Cuy.Core/Pet.Dorm.cs, tests/Cuy.Core.Tests/PetDormTests.cs, tests/Cuy.Core.Tests/PigComfortDormTests.cs
Weryfikacja: dotnet test tests/Cuy.Core.Tests/Cuy.Core.Tests.csproj -c Release --filter "FullyQualifiedName~SharedRoomOpsTests|FullyQualifiedName~PetDormTests|FullyQualifiedName~PigComfortDormTests"
Pytania: nie zadawaj pytań i nie czekaj na odpowiedź. Jeśli czegoś brakuje lub coś jest niejasne, sam wybierz najrozsądniejsze rozwiązanie zgodne z AGENTS.md, zapisz decyzję w opisie PR i dokończ do końca.
Nie ruszaj: AGENTS.md, docs/archive/, tasks/*, every file not listed in Zmieniaj
Items (in this order): W26-01, W26-02, W26-03
Goal: Shared bedroom: SharedRoomOps, Pet.Dorm and roommate comfort.
Steps: work the items below in order and keep the files of finished items in place. Do not run git (no commit, branch, PR): the orkiestra commits and merges after the Weryfikacja line passes. After each item run the part of the Weryfikacja line that concerns it and fix failures; if time runs out, finish the current item and say in the log which items are undone. Earlier stages are "merged" = present in the repo now. Where an item has a "Package override", it wins over any conflicting file or step in the item text; the `Zmieniaj` line of this package is authoritative. Docs are named by section: read only that section (grep its heading), never a whole design document or docs/PLAN.md.
Prohibited: changing or deleting existing test assertions, new dependencies, touching files outside "Zmieniaj". Names and signatures from earlier waves are given as planned. If the real code differs, use the real code, list each difference in the PR, and continue (do not stop, nobody will answer).
Test rules: use `RepoFile(...)` for repo files, inject tables and `Random`/clock instead of assigning statics (`Current`), keep tests deterministic.
Log: write `docs/opt/log/PK-26a.md` (max 10 lines: decisions and why, differences from the planned names and signatures, anything left undone). No pull request text.

## Item W26-01: SharedRoomOps: move pigs into the shared bedroom and back
Files of this item: src/Cuy.Core/World/SharedRoomOps.cs, tests/Cuy.Core.Tests/SharedRoomOpsTests.cs
Goal: A pure helper merges pigs' rooms into the shared bedroom and restores them, never destroying an item.
Depends on: W25 merged.
Facts: Design: docs/PIG_ROOMS.md section 6. Move in: for each resident pig, copy its layout to `Parked[pigId]` (snapshot), set `RoomShare[pigId] = 'dorm'`, then place the items of all residents into the `dorm` layout by deterministic first-fit (floor items by layer then by comfort descending, then wall items); items that do not fit stay in `OwnedItems` but unplaced (storage). Wallpaper and floor of the dorm: those of the first resident (the player changes them later). The pig's own room entry stays but is hidden while shared. Move out: restore `Parked[pigId]` as the pig's layout for every item that is still owned and not placed in the dorm; items bought while sharing stay in the dorm or go to storage (the dorm layout loses only the items that went back). `RoomShare` entry removed, `Parked` entry removed. Items are never deleted; only `Place` and `Remove` operations on layouts change.
Steps:
1. `static MoveInResult MoveIn(WorldState, IReadOnlyList<string> pigIds, PigRoomConfig, WorldItemCatalog, PlaceCatalog, Func<string> newUid)` (result: `Moved`, `ItemsStored` count, `TooMany`, `NeedTwo`, `AlreadyShared`), `static bool MoveOut(WorldState, string pigId, WorldItemCatalog, PlaceCatalog, Func<string> newUid)`, `static IReadOnlyList<string> Residents(WorldState)`.
2. Tests: two pigs with 8 items each move into a 16x8 dorm and every item is either placed or counted in storage (sum of placed + storage equals owned for each item id); a third pig can join; the sum of `OwnedItems` never changes; move out restores the original layout exactly when nothing changed (compare JSON of the layout); items placed in the dorm that belonged to a snapshot go back to their pig, new ones stay; moving out the last but one resident leaves a dorm with one resident (allowed: the dorm stays, with a note in the PR); a memorial pig can be a resident; `TooMany` over `MaxResidents`.

## Item W26-02: Pet.Dorm: unlock, move in and out, levels
Files of this item: src/Cuy.Core/Pet.Dorm.cs, tests/Cuy.Core.Tests/PetDormTests.cs
Goal: A pet can unlock and upgrade the shared bedroom and move pigs in and out.
Depends on: W25 merged. Uses W26-01 (same wave) through planned names.
Facts: Behind `Balance.DormActive` (and `PigRoomsActive`). `PlaceUnlock.CanUnlockRoom('dorm', nonMemorialPigs)` (W23-05) decides; spend with `TrySpendClovers`; counter `dorm_unlocked`; event `RoomUnlocked`-style event like W18-01 (`PlaceUnlockedEventArgs('dorm')`). `UpgradeDorm()` uses `PlaceUnlock.Upgrade`. `MoveIn(ids)` / `MoveOut(id)` call `SharedRoomOps`; diary line via the templates of W24-06. Bond bonus: expose `double DormBondBonus(string pigId)` (= `Dorm.BondGainBonus` when the pig is a resident and at least one other resident is not memorial, else 0) for the bond code (W14-01 `Pet` bond gain) to add as a multiplier; do not edit `Pet.cs`, list the missing call in the PR.
Steps:
1. `WorldResult UnlockDorm()`, `WorldResult UpgradeDorm()`, `MoveResult MoveIn(IReadOnlyList<string>)`, `bool MoveOut(string)`, `double DormBondBonus(string)`.
2. Tests: unlock fails with one pig, with 1499 clovers and succeeds at 1500; counter and achievement `shared_nest` pay once; upgrade costs 1100 then 1800 then max; move in and out round trip; bonus only for residents with a non-memorial roommate; flags off disable everything.

## Item W26-03: PigComfort: roommates use the shared bedroom as their own room
Files of this item: src/Cuy.Core/World/PigComfort.cs, tests/Cuy.Core.Tests/PigComfortDormTests.cs
Goal: Residents of the shared bedroom count it as their own room in comfort.
Depends on: W25 merged.
Facts: W23-03 already reads `RoomShare` in `PigComfort.Score`. Check it: this task only adds the missing parts. (a) The dorm's own sum is counted once per pig (each resident sees the full dorm comfort at weight `own`). (b) A resident's parked room counts for nobody (weight 0, not `others`, otherwise a shared pig would be double counted). (c) Non-residents see the dorm as a common place (weight `common`). If W23-03 already behaves like this, change nothing in production code and only add the tests (say so in the PR).
Steps:
1. Adjust `PigComfort` if needed.
2. Tests for (a), (b), (c) with a 2-pig world; the score stays capped at 100.
