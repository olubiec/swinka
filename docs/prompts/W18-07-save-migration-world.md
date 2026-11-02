# W18-07: Save: world state version, memory corner unlock, migration on open
Zmieniaj: src/Cuy.Core/GameState.World.cs, tests/Cuy.Core.Tests/WorldMigrationTests.cs
Wymagane: tests/Cuy.Core.Tests/WorldMigrationTests.cs
Weryfikacja: dotnet test tests/Cuy.Core.Tests/Cuy.Core.Tests.csproj -c Release
Pytania: nie zadawaj pytań i nie czekaj na odpowiedź. Jeśli czegoś brakuje lub coś jest niejasne, sam wybierz najrozsądniejsze rozwiązanie zgodne z AGENTS.md, zapisz decyzję w opisie PR i dokończ zadanie do końca.
Nie ruszaj: src/Cuy/*, AGENTS.md, docs/*, tasks/*, src/Cuy.Core/Save/SaveSystem.cs, src/Cuy.Core/Pet.cs
Goal: Opening any older save yields a valid world state; the memory corner unlocks with the first memorial pig.
Depends on: W17 merged.
Facts: Add to `GameState.World.cs` (it holds the lazy property from W16-06): `public void EnsureWorld(WorldItemCatalog items, ItemCatalog catalog)` that runs `LegacyDecorMigration.Migrate` once, makes sure the salon layout exists, and (when any roster pig has `Memorial`) grants one `memory_corner` into `OwnedItems`. Do not bump `GameState.CurrentVersion`. Call sites come later (W22-01); tests call it directly. Test rules: use `RepoFile(...)` for repo files, inject tables and `Random`/clock instead of assigning statics (`Current`), keep tests deterministic.
Steps:
1. Implement `EnsureWorld` idempotently.
2. Tests: an old save JSON (from `tests/Cuy.Core.Tests` fixtures, e.g. a save with decor equipped) loads, `EnsureWorld` produces the salon with the placed legacy items; running it twice changes nothing; a roster with a memorial pig grants exactly one memory corner and a non-memorial roster none; a very old save without any new fields loads and round-trips.
Prohibited: changing or deleting existing test assertions, new dependencies, touching files outside "Zmieniaj". Names and signatures from earlier waves are given as planned. If the real code differs, use the real code, list each difference in the PR, and continue (do not stop, nobody will answer).
PR: what was done, decisions and why, how to check by hand.
