# W3-08: Tricks: data table and the Core rules for performing a trick
Zmieniaj: assets/data/tricks.json, src/Cuy.Core/Tricks/TricksConfig.cs, src/Cuy.Core/Pet.Tricks.cs, tests/Cuy.Core.Tests/TricksTests.cs
Wymagane: assets/data/tricks.json, tests/Cuy.Core.Tests/TricksTests.cs
Weryfikacja: dotnet test tests/Cuy.Core.Tests/Cuy.Core.Tests.csproj -c Release
Pytania: nie zadawaj pytań i nie czekaj na odpowiedź. Jeśli czegoś brakuje lub coś jest niejasne, sam wybierz najrozsądniejsze rozwiązanie zgodne z AGENTS.md, zapisz decyzję w opisie PR i dokończ zadanie do końca.
Nie ruszaj: src/Cuy.Core/Pet.cs, src/Cuy.Core/Balance.cs, AGENTS.md, docs/PLAN.md, tasks/*
Goal: Core knows the tricks, when each unlocks (bond level), and whether the pig can perform one now.
Depends on: W1-06 (`BondUnlocks`, `Pet.IsUnlocked`) merged. Facts: the unlock ids in `assets/data/bond.json` are `trick_spin`, `trick_stand_up`, `trick_popcorn`, `trick_hurdle`; follow the data-table pattern of `EconomyConfig` / `BondUnlocks` (static `Current`, `Load(string)`, `LoadDefault()` with logging through `ItemCatalog.ErrorLogger`, injectable `Pet.TricksTable` so tests never touch statics); tests find files with the `RepoFile` helper. `Pet.Energy`, `Pet.Mood`, `Pet.AddBondPoints`, `Pet.IsSleeping`, `Pet.Count` exist.
Steps:
1. `tricks.json`: `{ "energy_cost": 10, "min_energy": 25, "cooldown_seconds": 30, "bond_points": 2, "mood_gain": 3, "tricks": [ { "id": "spin", "unlock": "trick_spin", "title": "Spin" }, { "id": "stand_up", "unlock": "trick_stand_up", "title": "Stand up" }, { "id": "popcorn", "unlock": "trick_popcorn", "title": "Popcorn jump" }, { "id": "hurdle", "unlock": "trick_hurdle", "title": "Hurdle jump" } ] }` (snake_case keys; load with the same naming strategy as `care.json`).
2. `TricksConfig`: `Current`, `Load(string json)`, `LoadDefault()`, code defaults identical to the file; invalid entries (empty id, duplicate id) are dropped and logged.
3. `Pet.Tricks.cs`: `public TricksConfig TricksTable` (null means `TricksConfig.Current`), `IEnumerable<TrickInfo> GetTricks()` (id, title, unlocked), `TrickResult TryPerformTrick(string id)` with the enum `TrickResult { Ok, Unknown, Locked, Tired, Cooldown, Sleeping }`. Check order: Unknown, Sleeping, Locked (`IsUnlocked(unlock)`), Tired (energy below `min_energy`), Cooldown (`cooldown_seconds` since the last trick, using `Clock`, last time kept in a non-saved field). On Ok: energy minus `energy_cost`, mood plus `mood_gain` (clamped 0-100), `AddBondPoints(bond_points)`, counters `tricks_performed` and `trick_<id>` each plus one.
4. Tests: the real `tricks.json` loads with 4 tricks; each result of the order above (set bond level and energy by the same helpers the other tests use); cooldown ends after 30 s of `ManualClock`; counters; invalid JSON falls back to defaults without throwing; with level 1 every trick is `Locked`.
Verify: `dotnet test tests/Cuy.Core.Tests/Cuy.Core.Tests.csproj -c Release` passes.
Prohibited: changing or deleting existing test assertions, new dependencies, touching files outside "Change".
PR: what was done, decisions and why, how to check by hand.
