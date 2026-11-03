# W29-04: Pet.Props: move toys between the desktop and the house
Zmieniaj: src/Cuy.Core/Pet.Props.cs, src/Cuy.Core/Balance.cs, tests/Cuy.Core.Tests/PetPropsTests.cs
Wymagane: src/Cuy.Core/Pet.Props.cs, tests/Cuy.Core.Tests/PetPropsTests.cs
Weryfikacja: dotnet test tests/Cuy.Core.Tests/Cuy.Core.Tests.csproj -c Release
Pytania: nie zadawaj pytań i nie czekaj na odpowiedź. Jeśli czegoś brakuje lub coś jest niejasne, sam wybierz najrozsądniejsze rozwiązanie zgodne z AGENTS.md, zapisz decyzję w opisie PR i dokończ zadanie do końca.
Nie ruszaj: src/Cuy/*, AGENTS.md, docs/*, tasks/*, assets/data/*
Goal: A pet can put toys on the desktop, drop them into a room and take them back.
Depends on: W28 merged. Read `docs/DESKTOP_PROPS.md`. Sub-wave W29c: start only after W29-03 is merged (this task uses their code).
Facts: Add the flag `PropsActive` (default false; on in W30-09). Behind it. Wraps `DesktopPropOps` with the pet's state; `Props()` returns desktop list, room items of kind prop and free copies. Migration on first use: every owned prop-capable item that the audit says is currently shown on the desktop is put on the desktop once (`WorldState.DesktopProps`), the rest stay free; with the flag off nothing changes. Counter `props_placed` (each `ToRoom`). A prop that is in a room can still be used by the pig in the Home view only visually; Brain actions keep using the desktop copy if one exists, else the action is simply unavailable (document what the audit says about availability). Test rules: use `RepoFile(...)` for repo files, inject tables and `Random`/clock instead of assigning statics (`Current`), keep tests deterministic.
Steps:
1. Implement `PutOnDesktop`, `MoveOnDesktop`, `ToRoom`, `FromRoom`, `Props` and the migration.
2. Tests: round trip desktop -> room -> desktop; counts stay consistent; migration puts existing toys on the desktop once; flag off changes nothing.
Prohibited: changing or deleting existing test assertions, new dependencies, touching files outside "Zmieniaj". Names and signatures from earlier waves are given as planned. If the real code differs, use the real code, list each difference in the PR, and continue (do not stop, nobody will answer).
PR: what was done, decisions and why, how to check by hand.
