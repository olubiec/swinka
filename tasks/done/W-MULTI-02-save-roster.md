# W-MULTI-02: Multi-pig roster in GameState and safe save migration
Goal: Add Roster and ActivePigIds to GameState with safe backwards-compatible save migration.
Zmieniaj: src/Cuy.Core/GameState.Pigs.cs, src/Cuy.Core/Save/SaveSystem.cs, tests/Cuy.Core.Tests/PigSaveTests.cs
Wymagane: src/Cuy.Core/GameState.Pigs.cs, tests/Cuy.Core.Tests/PigSaveTests.cs
Weryfikacja: dotnet test tests/Cuy.Core.Tests/Cuy.Core.Tests.csproj -c Release
Steps:
1. Create `src/Cuy.Core/GameState.Pigs.cs`:
   - `List<PigProfile> Roster` (defaults to single initial pig with random breed/palette).
   - `List<string> ActivePigIds` (clamped to max 2 pigs).
2. In `SaveSystem.cs`:
   - When loading older saves lacking `Roster`, auto-generate initial profile from existing `Pet.Name` and default look.
3. Unit tests in `PigSaveTests.cs` verifying round-trip JSON serialization and backwards compatibility with version 2/3 saves.

