# W23-06: Flags and achievements for pig rooms and the shared bedroom
Zmieniaj: src/Cuy.Core/Balance.cs, assets/data/achievements.json, tests/Cuy.Core.Tests/PigRoomFlagsTests.cs
Wymagane: tests/Cuy.Core.Tests/PigRoomFlagsTests.cs
Weryfikacja: dotnet test tests/Cuy.Core.Tests/Cuy.Core.Tests.csproj -c Release
Pytania: nie zadawaj pytań i nie czekaj na odpowiedź. Jeśli czegoś brakuje lub coś jest niejasne, sam wybierz najrozsądniejsze rozwiązanie zgodne z AGENTS.md, zapisz decyzję w opisie PR i dokończ zadanie do końca.
Nie ruszaj: src/Cuy/*, AGENTS.md, docs/*, tasks/*, assets/data/*
Goal: Two flags (off) and three achievements exist.
Depends on: W22 merged.
Facts: Flags: `PigRoomsActive`, `DormActive` (bool, default false; do not switch them on in `GameSession.Open`, that is W26-08). Achievements (format as W11-05 and W16-08, `rule: {kind: counter, name, atLeast}`): `own_room` (counter `pig_room_items` >= 5, reward 25), `every_pig_home` (counter `pig_rooms_furnished` >= 5, reward 100), `shared_nest` (counter `dorm_unlocked` >= 1, reward 75). Counters are incremented in W24 and W26. Total 200 clovers. Test rules: use `RepoFile(...)` for repo files, inject tables and `Random`/clock instead of assigning statics (`Current`), keep tests deterministic.
Steps:
1. Add the flags with XML doc lines and the three entries (English titles/descriptions, category `care` or `social`).
2. Tests: flags default false and are independent of the older flags; the three ids exist once with the exact rules and rewards; each is earned and paid once at its threshold (follow `AchievementTests.cs`).
Prohibited: changing or deleting existing test assertions, new dependencies, touching files outside "Zmieniaj". Names and signatures from earlier waves are given as planned. If the real code differs, use the real code, list each difference in the PR, and continue (do not stop, nobody will answer).
PR: what was done, decisions and why, how to check by hand.
