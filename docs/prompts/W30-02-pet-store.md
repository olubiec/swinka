# W30-02: Pet.Store: one purchase entry for the home store
Zmieniaj: src/Cuy.Core/Pet.Store.cs, tests/Cuy.Core.Tests/PetStoreTests.cs
Wymagane: src/Cuy.Core/Pet.Store.cs, tests/Cuy.Core.Tests/PetStoreTests.cs
Weryfikacja: dotnet test tests/Cuy.Core.Tests/Cuy.Core.Tests.csproj -c Release
Pytania: nie zadawaj pytań i nie czekaj na odpowiedź. Jeśli czegoś brakuje lub coś jest niejasne, sam wybierz najrozsądniejsze rozwiązanie zgodne z AGENTS.md, zapisz decyzję w opisie PR i dokończ zadanie do końca.
Nie ruszaj: src/Cuy/*, AGENTS.md, docs/*, tasks/*, assets/data/*
Goal: A pet routes every home purchase through one method that returns a clear result.
Depends on: W29 merged.
Facts: A thin facade, no new rules: `StoreResult Purchase(string kind, string id, int count)` calls the existing methods: `BuyItem` (W18-02), `UnlockPlace`/`UnlockRoom`/`UpgradePlace` (W18-01), `UnlockDorm`/`UpgradeDorm` (W26-02), `UnlockVariant` (W24-03), farm upgrades (`BuyPlotPack`, `BuyOrchardSlot`, `BuyCan`, `BuySprinkler`, W18-03), `BuyBigStall` (W18-04), and the old decor purchase (`Buy` of `items_decor`). `StoreResult { Ok, NotEnoughClovers, Locked, MaxLevel, Unknown, Disabled }` with the clovers spent. A purchase that costs the player nothing else changes nothing else. No selling. Test rules: use `RepoFile(...)` for repo files, inject tables and `Random`/clock instead of assigning statics (`Current`), keep tests deterministic.
Steps:
1. Implement and test one purchase of each kind.
2. Tests: each kind succeeds with enough clovers and leaves the right balance; locked rows refuse with `Locked`; unknown kind/id `Unknown`; selling is impossible (no method), asserted by reflection that no public method name starts with `Sell` in this file.
Prohibited: changing or deleting existing test assertions, new dependencies, touching files outside "Zmieniaj". Names and signatures from earlier waves are given as planned. If the real code differs, use the real code, list each difference in the PR, and continue (do not stop, nobody will answer).
PR: what was done, decisions and why, how to check by hand.
