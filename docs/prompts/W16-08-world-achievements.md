# W16-08: Achievements for the world (8) and their counters
Zmieniaj: assets/data/achievements.json, tests/Cuy.Core.Tests/WorldAchievementsTests.cs
Wymagane: tests/Cuy.Core.Tests/WorldAchievementsTests.cs
Weryfikacja: dotnet test tests/Cuy.Core.Tests/Cuy.Core.Tests.csproj -c Release
Pytania: nie zadawaj pytań i nie czekaj na odpowiedź. Jeśli czegoś brakuje lub coś jest niejasne, sam wybierz najrozsądniejsze rozwiązanie zgodne z AGENTS.md, zapisz decyzję w opisie PR i dokończ zadanie do końca.
Nie ruszaj: src/*, AGENTS.md, docs/*, tasks/*
Goal: Eight achievements reward milestones of the world, driven by counters.
Depends on: W15 merged.
Facts: Same format as W11-05 (`rule: { kind: counter, name, atLeast }`, `reward` clovers). Counters are incremented later in W18: `harvests`, `units_sold`, `items_placed`, `places_unlocked`, `plots_owned`. Rewards (docs/WORLD.md section 6.1): first_harvest 25, green_thumb 75 (25 harvests), market_regular 50 (20 units sold), tidy_nest 50 (10 items placed), garden_party 50 (garden unlocked), grand_park 100 (park unlocked), full_farm 150 (24 plots), home_designer 75 (30 items placed). Total 575. Test rules: use `RepoFile(...)` for repo files, inject tables and `Random`/clock instead of assigning statics (`Current`), keep tests deterministic.
Steps:
1. Append the eight entries (titles in English, `category`: care or social as fits, `hidden` false) keeping the file's format; do not touch other entries.
2. Tests: the eight ids exist once with the exact rules and rewards; ids stay unique; at each counter value the right ones are earned and paid once (follow `AchievementTests.cs`).
Prohibited: changing or deleting existing test assertions, new dependencies, touching files outside "Zmieniaj". Names and signatures from earlier waves are given as planned. If the real code differs, use the real code, list each difference in the PR, and continue (do not stop, nobody will answer).
PR: what was done, decisions and why, how to check by hand.
