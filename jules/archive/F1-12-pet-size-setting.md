# Task F1-12: Pet size setting (Small / Big) in the tray menu, sensible default

Read `AGENTS.md` first and follow it.

## Goal
The pig is drawn from 64x64 frames at scale 1, so on a normal laptop screen it is tiny. Add a size choice and pick a
good default.

## Files you may change
`src/Cuy/dotNet/ContextMenus.cs`, `src/Cuy/dotNet/LocalData.cs`, `src/Cuy/dotNet/StartUp.cs`.

## Specification
1. The scale value stored by `LocalData.SetScale/GetScale` (setting `Scale`): make its meaning explicit in a comment and
   use it as the integer sprite scale 1 or 2 everywhere it is read (check how `Xml(scaleFactor)` in `StartUp` uses
   `Program.MyData.GetScale()` and the `iScale` loop in `Xml.cs` that keeps a tile <= 255 px: 64*2 = 128 is fine).
2. Default when the setting has never been written (new install): 2 if the primary screen's `WorkingArea.Height >= 900`
   physical pixels, else 1. Store the chosen default on first start so it never changes by itself afterwards.
3. Tray menu: add a `Size` submenu after `Sounds` with two radio-style items `Small` and `Big` (checked = current). On
   change: `SetScale`, then rebuild the pet with the new sprites without restarting the app (StartUp already has a
   reload path – `LoadNewXMLFromString`/`KillPets`+`AddSheep`; reuse it, keep the pig's horizontal position and its
   game state; log `[Settings] Pet size -> Big`).
4. Anything sized from the pet (status bubble position, poop/food offsets) already uses `petForm.Width/Height` – do not
   change those files; just verify by reading that nothing assumes 64 px (list suspicious spots in the PR, do not fix).

## Checks
- `dotnet build src/Cuy/Cuy.csproj -c Release -p:EnableWindowsTargeting=true` passes.
- PR "Windows check for the human": switch Small/Big several times; the pig keeps its place and keeps walking.

When done, open a pull request against `main` titled `F1-12: Pet size setting`.
