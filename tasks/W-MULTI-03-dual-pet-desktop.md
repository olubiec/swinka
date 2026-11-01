# W-MULTI-03: Support running up to 2 pet forms concurrently in WinForms desktop
Goal: Allow BrainController to instantiate and coordinate up to 2 desktop pig windows.
Zmieniaj: src/Cuy/dotNet/BrainController.cs, src/Cuy/dotNet/FormPet.cs
Wymagane: src/Cuy/dotNet/BrainController.cs
Weryfikacja: dotnet build src/Cuy/Cuy.csproj -c Release -p:EnableWindowsTargeting=true
Steps:
1. In `BrainController.cs`:
   - Manage `List<FormPet> ActivePets` instead of a single pet window.
   - When starting up, create `FormPet` instances for all IDs in `GameState.ActivePigIds` (up to 2).
2. In `FormPet.cs`:
   - Accept specific `PigProfile` to configure window properties.
   - Proximity check: when distance between pet 1 and pet 2 is < 80px, trigger mutual sniff or popcorn hop.
