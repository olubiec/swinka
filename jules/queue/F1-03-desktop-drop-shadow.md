# Task F1-03: Ground shadow under the desktop pig while it is held, thrown or falling

Read `AGENTS.md` first and follow it.

## Goal
When the user lifts the pig with the mouse (drag), throws it (toss) or it falls, a soft dark ellipse stays on the
ground below it: the higher the pig, the smaller and lighter the shadow. On the ground the shadow is hidden (the sprites
have no separate shadow and do not need one while standing).

## Files you may change / add
new `src/Cuy/dotNet/ShadowForm.cs`; `src/Cuy/dotNet/FormPet.Motion.cs` (hook calls only). Do not edit `FormPet.cs`.

## Specification
1. `ShadowForm`: borderless, `ShowInTaskbar=false`, `TopMost=true`, click-through (`WS_EX_TRANSPARENT | WS_EX_LAYERED |
   WS_EX_TOOLWINDOW | WS_EX_NOACTIVATE` in `CreateParams`), never takes focus (`ShowWithoutActivation` true). Draw with
   per-pixel alpha via `UpdateLayeredWindow` (32bpp premultiplied ARGB bitmap) so edges are soft: an ellipse colour
   `#2b1712`, alpha from the centre `a` to 0 at the edge.
2. `public static void Update(FormPet pet)`: called from the motion timer tick in `FormPet.Motion.cs` (about 120 Hz);
   create the single shadow lazily. Visible only when `pet.IsDragging || pet.IsTossing || pet.CurrentAnimationName` is
   `fall`/`toss`/`drag`/`held`; otherwise hide.
3. Ground under the pig: x = pet centre (`pet.Left + pet.Width/2`); default ground y = bottom of the working area of the
   screen containing that x. If a visible, non-minimised top-level window (not a Cuy window, not tool windows) has its
   top edge between the pig's feet (`pet.Top + 59*scale`) and that ground, and spans x, the ground is that top edge
   (use `EnumWindows` + `GetWindowRect` + `IsWindowVisible`, like FormPet's window landing; implement it here, cache the
   window list for 100 ms).
4. Height h = ground y - feet y (>= 0). Shadow width = bodyWidth * clamp(1 - h/500, 0.35, 1) where bodyWidth =
   38*scale; height = width/4; alpha a = 0.45 * clamp(1 - h/500, 0.15, 1). Centre at (x, ground y - height/2).
5. Hide the shadow when the pig is inside Home (pet not visible) and on app exit (dispose).

## Checks
- `dotnet build src/Cuy/Cuy.csproj -c Release -p:EnableWindowsTargeting=true` passes.
- PR description: "Windows check for the human": drag the pig up and down over the taskbar and over a window, throw
  it; the shadow follows on the ground and shrinks with height; it disappears when the pig stands.

When done, open a pull request against `main` titled `F1-03: Ground shadow while the pig is lifted or falling`.
