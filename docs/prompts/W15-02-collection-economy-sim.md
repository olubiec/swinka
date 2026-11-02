# W15-02: Timeline and economy invariants for the collection
Zmieniaj: tools/Cuy.Simulator/Program.cs, docs/economy-report.md, tests/Cuy.Core.Tests/CollectionInvariantsTests.cs
Wymagane: tests/Cuy.Core.Tests/CollectionInvariantsTests.cs
Weryfikacja: dotnet test tests/Cuy.Core.Tests/Cuy.Core.Tests.csproj -c Release
Pytania: nie zadawaj pytań i nie czekaj na odpowiedź. Jeśli czegoś brakuje lub coś jest niejasne, sam wybierz najrozsądniejsze rozwiązanie zgodne z AGENTS.md, zapisz decyzję w opisie PR i dokończ zadanie do końca.
Nie ruszaj: src/*, AGENTS.md, tasks/*
Goal: A test and a simulator mode prove that the collection does not break the economy or the timeline.
Depends on: W15-01 can run in the same wave; use the planned names.
Facts: Invariants are listed in docs/NAMED_PIGS.md section 4.5 (1-7). The simulator `tools/Cuy.Simulator` already produces `docs/economy-report.md` (profiles Casual, Regular, Heavy over 60 days). Add a section for the pair Kuki + Ned and for each pair from the collection with `PigModifiersActive` on. Keep the existing report sections byte-for-byte except the new section appended at the end. Test rules: use `RepoFile(...)` for repo files, inject tables and `Random`/clock instead of assigning statics (`Current`), keep tests deterministic.
Steps:
1. Test: every modifier within 0.5-1.5 and empty roster neutral; offers at days 90/105/130 (tolerance 0.01), still available after 400 days; after a 140-day jump all three offers are unlocked once; 1000 seeded legend rolls respect the ranges and kuki < ned in at least 95 percent; mini-game income per day never exceeds 150 for any pair.
2. Simulator: new `--collection` option (or section in `--full`) running 60 days for Kuki+Ned and each other pair; compare total clovers with the single-pig baseline and fail the run (exit code 1) when a pair deviates by more than 10 percent; write the table to the end of `docs/economy-report.md`.
Prohibited: changing or deleting existing test assertions, new dependencies, touching files outside "Zmieniaj". Names and signatures from earlier waves are given as planned. If the real code differs, use the real code, list each difference in the PR, and continue (do not stop, nobody will answer).
PR: what was done, decisions and why, how to check by hand.
