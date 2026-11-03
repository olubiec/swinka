# W29-03: DesktopPropOps: desktop <-> room, one place at a time
Zmieniaj: src/Cuy.Core/World/DesktopPropOps.cs, tests/Cuy.Core.Tests/DesktopPropOpsTests.cs
Wymagane: src/Cuy.Core/World/DesktopPropOps.cs, tests/Cuy.Core.Tests/DesktopPropOpsTests.cs
Weryfikacja: dotnet test tests/Cuy.Core.Tests/Cuy.Core.Tests.csproj -c Release
Pytania: nie zadawaj pytań i nie czekaj na odpowiedź. Jeśli czegoś brakuje lub coś jest niejasne, sam wybierz najrozsądniejsze rozwiązanie zgodne z AGENTS.md, zapisz decyzję w opisie PR i dokończ zadanie do końca.
Nie ruszaj: src/Cuy/*, AGENTS.md, docs/*, tasks/*, assets/data/*
Goal: A pure helper moves a prop between the desktop and a room; an item is never in two places.
Depends on: W28 merged.
Facts: Rules: the player owns N copies of an inventory item (`Inventory`); each copy is either on the desktop (`DesktopProps`), in a room (a `PlacedItem` with the prop's room item id) or in storage. `PutOnDesktop(itemId, x, y)` needs a free copy and room under `MaxOnDesktop`; `MoveOnDesktop(uid, x, y)`; `ToRoom(uid, roomId, cellX, cellY)` removes it from the desktop and places the matching `prop_*` item with `RoomLayoutOps.Place` (if the placement is refused nothing changes); `FromRoom(roomId, placedUid, x, y)` removes the placed item and puts a prop on the desktop (needs room under the limit; otherwise it goes to storage and the result says `Stored`); `Free(itemId)` counts free copies = owned - desktop - placed. Room items of kind `prop_*` count against the same copies, they are not extra purchases: `OwnedItems` is not increased for them (they are free items bound to the inventory count). Test rules: use `RepoFile(...)` for repo files, inject tables and `Random`/clock instead of assigning statics (`Current`), keep tests deterministic.
Steps:
1. `static class DesktopPropOps` with those methods returning small result enums.
2. Tests: every transition; never two places at once (sum of desktop + placed + free equals owned); limit 6; refused placement leaves the prop on the desktop; clamping of X and Y; owning 0 copies refuses.
Prohibited: changing or deleting existing test assertions, new dependencies, touching files outside "Zmieniaj". Names and signatures from earlier waves are given as planned. If the real code differs, use the real code, list each difference in the PR, and continue (do not stop, nobody will answer).
PR: what was done, decisions and why, how to check by hand.
