# W23-02: WorldState fields for pig rooms and the shared bedroom
Zmieniaj: src/Cuy.Core/World/WorldState.cs, tests/Cuy.Core.Tests/WorldStatePigFieldsTests.cs
Wymagane: tests/Cuy.Core.Tests/WorldStatePigFieldsTests.cs
Weryfikacja: dotnet test tests/Cuy.Core.Tests/Cuy.Core.Tests.csproj -c Release
Pytania: nie zadawaj pytań i nie czekaj na odpowiedź. Jeśli czegoś brakuje lub coś jest niejasne, sam wybierz najrozsądniejsze rozwiązanie zgodne z AGENTS.md, zapisz decyzję w opisie PR i dokończ zadanie do końca.
Nie ruszaj: src/Cuy/*, AGENTS.md, docs/*, tasks/*, assets/data/*
Goal: The saved world state can hold item variants, room names, parked layouts and shared-room membership.
Depends on: W22 merged. Sub-wave W23a: no dependency on other tasks of the wave.
Facts: Save rule (AGENTS.md): only add fields with safe defaults, never rename or delete. Add: `PlacedItem.Variant` (int, default 0), `RoomLayout.Name` (string, default null = use the catalog name), `WorldState.Parked` (`Dictionary<string,RoomLayout>`, pig id -> the pig's own layout while it lives in the shared bedroom), `WorldState.RoomShare` (`Dictionary<string,string>`, pig id -> shared room id, absent = own room), `WorldState.PigRoomsEnsured` (`HashSet<string>` of pig ids whose room was created), `WorldState.UnlockedVariants` (`HashSet<string>` of `<itemId>:<variant>` keys bought with clovers), `WorldState.StorageVersion` not needed. All collections non-null after access (same lazy pattern as the existing ones). Design: docs/PIG_ROOMS.md section 6. Test rules: use `RepoFile(...)` for repo files, inject tables and `Random`/clock instead of assigning statics (`Current`), keep tests deterministic.
Steps:
1. Add the fields and keep `Version` of `WorldState` at 1 (additive).
2. Tests: defaults; JSON round trip of a layout with a variant and a name; an old world JSON (written by the W16-06 shape, build it as a string in the test) loads with variant 0, name null and empty new collections; setting a new collection to null in JSON gives an empty one on access.
Prohibited: changing or deleting existing test assertions, new dependencies, touching files outside "Zmieniaj". Names and signatures from earlier waves are given as planned. If the real code differs, use the real code, list each difference in the PR, and continue (do not stop, nobody will answer).
PR: what was done, decisions and why, how to check by hand.
