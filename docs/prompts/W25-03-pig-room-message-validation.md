# W25-03: Validation for the pig room messages
Zmieniaj: src/Cuy.Core/Input/MessageValidator.cs, tests/Cuy.Core.Tests/PigRoomMessageTests.cs
Wymagane: tests/Cuy.Core.Tests/PigRoomMessageTests.cs
Weryfikacja: dotnet test tests/Cuy.Core.Tests/Cuy.Core.Tests.csproj -c Release
Pytania: nie zadawaj pytań i nie czekaj na odpowiedź. Jeśli czegoś brakuje lub coś jest niejasne, sam wybierz najrozsądniejsze rozwiązanie zgodne z AGENTS.md, zapisz decyzję w opisie PR i dokończ zadanie do końca.
Nie ruszaj: src/Cuy/*, web/*, AGENTS.md, docs/*, tasks/*
Goal: The new messages are validated with tests.
Depends on: W25-01 merged.
Facts: As W19-06 (find the real validator file with grep). Add `room_variant` (uid string <= 64, variant int 0-7), `room_variant_unlock` (itemId string <= 64, variant int 1-7), `room_rename` (place string, name string <= 24 after trim, no control characters), `room_transfer` (from, to, uid, x, y with the same coordinate limits as `room_move`). Test rules: use `RepoFile(...)` for repo files, inject tables and `Random`/clock instead of assigning statics (`Current`), keep tests deterministic.
Steps:
1. Add the entries.
2. Tests: each validates with a good payload and fails with a missing field, wrong type, a negative or oversize number, an over-long name and a name with a control character.
Prohibited: changing or deleting existing test assertions, new dependencies, touching files outside "Zmieniaj". Names and signatures from earlier waves are given as planned. If the real code differs, use the real code, list each difference in the PR, and continue (do not stop, nobody will answer).
PR: what was done, decisions and why, how to check by hand.
