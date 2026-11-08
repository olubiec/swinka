# PK-P4a2: Core: starter pig has its own look (not Kuki)
Zmieniaj: src/Cuy.Core/Pigs/PigRoster.cs, src/Cuy/Graphics/PigLook.cs, tests/Cuy.Core.Tests/PigLookTests.cs, docs/opt/log/PK-P4a2.md
Wymagane: tests/Cuy.Core.Tests/PigLookTests.cs
Weryfikacja: dotnet build src/Cuy.Core/Cuy.Core.csproj -c Release && dotnet test tests/Cuy.Core.Tests/Cuy.Core.Tests.csproj -c Release --filter "FullyQualifiedName~PigLook"
Pytania: nie zadawaj pytań i nie czekaj na odpowiedź. Jeśli czegoś brakuje lub coś jest niejasne, sam wybierz najrozsądniejsze rozwiązanie zgodne z AGENTS.md, zapisz decyzję w logu i dokończ do końca.
Limity (twarde): maks. 25 wywołań narzędzi. Linię Weryfikacja uruchom maks. 2 razy. Czytaj tylko pliki z Zmieniaj/Wymagane oraz zakresy linii znalezione przez grep. Nie diagnozuj niczego spoza Zmieniaj. Gdy test pada na czymś, czego Twoja zmiana nie dotyka: zapisz nazwę testu i 5 linii błędu w logu, status BLOCKED, zakończ. Po błędzie we własnym kodzie wolno jedna poprawka i jeden ponowny bieg, potem zakończ jako BLOCKED. Nie uruchamiaj web-smoke.js (robi to paczka q).
Nie ruszaj: AGENTS.md, docs/archive/, tasks/*, every file not listed in Zmieniaj
Goal: One look source: the starter pig resolves to the default ordinary look on the desktop and in the house, never Kuki's skin. Task P4-01 (C# side) from docs/PLAN_POPRAWEK_UX.md.
Depends on: P3 merged (independent of PK-P4a).

## Pliki i elementy (zweryfikowane w repo 8.11.2026; nie szukaj ich drugi raz)
- `src/Cuy.Core/Pigs/PigRoster.cs`: contains `PigLookResolver` (`Resolve(PigProfile, stageKey)`, `Resolve(breed, coat, stage, namedId)`). The starter pig has no `NamedId`; make sure it resolves to the default skin `blaze_only.ginger` (default coat in the web resolver too) and a null/unknown `namedId` never maps to `kuki`.
- `src/Cuy/Graphics/PigLook.cs`: thin adapter over `PigLookResolver` (2 `Resolve` overloads). Change only if the desktop passes a wrong key for the starter (grep callers of `PigLook.Resolve` in `src/Cuy/dotNet`).
- `web/home/canvas-pig.js`: `KNOWN_NAMED_PIGS` (line 17) includes `cuy`; the web side is done in PK-P4b3, do NOT edit it here.
- `tests/Cuy.Core.Tests/PigLookTests.cs`: create or extend (grep for an existing PigLook test file first).

## Steps
1. Tests first: L1 starter profile (no NamedId, default breed/coat) resolves to default ordinary look; L2 same profile at every `LifeStage` keeps the same coat; L3 Kuki (`NamedId=kuki`) resolves to Kuki sprite key `sprites/pigs/kuki/<stage>/spritesheet.png`, starter does not; L4 unknown namedId falls back to default, not Kuki; L5 desktop `PigLook.Resolve(profile)` equals `PigLookResolver.Resolve(profile)`.
2. Fix `PigRoster.cs`/`PigLook.cs` minimally so the tests pass.
3. Run Weryfikacja. Log: the resolver contract (inputs -> `spriteKey`, `coat`) that PK-P4b3 mirrors in JS.
Prohibited: changing or deleting existing test assertions, new dependencies, touching files outside "Zmieniaj", extra refactors, doing steps of other packages.
Log: write `docs/opt/log/PK-P4a2.md` (max 10 lines: decisions, exact API/field/message names others will use, differences from the plan, BLOCKED reason if any). Do not run git.
