# PK-26b: DormFeature, contract and validation, flags on for pig rooms and the dorm
Zmieniaj: src/Cuy/dotNet/Features/DormFeature.cs, docs/contracts/dorm.md, src/Cuy.Core/Input/Validation/DormMessages.cs, tests/Cuy.Core.Tests/DormMessageTests.cs, src/Cuy.Core/GameSession.cs, tests/Cuy.Core.Tests/GameSessionPigRoomsTests.cs
Wymagane: src/Cuy/dotNet/Features/DormFeature.cs, docs/contracts/dorm.md, src/Cuy.Core/Input/Validation/DormMessages.cs, tests/Cuy.Core.Tests/DormMessageTests.cs, tests/Cuy.Core.Tests/GameSessionPigRoomsTests.cs
Weryfikacja: dotnet test tests/Cuy.Core.Tests/Cuy.Core.Tests.csproj -c Release && dotnet build src/Cuy/Cuy.csproj -c Release -p:EnableWindowsTargeting=true
Pytania: nie zadawaj pytań i nie czekaj na odpowiedź. Jeśli czegoś brakuje lub coś jest niejasne, sam wybierz najrozsądniejsze rozwiązanie zgodne z AGENTS.md, zapisz decyzję w opisie PR i dokończ do końca.
Nie ruszaj: AGENTS.md, docs/archive/, tasks/*, every file not listed in Zmieniaj
Items (in this order): W26-04, W26-05, W26-08
Goal: DormFeature, contract and validation, flags on for pig rooms and the dorm.
Steps: work the items below in order; after each item run the quick check (the Weryfikacja line, or only the part that concerns the item), fix, then make one commit "[<item id>] <item title>". If time runs out, finish and commit the current item and list the unfinished items in the PR. Earlier stages are "merged" = present in the repo now. Where an item has a "Package override", it wins over any conflicting file or step in the item text; the `Zmieniaj` line of this package is authoritative.
Prohibited: changing or deleting existing test assertions, new dependencies, touching files outside "Zmieniaj". Names and signatures from earlier waves are given as planned. If the real code differs, use the real code, list each difference in the PR, and continue (do not stop, nobody will answer).
Test rules: use `RepoFile(...)` for repo files, inject tables and `Random`/clock instead of assigning statics (`Current`), keep tests deterministic.
PR: one pull request for the package; for each item what was done, decisions and why, how to check by hand; a screenshot for visual changes; anything left undone.

## Item W26-04: DormFeature: state and messages
Files of this item: src/Cuy/dotNet/Features/DormFeature.cs
Goal: The Home page can read the shared bedroom and run unlock, upgrade, move in and move out.
Depends on: W25 merged.
Facts: Pattern as W19-01 (`PlacesFeature`). State key `dorm`: `{ unlocked, unlockCost, requiresPigs, level, maxLevel, nextLevelCost, cols, rows, maxResidents, residents: [pigId], candidates: [ { pigId, name, portrait, memorial, resident } ], bondBonus }`. Messages: `dorm_unlock {}`, `dorm_upgrade {}`, `dorm_move_in { pigIds: [..] }`, `dorm_move_out { pigId }`. The dorm layout itself is published by `RoomsFeature` under `layouts.dorm` (planned: W26-07 wires the page; if `RoomsFeature` does not publish it yet, publish `layouts.dorm` here under `dorm.layout` with the same shape and say so in the PR). Toasts: 'Not enough clovers', 'You need two pigs first', 'Not everything fit - the rest is in storage' (when items were stored), 'Welcome home'.
Steps:
1. Implement the feature class with the planned `Pet.*` names; unknown ids ignored.

## Item W26-05: Contracts and validation for the shared bedroom
Files of this item: docs/contracts/dorm.md, src/Cuy.Core/Input/Validation/DormMessages.cs, tests/Cuy.Core.Tests/DormMessageTests.cs
Goal: The `dorm` state and messages are documented and validated.
Depends on: W26-04 merged (read it).
Facts: Add a `dorm` section to `docs/contracts.md` in the existing format. Validator entries as W19-06: `dorm_unlock {}`, `dorm_upgrade {}`, `dorm_move_in { pigIds: string[] }` (1-6 ids, each <= 64 chars, no duplicates), `dorm_move_out { pigId }`.
Steps:
1. Write the doc section and the validator entries.
2. Tests: good payloads pass; missing field, wrong type, 0 or 7 ids, duplicates and over-long ids fail.
Package override (wins over anything above): Do not edit `docs/contracts.md` or `MessageValidator.cs`: write `docs/contracts/dorm.md` and one `IMessageRuleSet` class `DormMessages` (package PK-00).

## Item W26-08: GameSession.Open switches pig rooms and the dorm on
Files of this item: src/Cuy.Core/GameSession.cs, tests/Cuy.Core.Tests/GameSessionPigRoomsTests.cs
Goal: Pig rooms and the shared bedroom become active in the real game.
Depends on: W25 merged and W26-01..03 merged earlier in this wave are not required (the flags only switch on code that exists since W24).
Facts: Add `PigRoomsActive` and `DormActive` to the flags in `GameSession.Open` (both branches), call `AttachPigRooms()` and `State.EnsurePigRooms(...)` after `EnsureWorld`. Existing tests must keep passing; record any that break only because of the flags.
Steps:
1. Implement.
2. Tests: a new session has both flags true; a new game with the two starter pigs has two rooms with their themes; an old save with three pigs gets three rooms; reopening creates nothing new; adopting another pig creates its room.
