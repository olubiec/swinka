# PK-24a: Pet integration of pig rooms: rooms, comfort, items, memory room
Zmieniaj: src/Cuy.Core/Pet.PigRooms.cs, tests/Cuy.Core.Tests/PetPigRoomsTests.cs, src/Cuy.Core/Pet.Rooms.cs, tests/Cuy.Core.Tests/PetPigComfortTests.cs, src/Cuy.Core/Pet.PigRoomItems.cs, tests/Cuy.Core.Tests/PetPigRoomItemsTests.cs, src/Cuy.Core/Pet.MemoryRoom.cs, tests/Cuy.Core.Tests/PetMemoryRoomTests.cs, docs/opt/log/PK-24a.md
Wymagane: src/Cuy.Core/Pet.PigRooms.cs, tests/Cuy.Core.Tests/PetPigRoomsTests.cs, tests/Cuy.Core.Tests/PetPigComfortTests.cs, src/Cuy.Core/Pet.PigRoomItems.cs, tests/Cuy.Core.Tests/PetPigRoomItemsTests.cs, src/Cuy.Core/Pet.MemoryRoom.cs, tests/Cuy.Core.Tests/PetMemoryRoomTests.cs
Weryfikacja: dotnet test tests/Cuy.Core.Tests/Cuy.Core.Tests.csproj -c Release --filter "FullyQualifiedName~PetPigRoomsTests|FullyQualifiedName~PetPigComfortTests|FullyQualifiedName~PetPigRoomItemsTests|FullyQualifiedName~PetMemoryRoomTests"
Pytania: nie zadawaj pytań i nie czekaj na odpowiedź. Jeśli czegoś brakuje lub coś jest niejasne, sam wybierz najrozsądniejsze rozwiązanie zgodne z AGENTS.md, zapisz decyzję w opisie PR i dokończ do końca.
Nie ruszaj: AGENTS.md, docs/archive/, tasks/*, every file not listed in Zmieniaj
Items (in this order): W24-01, W24-02, W24-03, W24-04
Goal: Pet integration of pig rooms: rooms, comfort, items, memory room.
Steps: work the items below in order and keep the files of finished items in place. Do not run git (no commit, branch, PR): the orkiestra commits and merges after the Weryfikacja line passes. After each item run the part of the Weryfikacja line that concerns it and fix failures; if time runs out, finish the current item and say in the log which items are undone. Earlier stages are "merged" = present in the repo now. Where an item has a "Package override", it wins over any conflicting file or step in the item text; the `Zmieniaj` line of this package is authoritative. Docs are named by section: read only that section (grep its heading), never a whole design document or docs/PLAN.md.
Prohibited: changing or deleting existing test assertions, new dependencies, touching files outside "Zmieniaj". Names and signatures from earlier waves are given as planned. If the real code differs, use the real code, list each difference in the PR, and continue (do not stop, nobody will answer).
Test rules: use `RepoFile(...)` for repo files, inject tables and `Random`/clock instead of assigning statics (`Current`), keep tests deterministic.
Log: write `docs/opt/log/PK-24a.md` (max 10 lines: decisions and why, differences from the planned names and signatures, anything left undone). No pull request text.

## Item W24-01: Pet.PigRooms: a room for every adopted pig
Files of this item: src/Cuy.Core/Pet.PigRooms.cs, tests/Cuy.Core.Tests/PetPigRoomsTests.cs
Goal: The pet creates the room of a pig when it is adopted and keeps rooms in sync with the roster.
Depends on: W23 merged.
Facts: Behind `Balance.PigRoomsActive` (off: every method returns without doing anything). `Pet` is partial (pattern `Pet.Economy.cs`). The adoption code (W13-03, `Pet.Adoption.cs`) raises `PigAdopted` (planned event args with the pig id); subscribe in a method `AttachPigRooms()` that the session calls once (W24-05 tests it) instead of editing `Pet.Adoption.cs`. `EnsurePigRooms()` loops over the roster (`State.Pigs`), calls `PigRoomOps.EnsureRoom` with the pig's display name, `Memorial` flag and the position in the roster as `randomIndex`, adds the counter `pig_rooms_furnished` when a room reaches 6 placed items (check after each placement, hook documented for W24-03).
Steps:
1. Implement `AttachPigRooms`, `EnsurePigRooms`, `string RoomIdOf(string pigId)`.
2. Tests: with the flag on, adopting a pig creates its room once; adopting in memorial mode also creates it; `EnsurePigRooms` after loading a roster of three creates three rooms; flag off creates nothing; calling twice changes nothing.

## Item W24-02: Per-pig comfort in mood decay
Files of this item: src/Cuy.Core/Pet.Rooms.cs, tests/Cuy.Core.Tests/PetPigComfortTests.cs
Goal: Mood decay uses the average comfort factor of the active pigs when pig rooms are on.
Depends on: W23 merged.
Facts: W18-02 added the hook method in `Pet.Rooms.cs` that returns `Comfort.MoodDecayFactor(...)` for the whole world when `WorldDecorActive` is on. Change only that method: when `PigRoomsActive` is also on, return `PigComfort.AverageFactor(activePigs, ...)` (active pigs = the roster entries with `Active` true and not `Memorial`; use the accessors that `Pet.ActiveModifiers` (W12-02) uses to find active pigs). With the flag off the result is identical to before. Do not touch `Pet.cs`.
Steps:
1. Implement the switch.
2. Tests: flag off equals the old factor; with two active pigs, one with a full room (factor 0.85) and one with an empty room (1.0) the factor is 0.925; a memorial pig is ignored; no active named pigs gives the old world-wide factor; 10 simulated hours of decay differ by the expected amount.

## Item W24-03: Pet.PigRoomItems: variants, room names, storage and transfer
Files of this item: src/Cuy.Core/Pet.PigRoomItems.cs, tests/Cuy.Core.Tests/PetPigRoomItemsTests.cs
Goal: A pet can recolour an item, rename a room, list unplaced items and move an item between rooms.
Depends on: W23 merged.
Facts: Behind `PigRoomsActive`. Uses `PlacedItem.Variant` (0..VariantCount-1), `RoomLayout.Name` and `UnlockedVariants` (W23-02) and `HomeEconomyConfig` (W23-07, planned names). Only items with `recolor: true` in `world_items.json` have variants; variant 0 is always allowed; variants 1-3 need the key `<itemId>:<variant>` in `UnlockedVariants`; `UnlockVariant(itemId, variant)` pays `HomeEconomyConfig.VariantPrice(itemPrice)` (ceil of price * percent / 100, minimum `min_price`, 0 for free items), once; `SetVariant` returns false for a locked variant. Rename: trim, max `MaxNameLen`, no control characters, empty string resets to null (default name); the name is plain text and is escaped by the page. Storage: `OwnedItems[item] - placed anywhere` for items that are not `repeatable`; `StorageList()` returns id and free count. Transfer: move a placed item from room A to room B in one step (remove from A, `RoomLayoutOps.Place` in B at the given cell with the same variant; if B refuses the placement nothing changes). After each placement in a pig room call the `pig_room_items` counter, and when a pig room reaches 6 items count `pig_rooms_furnished` once per room (use a `HashSet` in `WorldState.PigRoomsEnsured`? no: keep a private set keyed by the counter value rebuilt from the layouts).
Steps:
1. `bool SetVariant(string roomId, string uid, int variant)`, `WorldResult UnlockVariant(string itemId, int variant)`, `int VariantPrice(string itemId)`, `bool RenameRoom(string roomId, string name)`, `IReadOnlyList<(string itemId,int free)> StorageList()`, `PlaceResult TransferItem(string fromRoom, string uid, string toRoom, int x, int y)`.
2. Tests: variant 0 always allowed, variant 2 refused until `UnlockVariant` pays 15 percent of a 320 sofa (48), a second unlock charges nothing, free items cost 0, not enough clovers refuses; variant range; rename trims, caps at 24, resets on empty and rejects control characters; storage counts after placing and removing; transfer success and refusal (nothing changes); counters `pig_room_items` and `pig_rooms_furnished` increase once; flag off does nothing.

## Item W24-04: Memorial pigs keep their room as a memory room
Files of this item: src/Cuy.Core/Pet.MemoryRoom.cs, tests/Cuy.Core.Tests/PetMemoryRoomTests.cs
Goal: A pig in memorial mode keeps its room, shown as a memory room, without comfort effects.
Depends on: W23 merged.
Facts: Design: docs/PIG_ROOMS.md section 5 (sensitive topic: the pigs of the owner's partner; wording is warm and quiet, never says dead or died). `SetMemorial` exists in `Pet.Adoption.cs` (W13-03). When a pig turns memorial: its room stays editable, `RoomDisplayName(pigId)` returns `NameFor(name, memorial: true)` (default 'Kuki's memory room') unless the player renamed it, comfort counts for no pig (W23-03 returns factor 1.0 for memorial), and the memory corner in the garden lists the pig (already W18-07). Turning memorial off again (the player can) restores the normal name. Never delete a room or its items.
Steps:
1. `string RoomDisplayName(string pigId)`, `bool IsMemoryRoom(string roomId)`, and a handler `OnMemorialChanged(string pigId, bool memorial)` subscribed from `AttachPigRooms` (W24-01 exposes it; if it does not exist yet, expose a public method and list the missing call in the PR).
2. Tests: names normal and memorial; a custom name wins over the template; the room and all items survive both directions; no negative strings in the output (check the text does not contain 'dead', 'died', 'death').
