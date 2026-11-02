# W22-06: Test: save size and load time with a full world
Zmieniaj: tests/Cuy.Core.Tests/WorldSaveSizeTests.cs
Wymagane: tests/Cuy.Core.Tests/WorldSaveSizeTests.cs
Weryfikacja: dotnet test tests/Cuy.Core.Tests/Cuy.Core.Tests.csproj -c Release
Pytania: nie zadawaj pytań i nie czekaj na odpowiedź. Jeśli czegoś brakuje lub coś jest niejasne, sam wybierz najrozsądniejsze rozwiązanie zgodne z AGENTS.md, zapisz decyzję w opisie PR i dokończ zadanie do końca.
Nie ruszaj: src/*, web/*, AGENTS.md, docs/*, tasks/*
Goal: A full world (24 plots, orchard, 300 placed items) saves under 200 KB and loads fast.
Depends on: W21 merged.
Facts: Build a `GameState` with the maximum world (all places unlocked, 5 rooms/places with up to 60 items each totalling 300, 24 plots planted, 4 orchard slots, market state with demand for all crops, 7 pigs in the roster), serialize with the same settings as `SaveSystem`, assert length < 200 KB, deserialize and compare key counts, and assert the whole round trip takes less than 500 ms (generous). Use a temp directory from the existing test helpers. Test rules: use `RepoFile(...)` for repo files, inject tables and `Random`/clock instead of assigning statics (`Current`), keep tests deterministic.
Steps:
1. Write the test only; do not change production code.
Prohibited: changing or deleting existing test assertions, new dependencies, touching files outside "Zmieniaj". Names and signatures from earlier waves are given as planned. If the real code differs, use the real code, list each difference in the PR, and continue (do not stop, nobody will answer).
PR: what was done, decisions and why, how to check by hand.
