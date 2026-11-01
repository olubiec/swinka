# W-MULTI-01: Pig profile data model, traits and multi-pig state in Cuy.Core
Goal: Add PigProfile data model supporting breeds, color palettes, personalities and multiple pigs storage.
Zmieniaj: src/Cuy.Core/Pigs/PigProfile.cs, tests/Cuy.Core.Tests/PigCollectionTests.cs
Wymagane: src/Cuy.Core/Pigs/PigProfile.cs, tests/Cuy.Core.Tests/PigCollectionTests.cs
Weryfikacja: dotnet test tests/Cuy.Core.Tests/Cuy.Core.Tests.csproj -c Release
Steps:
1. Create `src/Cuy.Core/Pigs/PigProfile.cs`:
   - `Id` (GUID string), `Name`, `Breed` (smooth, rosette, peruvian, chubby, skinny), `PaletteId` (tricolor, dutch, agouti, albino, cinnamon), `Traits` (List<string>), `DiscoveredTraits` (HashSet<string>).
   - Helper methods: `DiscoverTrait(string trait)`, `IsTraitDiscovered(string trait)`.
2. Add unit tests in `PigCollectionTests.cs` verifying serialization, defaults and traits discovery.
