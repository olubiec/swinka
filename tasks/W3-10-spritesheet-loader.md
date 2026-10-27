# W3-10: Spritesheet loader for stage looks
Goal: the desktop app can cut single frames out of a stage spritesheet PNG, and reports clearly when the sheet is missing.
Depends on: nothing from this wave. Facts: sheets live at `assets/sprites/<stage>/spritesheet.png`, 16 columns, frame index = row * 16 + col, frame size is read from `assets/sprites/<stage>/frames.json` when it exists, else 64x64. Nothing uses the loader yet (hot-swap comes in a later wave).
Change: new `src/Cuy/dotNet/Graphics/SpriteSheetLoader.cs` (create the folder if it does not exist; if a similar folder already exists use it and say so), new `tests/Cuy.Core.Tests/` is NOT used (desktop code is net48): add the check to `src/Cuy/dotNet/SelfTest.cs` instead
Do not touch: everything not listed under Change; in particular `AGENTS.md`, `docs/PLAN.md`, `tasks/*`, `FormPet.cs`, `BrainController.cs`.
Steps:
1. `SpriteSheetLoader`: `static Bitmap[] Load(string stage)` returns the frames (cached per stage, thread-safe), or null and logs `[Stage] sheet missing: <stage>` once per stage when the file is absent or unreadable. `static Bitmap GetFrame(string stage, int index)` returns null for a missing sheet or an out-of-range index (never throws). Frames are cloned out of the sheet, the sheet file is not left locked (load through a `MemoryStream`).
2. `SelfTest.cs`: add check `spritesheet`: loading a stage with no sheet returns null and does not throw; if a real sheet exists in `assets/sprites`, frame 0 is not null.
Verify: `dotnet build src/Cuy/Cuy.csproj -c Release -p:EnableWindowsTargeting=true` passes.
Prohibited: changing or deleting existing test assertions, new dependencies, touching files outside "Change".
PR: what was done, decisions and why, how to check by hand; "Windows check for the human": `Cuy.exe --selftest` shows the `spritesheet` check as OK.
