# W24-06: Diary lines for pig rooms
Zmieniaj: assets/data/diary.json, tests/Cuy.Core.Tests/PigRoomDiaryTests.cs
Wymagane: tests/Cuy.Core.Tests/PigRoomDiaryTests.cs
Weryfikacja: dotnet test tests/Cuy.Core.Tests/Cuy.Core.Tests.csproj -c Release
Pytania: nie zadawaj pytań i nie czekaj na odpowiedź. Jeśli czegoś brakuje lub coś jest niejasne, sam wybierz najrozsądniejsze rozwiązanie zgodne z AGENTS.md, zapisz decyzję w opisie PR i dokończ zadanie do końca.
Nie ruszaj: src/*, AGENTS.md, docs/*, tasks/*
Goal: The diary has at least 10 new lines about the pig's own room and the shared bedroom.
Depends on: W23 merged. Sub-wave W24a: no dependency on other tasks of the wave.
Facts: Same rules as W18-06 (`docs/diary-grammar.md`, `DiaryTemplatesTests.cs`). Events: a new decoration in my room, I got my own room, a recoloured item, rename of the room, a cosy evening in my room, moved in with a friend (shared bedroom), napping next to a friend, a visit to my memory room (soft wording, no mention of death). English, the pig's voice, warm, no amounts. Test rules: use `RepoFile(...)` for repo files, inject tables and `Random`/clock instead of assigning statics (`Current`), keep tests deterministic.
Steps:
1. Append at least 10 templates (and symbols) without changing existing ones.
2. Tests: the ids exist, parse, give non-empty text for 50 seeds, contain no unresolved `#symbol#`, no Polish letters, and none of the words dead/died/death.
Prohibited: changing or deleting existing test assertions, new dependencies, touching files outside "Zmieniaj". Names and signatures from earlier waves are given as planned. If the real code differs, use the real code, list each difference in the PR, and continue (do not stop, nobody will answer).
PR: what was done, decisions and why, how to check by hand.
