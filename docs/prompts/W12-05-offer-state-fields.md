# W12-05: Offer clock fields in GameState
Zmieniaj: src/Cuy.Core/GameState.Pigs.cs, tests/Cuy.Core.Tests/OfferStateTests.cs
Wymagane: tests/Cuy.Core.Tests/OfferStateTests.cs
Weryfikacja: dotnet test tests/Cuy.Core.Tests/Cuy.Core.Tests.csproj -c Release
Pytania: nie zadawaj pytań i nie czekaj na odpowiedź. Jeśli czegoś brakuje lub coś jest niejasne, sam wybierz najrozsądniejsze rozwiązanie zgodne z AGENTS.md, zapisz decyzję w opisie PR i dokończ zadanie do końca.
Nie ruszaj: src/Cuy/*, AGENTS.md, docs/*, tasks/*, src/Cuy.Core/Save/SaveSystem.cs
Goal: The save has the fields the adoption offers need: the offers clock start and the set of offers already announced.
Depends on: W11 merged.
Facts: Save rule (AGENTS.md): never delete or rename fields, add new ones with safe defaults so old saves load. `GameState` is serialized with Newtonsoft; look at `GameState.Pigs.cs` for the pattern (list/set properties initialised, null-guarded in `EnsureRosterInitialized`). Test rules: use `RepoFile(...)` for repo files, inject tables and `Random`/clock instead of assigning statics (`Current`), keep tests deterministic.
Steps:
1. Add `public DateTime? OffersStartUtc { get; set; }` (null = not started) and `public HashSet<string> OffersSeen { get; set; } = new HashSet<string>();` (ids of offers whose unlock was announced). Null-guard `OffersSeen` in `EnsureRosterInitialized`.
2. Tests (`OfferStateTests.cs`): a new `GameState` has `OffersStartUtc == null` and an empty set; JSON round trip keeps both; JSON of an old save (without the fields) loads with the defaults and `EnsureRosterInitialized` does not throw; setting `OffersSeen` to null in JSON gives an empty set after `EnsureRosterInitialized`.
Prohibited: changing or deleting existing test assertions, new dependencies, touching files outside "Zmieniaj". Names and signatures from earlier waves are given as planned. If the real code differs, use the real code, list each difference in the PR, and continue (do not stop, nobody will answer).
PR: what was done, decisions and why, how to check by hand.
