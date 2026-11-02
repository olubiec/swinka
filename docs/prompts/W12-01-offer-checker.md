# W12-01: OfferChecker: which adoption offers are unlocked
Zmieniaj: src/Cuy.Core/Pigs/OfferChecker.cs, tests/Cuy.Core.Tests/OfferCheckerTests.cs
Wymagane: src/Cuy.Core/Pigs/OfferChecker.cs, tests/Cuy.Core.Tests/OfferCheckerTests.cs
Weryfikacja: dotnet test tests/Cuy.Core.Tests/Cuy.Core.Tests.csproj -c Release
Pytania: nie zadawaj pytań i nie czekaj na odpowiedź. Jeśli czegoś brakuje lub coś jest niejasne, sam wybierz najrozsądniejsze rozwiązanie zgodne z AGENTS.md, zapisz decyzję w opisie PR i dokończ zadanie do końca.
Nie ruszaj: src/Cuy/*, AGENTS.md, docs/*, tasks/*, assets/data/pigs_named.json
Goal: A pure, idempotent helper says which named-pig offers are unlocked at a given time, and the status of every offer for the UI.
Depends on: W11 merged (NamedPigCatalog, NamedPigDefinition).
Facts: Design: docs/NAMED_PIGS.md section 2.1. Offers come from `NamedPigDefinition.OfferAfterDays`, `OfferCost`, `OfferGroup`. The offers clock starts at `offersStartUtc` (real days). An offer stays available until adopted. No file access, no `DateTime.UtcNow`: the time is a parameter. Test rules: use `RepoFile(...)` for repo files, inject tables and `Random`/clock instead of assigning statics (`Current`), keep tests deterministic.
Steps:
1. `public sealed class OfferStatus` with `Id`, `Name`, `Unlocked` (bool), `DaysLeft` (double, 0 when unlocked), `Cost`, `Group` (string or null), `Adopted` (bool).
2. `public static class OfferChecker` with `IReadOnlyList<NamedPigDefinition> Due(IReadOnlyList<NamedPigDefinition> pigs, DateTime offersStartUtc, DateTime nowUtc, ISet<string> alreadySeen)`: pigs whose `offersStartUtc + OfferAfterDays` has passed and whose id is not in `alreadySeen`, in file order. `IReadOnlyList<OfferStatus> StatusFor(IReadOnlyList<NamedPigDefinition> pigs, DateTime offersStartUtc, DateTime nowUtc, ISet<string> adoptedNamedIds)`.
3. Rules: a null or empty list gives an empty result; a `nowUtc` before `offersStartUtc` unlocks only offers with `OfferAfterDays == 0`; calling `Due` twice with the same `alreadySeen` after adding its results returns an empty list (idempotent).
4. Tests (`OfferCheckerTests.cs`, build the definitions from `NamedPigCatalog.Load(File.ReadAllText(RepoFile("assets/data/pigs_named.json")))`): at day 0 only kuki and ned are due; at day 89.99 james is not due and at 90 he is; glen at 105 and racuch at 130 (tolerance 0.01 day); after a jump of 140 days all five are due once, in file order; an unadopted offer is still due after 400 days; `StatusFor` reports `DaysLeft` 90 for james at day 0 and 0 when unlocked; adopted ids are marked `Adopted`.
Prohibited: changing or deleting existing test assertions, new dependencies, touching files outside "Zmieniaj". Names and signatures from earlier waves are given as planned. If the real code differs, use the real code, list each difference in the PR, and continue (do not stop, nobody will answer).
PR: what was done, decisions and why, how to check by hand.
