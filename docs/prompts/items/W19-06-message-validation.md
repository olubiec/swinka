# W19-06: Validation and name mapping for the new messages
Zmieniaj: src/Cuy.Core/Input/MessageValidator.cs, tests/Cuy.Core.Tests/WorldMessageTests.cs
Wymagane: src/Cuy.Core/Input/MessageValidator.cs, tests/Cuy.Core.Tests/WorldMessageTests.cs
Weryfikacja: dotnet test tests/Cuy.Core.Tests/Cuy.Core.Tests.csproj -c Release
Pytania: nie zadawaj pytań i nie czekaj na odpowiedź. Jeśli czegoś brakuje lub coś jest niejasne, sam wybierz najrozsądniejsze rozwiązanie zgodne z AGENTS.md, zapisz decyzję w opisie PR i dokończ zadanie do końca.
Nie ruszaj: src/Cuy/*, web/*, AGENTS.md, docs/*, tasks/*
Goal: The Home messages of the new features are validated and mapped (camelCase to the C# names) with tests.
Depends on: W19-01..04 merged.
Facts: Messages from JS are validated against a table before they reach the features. If `src/Cuy.Core/Input/MessageValidator.cs` does not exist yet, create it in namespace `Cuy.Core.Input` with `public static class MessageValidator` and `public static bool IsValid(string json, out string reason)` (supporting existing message types plus the new world message types from `W19-01..04`). Add the message types and their required fields and types from `docs/contracts.md` (written in W19-05, or the lists in the four feature files): `place_unlock`, `room_unlock`, `place_upgrade`, `room_buy`, `room_place`, `room_move`, `room_flip`, `room_remove`, `room_skin`, `farm_plant`, `farm_water`, `farm_harvest`, `farm_harvest_all`, `orchard_plant`, `orchard_harvest`, `farm_buy`, `market_sell`, `market_buy`, `market_special`, `market_order`, `market_stall`, `market_quote`, plus `adopt_named`, `adopt_group`, `set_memorial` if not yet present. Test rules: use `RepoFile(...)` for repo files, inject tables and `Random`/clock instead of assigning statics (`Current`), keep tests deterministic.
Steps:
1. If `src/Cuy.Core/Input/MessageValidator.cs` does not exist yet, create it in namespace `Cuy.Core.Input` with `public static class MessageValidator` and `public static bool IsValid(string json, out string reason)` (supporting existing message types plus the new world message types from `W19-01..04`). Add the entries; reject negative or non-integer counts, empty ids, coordinates outside -1..200, and unknown `what` values for `farm_buy`.
2. Tests: each message type validates with a good payload and fails with a missing field, a wrong type, a negative count and an over-long id (> 64 chars).
Prohibited: changing or deleting existing test assertions, new dependencies, touching files outside "Zmieniaj". Names and signatures from earlier waves are given as planned. If the real code differs, use the real code, list each difference in the PR, and continue (do not stop, nobody will answer).
PR: what was done, decisions and why, how to check by hand.
