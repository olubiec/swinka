# W30-06: Test: the store total matches the simulator and nothing can be sold
Zmieniaj: tests/Cuy.Core.Tests/HomeStoreTotalsTests.cs
Wymagane: tests/Cuy.Core.Tests/HomeStoreTotalsTests.cs
Weryfikacja: dotnet test tests/Cuy.Core.Tests/Cuy.Core.Tests.csproj -c Release
Pytania: nie zadawaj pytań i nie czekaj na odpowiedź. Jeśli czegoś brakuje lub coś jest niejasne, sam wybierz najrozsądniejsze rozwiązanie zgodne z AGENTS.md, zapisz decyzję w opisie PR i dokończ zadanie do końca.
Nie ruszaj: src/Cuy/*, AGENTS.md, docs/*, tasks/*, assets/data/*
Goal: A test checks that the home store lists exactly what the simulator counts and that there is no way to sell a decoration.
Depends on: W29 merged. Sub-wave W30b: start only after W30-01 is merged (this task uses its code).
Facts: The simulator `tools/qa/economy-sim.js --variant full` (already complete, with `--check`) counts total purchasable content of about 48653 clovers (stress and sane models give the same total). `HomeStore.Rows` (W30-01) lists the purchasable things of one save. A save with all five pigs adopted, the garden unlocked and every room present should list rows whose prices (counting one furnishing set per pig room and for the shared bedroom, as the simulator does: the 14 purchasable house items without signature and prop items) sum to within 3 percent of 48653 minus the stall, farm and market rows that the store does not list in the simulator's `world` part (compute the expected number in the test from the data files with the same rule as the simulator; document the formula in a comment). Test rules: use `RepoFile(...)` for repo files, inject tables and `Random`/clock instead of assigning statics (`Current`), keep tests deterministic.
Steps:
1. Write `HomeStoreTotalsTests`. No production code.
2. Tests: the computed total is within 3 percent of 48653; every row price equals the data value; no row has a negative or zero price unless it is `free`; there are no rows for signature or prop items; reflection finds no public method on `Pet` or `HomeStore` whose name contains `Sell` and takes a placeable id (selling crops at the market is allowed and is the only `Sell`); a purchase of any row followed by the inverse is impossible (no refund API).
Prohibited: changing or deleting existing test assertions, new dependencies, touching files outside "Zmieniaj". Names and signatures from earlier waves are given as planned. If the real code differs, use the real code, list each difference in the PR, and continue (do not stop, nobody will answer).
PR: what was done, decisions and why, how to check by hand.
