# W5-03: The desktop pig changes its look with the life stage, without a restart
Zmieniaj: src/Cuy/dotNet/Xml.cs, src/Cuy/dotNet/StartUp.cs, src/Cuy/dotNet/BrainController.cs, src/Cuy/dotNet/FormPet.cs
Wymagane: src/Cuy/dotNet/Xml.cs
Weryfikacja: dotnet build src/Cuy/Cuy.csproj -c Release -p:EnableWindowsTargeting=true
Nie ruszaj: src/Cuy/dotNet/SelfTest.cs, AGENTS.md, docs/PLAN.md, tasks/*
Goal: When `Pet.StageChanged` fires, the pig on the desktop switches to the sprite sheet of the new stage, keeping position, facing and the current animation.
Depends on: W4-02 (`SpriteSheetLoader`) merged. W4-08 touched `FormPet.cs` (keep it).
Facts: Today `Xml.UseExternalSheet` picks `assets/sprites/<stage>/spritesheet.png` ONCE at start (when it has the same size as the embedded sheet) and `FormPet` keeps a reference to the shared `Xml` (`xml.sprites`). Nothing reacts to `StageChanged` on the desktop (`HomeWindow` only refreshes its state). Art for all five stages exists with the same 16x60 grid of 64 px frames.
Steps:
1. Make `Xml` able to rebuild `sprites` for a given stage (use `SpriteSheetLoader`; keep the scale step `Xml` already applies to embedded sprites, and keep the animation definitions untouched). If the stage sheet is missing or has a different size, keep the current sprites and log `[WARN]`.
2. On `Pet.StageChanged` (subscribe once in `BrainController` or `StartUp`) rebuild the sprite list and hot-swap it in the running `FormPet` (all pig forms): keep position, facing and the current animation frame, no restart, no visible flicker. Dispose the old bitmaps only after the swap. Log `[Stage] Adult -> Senior, sheet reloaded`.
3. A new game starts as Baby; an existing save starts with the stage stored in the save (already true at start; do not break it).
Prohibited: changing or deleting existing test assertions, new dependencies, touching files outside "Zmieniaj". Names and signatures from earlier waves are given as planned. If the real code differs, use the real code, list each difference in the PR, and continue (do not stop, nobody will answer).
PR: what was done, decisions and why, how to check by hand; "Windows check for the human": `Cuy.exe --clock 1440` (the existing time-multiplier flag, Debug build) shows the pig growing through the stages without restarting..
