# Task F4-01: The desktop pig changes its look with the life stage

Read `AGENTS.md` first and follow it. Requires waves 0-3 merged.

## Goal
`Pet.StageChanged` already fires (Baby, Junior, Adult, Senior, Legend) and the art for every stage exists in
`assets/sprites/<baby|junior|adult|senior|legend>/spritesheet.png` (+ `animations.json`, same 16x60 grid of 64 px frames
and the same animation rows in every folder; `junior` exists since the art pass of 26.10.2026: body 0.9 / head 0.94 of adult, between baby and adult). The
desktop pig, however, always uses the single sheet embedded in `Resources/animations.xml`. Make it switch.

## Files you may change
`src/Cuy/dotNet/Xml.cs`, `src/Cuy/dotNet/StartUp.cs`, `src/Cuy/dotNet/BrainController.cs`, `src/Cuy/dotNet/SelfTest.cs`;
new: `src/Cuy/dotNet/SpriteSheetLoader.cs`.

## Specification
1. `SpriteSheetLoader.Load(string stageKey)` returns the list of 64x64 frame bitmaps cut from
   `assets/sprites/<stageKey>/spritesheet.png` (path relative to the exe folder, the folder `assets/` is shipped next to
   `Cuy.exe`; if the file is missing return null and log `[Stage] sheet missing`). Order: frame index = row * 16 + column,
   the same order the embedded sheet uses (verify: slicing `baby` must be pixel-identical to the first frames of the
   embedded sprites; add this as a check in `SelfTest.cs`).
2. After `Xml.ReadXML()`, replace `xml.sprites` with the loaded frames for the pig's current stage
   (`LifeStages.DataKey(pet.Stage)`), applying the same scale step `Xml.cs` already applies to embedded sprites. Keep the
   animation definitions from the XML untouched.
3. On `StageChanged`: rebuild the sprite list and hot-swap it in the running `FormPet` (keep position, facing and the
   current animation; no restart, no flicker). Log `[Stage] Adult -> Senior, sheet reloaded`.
4. A new game starts as Baby; an existing save starts with the stage stored in the save.
5. The status bubble, poop and food offsets already use `petForm.Width/Height`; do not touch them.

## Checks
- `dotnet build src/Cuy/Cuy.csproj -c Release -p:EnableWindowsTargeting=true` passes; `node --check` not needed.
- PR section "Windows check for the human": `Cuy.exe --clock 1440` (or the existing time-multiplier flag) shows the
  pig growing through the stages without restarting.

When done, open a pull request against `main` titled `F4-01: Life stage sprites on the desktop`.
