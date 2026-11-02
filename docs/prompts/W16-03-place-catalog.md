# W16-03: PlaceCatalog (loader for places.json)
Zmieniaj: src/Cuy.Core/World/PlaceCatalog.cs, tests/Cuy.Core.Tests/PlaceCatalogTests.cs
Wymagane: src/Cuy.Core/World/PlaceCatalog.cs, tests/Cuy.Core.Tests/PlaceCatalogTests.cs
Weryfikacja: dotnet test tests/Cuy.Core.Tests/Cuy.Core.Tests.csproj -c Release
Pytania: nie zadawaj pytań i nie czekaj na odpowiedź. Jeśli czegoś brakuje lub coś jest niejasne, sam wybierz najrozsądniejsze rozwiązanie zgodne z AGENTS.md, zapisz decyzję w opisie PR i dokończ zadanie do końca.
Nie ruszaj: src/Cuy/*, AGENTS.md, docs/*, tasks/*, assets/data/*
Goal: Core loads places, rooms, levels, comfort and walk settings.
Depends on: W15 merged.
Facts: Pattern as W16-01. `assets/data/places.json`: `places[]` (`house` with `rooms[]` salon/bedroom/playroom each with `levels[{cols,rows,cost}]`; `garden`, `park` with `levels`; `farm` with `requires`, `welcome_items`; `market`), `grid{wall_rows}`, `comfort{cap, mood_decay_reduction_at_cap}`, `walk{per_day, mood, min_comfort_garden}`. Costs: garden 400, farm 600, park 1200, bedroom 470, playroom 660. Test rules: use `RepoFile(...)` for repo files, inject tables and `Random`/clock instead of assigning statics (`Current`), keep tests deterministic.
Steps:
1. Types: `PlaceDefinition` (`Id`, `Name`, `UnlockedAtStart`, `Cost`, `Requires`, `Levels`, `Rooms`, `WelcomeItems`), `RoomDefinition` (`Id`, `Name`, `UnlockedAtStart`, `Cost`, `Levels`), `GridLevel` (`Cols`, `Rows`, `Cost`); `PlaceCatalog` with `Current/Load/LoadDefault`, `Find(id)`, `FindRoom(id)`, `WallRows`, `ComfortCap`, `MoodDecayReductionAtCap`, `WalkPerDay`, `WalkMood`, `WalkMinComfortGarden`.
2. Rules: a `requires` id that is not a place is dropped and logged; a level list must start at cost 0 (otherwise the first level is forced to 0 and logged); `comfort.cap` clamped 10-500; reduction clamped 0-0.5.
3. Tests: five places; house has three rooms; salon has three levels 12x7, 16x8, 20x9; farm requires garden; park requires garden; wall rows 2; unknown fields ignored; broken JSON gives a minimal default (house with salon only, market).
Prohibited: changing or deleting existing test assertions, new dependencies, touching files outside "Zmieniaj". Names and signatures from earlier waves are given as planned. If the real code differs, use the real code, list each difference in the PR, and continue (do not stop, nobody will answer).
PR: what was done, decisions and why, how to check by hand.
