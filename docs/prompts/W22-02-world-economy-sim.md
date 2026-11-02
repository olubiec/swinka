# W22-02: Port the economy simulator and enforce the world invariants
Zmieniaj: tools/Cuy.Simulator/Program.cs, docs/economy-report.md, tests/Cuy.Core.Tests/WorldInvariantsTests.cs
Wymagane: tests/Cuy.Core.Tests/WorldInvariantsTests.cs
Weryfikacja: dotnet test tests/Cuy.Core.Tests/Cuy.Core.Tests.csproj -c Release && node tools/qa/economy-sim.js --runs 12 --variant baseline --check
Pytania: nie zadawaj pytań i nie czekaj na odpowiedź. Jeśli czegoś brakuje lub coś jest niejasne, sam wybierz najrozsądniejsze rozwiązanie zgodne z AGENTS.md, zapisz decyzję w opisie PR i dokończ zadanie do końca.
Nie ruszaj: src/*, web/*, AGENTS.md, tasks/*
Goal: The C# simulator and a test enforce the same thresholds as `tools/qa/economy-sim.js`.
Depends on: W21 merged.
Facts: Read `tools/qa/economy-sim.js` (the reference model) and docs/WORLD.md sections 6.3 and 6.4. The test builds a `Pet` with the real data and runs a compact version of the model: five profiles for 365 days with a seeded `Random` and a `ManualClock`, using the real `FarmEngine`, `MarketPricing`, `PlaceUnlock`. Thresholds (same as `--check`): regular does not own half of the content before day 150, casual before 200, heavy before 90; nobody owns all content within a year; farm benefit share <= 30 percent (regular), 35 (casual), 20 (heavy); the perfect player <= 25 percent; sales never above the cap. Keep the check tolerant (+-10 percent) because the C# model differs in detail; document differences in the report. Append a section 'World economy' to `docs/economy-report.md` with the tables; keep older sections unchanged. Test rules: use `RepoFile(...)` for repo files, inject tables and `Random`/clock instead of assigning statics (`Current`), keep tests deterministic.
Steps:
1. Add `--world` to the simulator printing the milestone table; add the test with the thresholds above; append the report section.
Prohibited: changing or deleting existing test assertions, new dependencies, touching files outside "Zmieniaj". Names and signatures from earlier waves are given as planned. If the real code differs, use the real code, list each difference in the PR, and continue (do not stop, nobody will answer).
PR: what was done, decisions and why, how to check by hand.
