# Task F1-02: Poops must be visible when they appear (not hidden under a resting pig)

Read `AGENTS.md` first and follow it.

## Bug
When the pig rests or sleeps for a long time, the poops it makes are not visible. When the user picks the pig up,
several poops suddenly appear around it. Cause: `PoopManager.TrySpawnPoop` (`src/Cuy/dotNet/PoopManager.cs`) places the
poop at `petX + 4` / `petX + petW - 24` and `petY + petH - 26`, i.e. inside the pig sprite's body (the pig is drawn in the
middle of a 64x64 frame scaled by the pet scale), and the topmost pig window covers it. It also plays the `poop`
animation even while the pig sleeps.

## Files you may change
`src/Cuy/dotNet/PoopManager.cs`, `src/Cuy/dotNet/PoopForm.cs`.

## Required behaviour
1. Position: the poop lies on the same surface just BEHIND the pig's body, fully outside it. The body spans x 15..52 of
   the 64 px frame (feet at y 59); scale = `petForm.Width / 64.0`. Facing right (`!petForm.IsFacingLeft`): poop right edge
   = pet left + 13*scale; facing left: poop left edge = pet left + 54*scale. Vertical: poop bottom = pet top + 61*scale
   (on the floor line), clamped to the working area / window top.
2. Spread: if another active poop (from `_activePoops`) already overlaps the new rectangle, shift the new one further away
   from the pig in 14 px steps (max 6 steps); if no free spot, place it anyway at the last step.
3. Z-order: after showing a poop, call the pig form's `TopMost` refresh so the pig stays above, but poops are never
   covered because they are outside the body.
4. While the pig sleeps or lies (`BrainController.Instance.IsCurrentlySleeping()`, or current animation in
   `sleep`, `doze`, `lie_down`, `sleep_house`), do NOT play the `poop` animation; just drop the poop silently.
5. Log line stays as today (position, surface, count).

## Checks
- `dotnet build src/Cuy/Cuy.csproj -c Release -p:EnableWindowsTargeting=true` passes.
- Explain the coordinate math in the PR with one worked example (scale 1 and scale 2, both facings).
- PR description: "Windows check for the human": Debug build, tray → Clock 60x, wait for 3 poops while the pig sleeps;
  they must be visible next to it.

When done, open a pull request against `main` titled `F1-02: Visible poops next to a resting pig`.
