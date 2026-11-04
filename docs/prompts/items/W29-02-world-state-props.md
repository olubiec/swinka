# W29-02: WorldState.DesktopProps: props on the desktop
Zmieniaj: src/Cuy.Core/World/WorldState.cs, tests/Cuy.Core.Tests/WorldStatePropsTests.cs
Wymagane: tests/Cuy.Core.Tests/WorldStatePropsTests.cs
Weryfikacja: dotnet test tests/Cuy.Core.Tests/Cuy.Core.Tests.csproj -c Release
Pytania: nie zadawaj pytań i nie czekaj na odpowiedź. Jeśli czegoś brakuje lub coś jest niejasne, sam wybierz najrozsądniejsze rozwiązanie zgodne z AGENTS.md, zapisz decyzję w opisie PR i dokończ zadanie do końca.
Nie ruszaj: src/Cuy/*, AGENTS.md, docs/*, tasks/*, assets/data/*
Goal: The saved world state remembers which props stand on the desktop and where.
Depends on: W28 merged. Sub-wave W29a: no dependency on other tasks of the wave.
Facts: Additive: `WorldState.DesktopProps` = `List<DesktopProp>`, `DesktopProp { string Uid; string ItemId (inventory id); double X; double Y }` where X and Y are fractions of the work area (0..1) so a changed screen size never loses a prop. Lazy non-null. Test rules: use `RepoFile(...)` for repo files, inject tables and `Random`/clock instead of assigning statics (`Current`), keep tests deterministic.
Steps:
1. Add the types.
2. Tests: defaults; round trip; old world JSON loads; fractions outside 0..1 are clamped by a helper `DesktopProp.Clamp()`.
Prohibited: changing or deleting existing test assertions, new dependencies, touching files outside "Zmieniaj". Names and signatures from earlier waves are given as planned. If the real code differs, use the real code, list each difference in the PR, and continue (do not stop, nobody will answer).
PR: what was done, decisions and why, how to check by hand.
