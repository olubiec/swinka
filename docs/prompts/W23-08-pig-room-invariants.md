# W23-08: Test: pig room data keeps the economy invariants
Zmieniaj: tests/Cuy.Core.Tests/PigRoomInvariantsTests.cs
Wymagane: tests/Cuy.Core.Tests/PigRoomInvariantsTests.cs
Weryfikacja: dotnet test tests/Cuy.Core.Tests/Cuy.Core.Tests.csproj -c Release
Pytania: nie zadawaj pytań i nie czekaj na odpowiedź. Jeśli czegoś brakuje lub coś jest niejasne, sam wybierz najrozsądniejsze rozwiązanie zgodne z AGENTS.md, zapisz decyzję w opisie PR i dokończ zadanie do końca.
Nie ruszaj: src/Cuy/*, AGENTS.md, docs/*, tasks/*, assets/data/*
Goal: A test reads the real data and enforces the same sink totals and price relations as the simulator.
Depends on: W22 merged. Sub-wave W23a: no dependency on other tasks of the wave.
Facts: The simulator `tools/qa/economy-sim.js` (variants `pigrooms`, `full`, with `--check`) already exists and measured: new sinks 23603 clovers for `full` (levels of 5 pig rooms 6500, furnishing 5 x 1980, shared bedroom 4400 + furnishing 1980, colours 543, run 280), 16400 for `pigrooms`; do not edit the simulator here. This task puts the same numbers under a C# test so that a data change that breaks the economy fails `dotnet test`. Read the data with `RepoFile` and the real loaders (`PigRoomConfig`, `HomeEconomyConfig`, `WorldItemCatalog`, `PlaceCatalog`). Test rules: use `RepoFile(...)` for repo files, inject tables and `Random`/clock instead of assigning statics (`Current`), keep tests deterministic.
Steps:
1. Write `PigRoomInvariantsTests`. No production code.
2. Tests: (1) the sum of pig room level costs for 5 pigs is between 5000 and 8000; (2) furnishing sum = sum of prices of the house items that are not free, not signature and not props, times 6 rooms (5 pig rooms + the shared bedroom), is between 10000 and 14000; (3) shared bedroom: unlock + level costs between 3500 and 5000; (4) the whole new sink (1 + 2 + 3 + colour prices of `recolor` items at `HomeEconomyConfig.VariantPrice` x 3 + gate and 16 fence pieces) is between 15000 and 30000; (5) levels grow in size and in cost, the first level of every room is free; (6) comfort weights are ordered and own is 1.0; (7) the best comfort per clover of the purchasable house items is not above 0.06 comfort per clover (so comfort stays a long-term sink); (8) no free item has a variant price above 0; (9) `resale.allowed` is false; (10) the maximum possible mood slow-down in `PlaceCatalog` is still 0.15.
Prohibited: changing or deleting existing test assertions, new dependencies, touching files outside "Zmieniaj". Names and signatures from earlier waves are given as planned. If the real code differs, use the real code, list each difference in the PR, and continue (do not stop, nobody will answer).
PR: what was done, decisions and why, how to check by hand.
