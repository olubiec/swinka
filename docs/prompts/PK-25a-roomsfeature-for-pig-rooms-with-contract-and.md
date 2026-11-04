# PK-25a: RoomsFeature for pig rooms with contract and validation
Zmieniaj: src/Cuy/dotNet/Features/RoomsFeature.cs, src/Cuy.Core/Input/Validation/PigRoomsMessages.cs, tests/Cuy.Core.Tests/PigRoomMessageTests.cs, docs/contracts/pigrooms.md, docs/opt/log/PK-25a.md
Wymagane: src/Cuy/dotNet/Features/RoomsFeature.cs, src/Cuy.Core/Input/Validation/PigRoomsMessages.cs, tests/Cuy.Core.Tests/PigRoomMessageTests.cs, docs/contracts/pigrooms.md
Weryfikacja: dotnet test tests/Cuy.Core.Tests/Cuy.Core.Tests.csproj -c Release && dotnet build src/Cuy/Cuy.csproj -c Release -p:EnableWindowsTargeting=true
Pytania: nie zadawaj pytań i nie czekaj na odpowiedź. Jeśli czegoś brakuje lub coś jest niejasne, sam wybierz najrozsądniejsze rozwiązanie zgodne z AGENTS.md, zapisz decyzję w opisie PR i dokończ do końca.
Nie ruszaj: AGENTS.md, docs/archive/, tasks/*, every file not listed in Zmieniaj
Items (in this order): W25-01, W25-03, W25-02
Goal: RoomsFeature for pig rooms with contract and validation.
Steps: work the items below in order and keep the files of finished items in place. Do not run git (no commit, branch, PR): the orkiestra commits and merges after the Weryfikacja line passes. After each item run the part of the Weryfikacja line that concerns it and fix failures; if time runs out, finish the current item and say in the log which items are undone. Earlier stages are "merged" = present in the repo now. Where an item has a "Package override", it wins over any conflicting file or step in the item text; the `Zmieniaj` line of this package is authoritative. Docs are named by section: read only that section (grep its heading), never a whole design document or docs/PLAN.md.
Prohibited: changing or deleting existing test assertions, new dependencies, touching files outside "Zmieniaj". Names and signatures from earlier waves are given as planned. If the real code differs, use the real code, list each difference in the PR, and continue (do not stop, nobody will answer).
Test rules: use `RepoFile(...)` for repo files, inject tables and `Random`/clock instead of assigning statics (`Current`), keep tests deterministic.
Log: write `docs/opt/log/PK-25a.md` (max 10 lines: decisions and why, differences from the planned names and signatures, anything left undone). No pull request text.

## Item W25-01: RoomsFeature: pig rooms, storage, variants, names, transfer
Files of this item: src/Cuy/dotNet/Features/RoomsFeature.cs
Goal: The Home page can read the pig rooms and run the new room actions.
Depends on: W24 merged.
Facts: W19-02 created `RoomsFeature` (state key `rooms`). Extend it (pattern unchanged, JS never computes prices or comfort). Add to the state: `pigRooms: [ { pigId, name, roomId, displayName, level, maxLevel, nextLevelCost, cols, rows, memorial, portrait } ]` (`portrait` = `sprites/portraits/<id>.png` for named pigs, null otherwise), `storage: [ { itemId, free } ]`, `variantNames: [..]`, `variantPrices: { <itemId>: [0, p1, p2, p3] }`, `variantsUnlocked: [ '<itemId>:<variant>' ]`, `comfortByPig: { <pigId>: { score, cap, moodFactor } }`; `layouts` also contains `pig:<id>` keys with `name` and per item `variant`. New messages: `room_variant { place, uid, variant }`, `room_variant_unlock { itemId, variant }`, `room_rename { place, name }`, `room_transfer { from, to, uid, x, y }`, and `room_upgrade { place }` goes through the existing `place_upgrade` path (document which). Results map to short English toasts.
Steps:
1. Implement the state and the three messages using `Pet.SetVariant`, `RenameRoom`, `TransferItem`, `StorageList`, `RoomDisplayName` and `PlaceUnlock.Upgrade` (planned names).
2. Unknown ids are ignored; return true only for handled messages.

## Item W25-03: Validation for the pig room messages
Files of this item: src/Cuy.Core/Input/Validation/PigRoomsMessages.cs, tests/Cuy.Core.Tests/PigRoomMessageTests.cs
Goal: The new messages are validated with tests.
Depends on: W25-01 merged.
Facts: As W19-06 (find the real validator file with grep). Add `room_variant` (uid string <= 64, variant int 0-7), `room_variant_unlock` (itemId string <= 64, variant int 1-7), `room_rename` (place string, name string <= 24 after trim, no control characters), `room_transfer` (from, to, uid, x, y with the same coordinate limits as `room_move`).
Steps:
1. Add the entries.
2. Tests: each validates with a good payload and fails with a missing field, wrong type, a negative or oversize number, an over-long name and a name with a control character.
Package override (wins over anything above): Do not edit `MessageValidator.cs`: add one `IMessageRuleSet` class `PigRoomsMessages` (package PK-00) and test through `MessageValidator.Validate`.

## Item W25-02: docs/contracts.md: pig rooms
Files of this item: docs/contracts/pigrooms.md
Goal: The contract describes the new state and messages exactly as published.
Depends on: W25-01 merged (read it).
Facts: Extend the `rooms` section written in W19-05 (field table, messages, toasts) with everything W25-01 added; read `RoomsFeature.cs` for the real names. Add a short subsection 'Pig rooms' that states the room id format `pig:<id>`.
Steps:
1. Edit only the `rooms` section and add the subsection.
Package override (wins over anything above): Write `docs/contracts/pigrooms.md` (new file); do not edit `docs/contracts.md`.
