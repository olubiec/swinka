# W18-06: Diary templates for the farm, garden and market
Zmieniaj: assets/data/diary.json, tests/Cuy.Core.Tests/WorldDiaryTests.cs
Wymagane: tests/Cuy.Core.Tests/WorldDiaryTests.cs
Weryfikacja: dotnet test tests/Cuy.Core.Tests/Cuy.Core.Tests.csproj -c Release
Pytania: nie zadawaj pytań i nie czekaj na odpowiedź. Jeśli czegoś brakuje lub coś jest niejasne, sam wybierz najrozsądniejsze rozwiązanie zgodne z AGENTS.md, zapisz decyzję w opisie PR i dokończ zadanie do końca.
Nie ruszaj: src/*, AGENTS.md, docs/*, tasks/*
Goal: The diary has at least 12 new lines about harvests, walks, the market and the home.
Depends on: W17 merged.
Facts: `assets/data/diary.json` holds Tracery-style templates (`docs/diary-grammar.md` explains the grammar and tags; `DiaryTemplatesTests.cs` shows the validations: min counts, no unknown symbols, no Polish words). Add new templates keyed to events: first harvest of the day, a great harvest, a sale at the market, a full order, a walk in the garden, a new decoration placed, a new place unlocked, a rare veg eaten fresh from the farm. English, warm tone, the pig's voice, no mention of money amounts. Test rules: use `RepoFile(...)` for repo files, inject tables and `Random`/clock instead of assigning statics (`Current`), keep tests deterministic.
Steps:
1. Append at least 12 templates (and the symbols they need) without changing existing ones.
2. Tests (`WorldDiaryTests.cs`): the 12 new ids exist, parse with the real grammar, produce non-empty text for 50 random seeds, contain no unresolved `#symbol#`, and no Polish letters.
Prohibited: changing or deleting existing test assertions, new dependencies, touching files outside "Zmieniaj". Names and signatures from earlier waves are given as planned. If the real code differs, use the real code, list each difference in the PR, and continue (do not stop, nobody will answer).
PR: what was done, decisions and why, how to check by hand.
