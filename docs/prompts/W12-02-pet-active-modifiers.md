# W12-02: Pet.ActiveModifiers: averaged multipliers of the active pigs
Zmieniaj: src/Cuy.Core/Pet.PigModifiers.cs, tests/Cuy.Core.Tests/PetActiveModifiersTests.cs
Wymagane: src/Cuy.Core/Pet.PigModifiers.cs, tests/Cuy.Core.Tests/PetActiveModifiersTests.cs
Weryfikacja: dotnet test tests/Cuy.Core.Tests/Cuy.Core.Tests.csproj -c Release
Pytania: nie zadawaj pytań i nie czekaj na odpowiedź. Jeśli czegoś brakuje lub coś jest niejasne, sam wybierz najrozsądniejsze rozwiązanie zgodne z AGENTS.md, zapisz decyzję w opisie PR i dokończ zadanie do końca.
Nie ruszaj: src/Cuy/*, AGENTS.md, docs/*, tasks/*, src/Cuy.Core/Pet.cs
Goal: `Pet` exposes the multipliers of the active pigs (average, clamped), neutral unless the feature flag is on.
Depends on: W11 merged (PigModifiers, NamedPigCatalog, PigProfile fields, Balance flags).
Facts: `Pet` is a `partial` class; follow `Pet.Hay.cs` for how a table is held (injectable property with a lazy default). The roster is `State.Roster`, the active pigs are `State.ActivePigIds` (at most 2). A pig is named when `PigProfile.NamedId` is set. A memorial pig (`PigProfile.Memorial`) never contributes. Flag: `Balance.PigModifiersActive` (default false). Design: docs/NAMED_PIGS.md section 3. Test rules: use `RepoFile(...)` for repo files, inject tables and `Random`/clock instead of assigning statics (`Current`), keep tests deterministic.
Steps:
1. Add `public NamedPigCatalog NamedPigs { get; set; }` (null means `NamedPigCatalog.Current`) and `public PigModifiers ActiveModifiers { get; }` computed on demand: when the flag is off, or no active named non-memorial pig exists, return `PigModifiers.Neutral`; otherwise `PigModifiers.AverageClamped` of the active named pigs' modifiers with the catalog limits.
2. Tests (`PetActiveModifiersTests.cs`, inject a catalog built from the real `pigs_named.json`): flag off returns neutral even with Ned active; Ned alone gives appetite 1.3; Ned + Glen average appetite to 1.0 and activity to 0.725; an unnamed (randomly adopted) pig is ignored, so Ned + an adopted pig gives Ned's values; a memorial Ned is ignored; empty roster gives neutral; switching the active pig changes the result immediately.
Prohibited: changing or deleting existing test assertions, new dependencies, touching files outside "Zmieniaj". Names and signatures from earlier waves are given as planned. If the real code differs, use the real code, list each difference in the PR, and continue (do not stop, nobody will answer).
PR: what was done, decisions and why, how to check by hand.
