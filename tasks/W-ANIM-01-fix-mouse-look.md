# W-ANIM-01: Fix mouse tracking eye direction in FormPet and InteractionManager
Goal: The guinea pig looks in the correct direction towards the cursor without horizontal sprite inversion.
Zmieniaj: src/Cuy/dotNet/FormPet.Motion.cs, src/Cuy/dotNet/InteractionManager.cs
Wymagane: src/Cuy/dotNet/FormPet.Motion.cs
Weryfikacja: dotnet build src/Cuy/Cuy.csproj -c Release -p:EnableWindowsTargeting=true; dotnet test tests/Cuy.Core.Tests/Cuy.Core.Tests.csproj -c Release
Rules: Do not touch test assertions. Never flip symmetrical front_look sprites (frames 352-356).
Steps:
1. In `src/Cuy/dotNet/FormPet.Motion.cs`, in `GetSprite(int index)`, ensure front-facing frames (index >= 340 && index <= 360) are never flipped with RotateNoneFlipX, even when `spritesFlipped` is true.
2. In `src/Cuy/dotNet/InteractionManager.cs`, verify that when cursor is left of the pig (dx < 0), it shows frame 352, when right (dx > 0) frame 353, when above (dy < 0) frame 354, when below (dy > 0) frame 355.
3. Verify build and tests pass.

