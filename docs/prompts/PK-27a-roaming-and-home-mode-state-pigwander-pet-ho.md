# PK-27a: Roaming and home mode: state, PigWander, Pet.Homes, HomesFeature, contract, validation
Zmieniaj: src/Cuy.Core/World/WorldState.cs, tests/Cuy.Core.Tests/WorldStateHomesTests.cs, src/Cuy.Core/World/PigWander.cs, tests/Cuy.Core.Tests/PigWanderTests.cs, src/Cuy.Core/Pet.Homes.cs, src/Cuy.Core/Balance.cs, tests/Cuy.Core.Tests/PetHomesTests.cs, src/Cuy/dotNet/Features/HomesFeature.cs, docs/contracts/homes.md, src/Cuy.Core/Input/Validation/HomesMessages.cs, tests/Cuy.Core.Tests/HomesMessageTests.cs, docs/opt/log/PK-27a.md
Wymagane: tests/Cuy.Core.Tests/WorldStateHomesTests.cs, src/Cuy.Core/World/PigWander.cs, tests/Cuy.Core.Tests/PigWanderTests.cs, src/Cuy.Core/Pet.Homes.cs, tests/Cuy.Core.Tests/PetHomesTests.cs, src/Cuy/dotNet/Features/HomesFeature.cs, docs/contracts/homes.md, src/Cuy.Core/Input/Validation/HomesMessages.cs, tests/Cuy.Core.Tests/HomesMessageTests.cs
Weryfikacja: dotnet test tests/Cuy.Core.Tests/Cuy.Core.Tests.csproj -c Release && dotnet build src/Cuy/Cuy.csproj -c Release -p:EnableWindowsTargeting=true
Pytania: nie zadawaj pytań i nie czekaj na odpowiedź. Jeśli czegoś brakuje lub coś jest niejasne, sam wybierz najrozsądniejsze rozwiązanie zgodne z AGENTS.md, zapisz decyzję w opisie PR i dokończ do końca.
Nie ruszaj: AGENTS.md, docs/archive/, tasks/*, every file not listed in Zmieniaj
Items (in this order): W27-01, W27-02, W27-03, W27-04, W27-05
Goal: Roaming and home mode: state, PigWander, Pet.Homes, HomesFeature, contract, validation.
Steps: work the items below in order and keep the files of finished items in place. Do not run git (no commit, branch, PR): the orkiestra commits and merges after the Weryfikacja line passes. After each item run the part of the Weryfikacja line that concerns it and fix failures; if time runs out, finish the current item and say in the log which items are undone. Earlier stages are "merged" = present in the repo now. Where an item has a "Package override", it wins over any conflicting file or step in the item text; the `Zmieniaj` line of this package is authoritative. Docs are named by section: read only that section (grep its heading), never a whole design document or docs/PLAN.md.
Prohibited: changing or deleting existing test assertions, new dependencies, touching files outside "Zmieniaj". Names and signatures from earlier waves are given as planned. If the real code differs, use the real code, list each difference in the PR, and continue (do not stop, nobody will answer).
Test rules: use `RepoFile(...)` for repo files, inject tables and `Random`/clock instead of assigning statics (`Current`), keep tests deterministic.
Log: write `docs/opt/log/PK-27a.md` (max 10 lines: decisions and why, differences from the planned names and signatures, anything left undone). No pull request text.

## Item W27-01: WorldState.PigHomes: free roaming or tied to a room
Files of this item: src/Cuy.Core/World/WorldState.cs, tests/Cuy.Core.Tests/WorldStateHomesTests.cs
Goal: The saved world state remembers for each pig whether it roams the house or stays in one room.
Depends on: W26 merged.
Facts: Additive save field (AGENTS.md): `WorldState.PigHomes` = `Dictionary<string,PigHomeState>`, `PigHomeState { string Mode ("free" or "room"); string Room (room id when Mode is room, otherwise null) }`. Absent entry means the default from `HomeEconomyConfig.RoamDefaultMode` (`free`). Lazy non-null collection like the others. Design: docs/PIG_ROOMS.md section 7.
Steps:
1. Add the types and the property.
2. Tests: absent entry reads as default; JSON round trip; an old world JSON loads with an empty map; invalid mode strings are read as `free` by a small helper `PigHomeState.Normalize()`.

## Item W27-02: PigWander: where a pig is and what it does, from the clock
Files of this item: src/Cuy.Core/World/PigWander.cs, tests/Cuy.Core.Tests/PigWanderTests.cs
Goal: A pure, deterministic schedule says which room a roaming pig is in and what it is doing.
Depends on: W26 merged.
Facts: Design: docs/PIG_ROOMS.md section 7. Nothing is saved: the result depends only on the pig id, the local time, the list of rooms the pig may visit and the settings `roam{slot_minutes (20), night_from_hour (22), night_to_hour (7)}` from `HomeEconomyConfig`. Slots of `slot_minutes`; per slot a hash of (pig id, date, slot index) picks the room and activity with these weights: at night (22-7) the pig sleeps in its own room (its shared bedroom if it is a resident); in the morning and evening it likes the living room (eating) and the playroom (play); at other times uniform over unlocked rooms; a pig tied to a room (`Mode == room`) always returns that room, with activities by time of day only. Activities: `sleep`, `eat`, `play`, `rest`, `explore`. Offline time needs no handling because the result is a pure function of the clock.
Steps:
1. `public static class PigWander`: `WanderResult Where(string pigId, PigHomeState home, string ownRoomId, IReadOnlyList<string> visitableRooms, DateTime localNow, HomeEconomyConfig cfg)` with `WanderResult { string RoomId; string Activity; int SlotIndex }`, and `bool IsNight(DateTime localNow, HomeEconomyConfig cfg)`.
2. Tests: same inputs give the same result; a tied pig is always in its room; at 03:00 every roaming pig sleeps in its own room; over a simulated week a roaming pig visits every visitable room at least once and no room gets more than 60 percent of the slots; the activity at 23:00 is `sleep`; an empty visitable list returns the own room; two pigs do not share the same schedule (compare 20 slots).

## Item W27-03: Pet.Homes: choose roaming or a home room
Files of this item: src/Cuy.Core/Pet.Homes.cs, src/Cuy.Core/Balance.cs, tests/Cuy.Core.Tests/PetHomesTests.cs
Goal: A pet can set a pig's home mode and read where each pig is now.
Depends on: W26 merged.
Facts: Add the flag `HomesActive` (bool, default false) to `Balance.cs`; it is switched on in W30-09, not here. Behind that flag. `SetHome(string pigId, string mode, string roomId)` validates: pig on the roster; mode `free` or `room`; for `room` the room is one the pig can use (its own room, a common room that is unlocked, or the dorm when it is a resident). `LocationOf(string pigId)` uses `PigWander.Where` with the pet's clock. `IReadOnlyList<(string pigId,string room,string activity)> Locations()` for the page. Memorial pigs are always shown in their memory room and never wander.
Steps:
1. Implement the three methods and the flag.
2. Tests: default mode is free; set tied then read the location; invalid room refused; a dorm resident cannot be tied to a room it cannot use; memorial pig always in its memory room; flag off returns the pig's own room for everybody.

## Item W27-04: HomesFeature: where the pigs are
Files of this item: src/Cuy/dotNet/Features/HomesFeature.cs
Goal: The Home page can read the pigs' locations and set their home mode.
Depends on: W26 merged.
Facts: Pattern as `PlacesFeature` (W19-01). State key `homes`: `{ pigs: [ { pigId, name, mode, room, location, activity, memorial, portrait } ], rooms: [ { id, name } ] }` where `rooms` lists the rooms a pig can be tied to. Tick: re-publish the state at most every 20 seconds while the Home page is open (the schedule changes by slot). Message `pig_home { pigId, mode, room }` calls `Pet.SetHome`; refusals become toasts ('That room is not available').
Steps:
1. Implement with the planned `Pet.*` names; ignore unknown ids.

## Item W27-05: Contracts and validation for homes
Files of this item: docs/contracts/homes.md, src/Cuy.Core/Input/Validation/HomesMessages.cs, tests/Cuy.Core.Tests/HomesMessageTests.cs
Goal: The `homes` state and `pig_home` message are documented and validated.
Depends on: W27-04 merged (read it).
Facts: Add a `homes` section to `docs/contracts.md` (format of the others). Validator entry like W19-06: `pig_home { pigId <= 64, mode in free|room, room string <= 64 required when mode is room }`.
Steps:
1. Write the section and the entry.
2. Tests: good payloads; missing fields; mode `other`; room missing for `room`; over-long ids.
Package override (wins over anything above): Do not edit `docs/contracts.md` or `MessageValidator.cs`: write `docs/contracts/homes.md` and one `IMessageRuleSet` class `HomesMessages` (package PK-00).
