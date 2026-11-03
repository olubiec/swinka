# W24-02: Per-pig comfort in mood decay
Zmieniaj: src/Cuy.Core/Pet.Rooms.cs, tests/Cuy.Core.Tests/PetPigComfortTests.cs
Wymagane: tests/Cuy.Core.Tests/PetPigComfortTests.cs
Weryfikacja: dotnet test tests/Cuy.Core.Tests/Cuy.Core.Tests.csproj -c Release
Pytania: nie zadawaj pytań i nie czekaj na odpowiedź. Jeśli czegoś brakuje lub coś jest niejasne, sam wybierz najrozsądniejsze rozwiązanie zgodne z AGENTS.md, zapisz decyzję w opisie PR i dokończ zadanie do końca.
Nie ruszaj: src/Cuy/*, AGENTS.md, docs/*, tasks/*, assets/data/*
Goal: Mood decay uses the average comfort factor of the active pigs when pig rooms are on.
Depends on: W23 merged.
Facts: W18-02 added the hook method in `Pet.Rooms.cs` that returns `Comfort.MoodDecayFactor(...)` for the whole world when `WorldDecorActive` is on. Change only that method: when `PigRoomsActive` is also on, return `PigComfort.AverageFactor(activePigs, ...)` (active pigs = the roster entries with `Active` true and not `Memorial`; use the accessors that `Pet.ActiveModifiers` (W12-02) uses to find active pigs). With the flag off the result is identical to before. Do not touch `Pet.cs`. Test rules: use `RepoFile(...)` for repo files, inject tables and `Random`/clock instead of assigning statics (`Current`), keep tests deterministic.
Steps:
1. Implement the switch.
2. Tests: flag off equals the old factor; with two active pigs, one with a full room (factor 0.85) and one with an empty room (1.0) the factor is 0.925; a memorial pig is ignored; no active named pigs gives the old world-wide factor; 10 simulated hours of decay differ by the expected amount.
Prohibited: changing or deleting existing test assertions, new dependencies, touching files outside "Zmieniaj". Names and signatures from earlier waves are given as planned. If the real code differs, use the real code, list each difference in the PR, and continue (do not stop, nobody will answer).
PR: what was done, decisions and why, how to check by hand.
