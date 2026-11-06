# PK-P4a: Core: adoption gate and one look source (package, wave P4)
Zmieniaj: src/Cuy.Core/Pigs/AdoptionGate.cs, src/Cuy.Core/GameState.Adoption.cs, assets/data/adoption_gate.json, src/Cuy.Core/Pigs/PigRoster.cs, src/Cuy/Graphics/PigLook.cs, tests/Cuy.Core.Tests/AdoptionGateTests.cs, docs/opt/log/PK-P4a.md
Wymagane: tests/Cuy.Core.Tests/AdoptionGateTests.cs
Weryfikacja: dotnet build src/Cuy.Core/Cuy.Core.csproj -c Release && dotnet test tests/Cuy.Core.Tests/Cuy.Core.Tests.csproj -c Release --filter "FullyQualifiedName~Adoption|FullyQualifiedName~PigLook"
Pytania: nie zadawaj pytań i nie czekaj na odpowiedź. Jeśli czegoś brakuje lub coś jest niejasne, sam wybierz najrozsądniejsze rozwiązanie zgodne z AGENTS.md, zapisz decyzję w logu i dokończ do końca.
Limity (twarde): maks. 25 wywołań narzędzi. Linię Weryfikacja uruchom maks. 2 razy. Czytaj tylko pliki z Zmieniaj/Wymagane oraz zakresy linii znalezione przez grep. Nie diagnozuj niczego spoza Zmieniaj. Gdy test pada na czymś, czego Twoja zmiana nie dotyka: zapisz nazwę testu i 5 linii błędu w logu, status BLOCKED, zakończ. Po błędzie we własnym kodzie wolno jedna poprawka i jeden ponowny bieg, potem zakończ jako BLOCKED. Nie uruchamiaj web-smoke.js (robi to paczka q).
Nie ruszaj: AGENTS.md, docs/archive/, tasks/*, every file not listed in Zmieniaj
Goal: Report: "Start with an ordinary pig; Kuki and Ned come as an adoption after the starter pig reaches a growth stage; before that they are hidden." Tasks P4-01 (C# side) and P4-02 from docs/PLAN_POPRAWEK_UX.md ("Fala P4").
Depends on: P3 merged.

## Steps
1. grep where the starter pig is created and how Kuki/Ned are listed (`Kuki`, `Ned`, `NamedPig`, `PigRoster`, `PigLook` in `src/`). Tests live in tests/Cuy.Core.Tests. Read only matches.
2. Tests first (xUnit, `ManualClock` for time, no real time): `AdoptionGateTests.cs`
   - G1 before the threshold Kuki and Ned are not available (not in roster, not adoptable).
   - G2 threshold = starter pig stage `junior` (value in `assets/data/adoption_gate.json`) plus a random delay of 1-3 days (seeded RNG injected in tests); after it both are available as ONE adoption offer.
   - G3 accepting the offer adds both to the roster with fixed names (rename is rejected for named pigs).
   - G4 old save with Kuki and/or Ned already in the roster loads with the gate open and nothing duplicated.
   - G5 a save without the gate field loads with safe defaults (gate closed, offer not shown).
   - G6 starter pig look != Kuki look (`PigLook` returns the default skin for the starter).
3. Implement `AdoptionGate.cs` (pure Core, no UI), the JSON, the save field with defaults in `GameState.Adoption.cs`, and the starter pig default skin. Do not change the message contract yet (wave P4b does it).
4. Verification line; fix until green. Log (max 10 lines) incl. the new Core API names for P4b.
Prohibited: changing or deleting existing test assertions, new dependencies, touching files outside "Zmieniaj".
Log: write `docs/opt/log/PK-P4a.md` (max 10 lines). Do not run git.
