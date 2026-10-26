# Task F3-04: Mouse shake detector (Core logic + desktop cursor monitor, no reaction yet)

Read `AGENTS.md` first and follow it. Requires waves 0-2 merged.

## Goal
Give the later reactions (F6-02 fear of a shaken mouse, and anything else) one tested signal "the player shakes the mouse near the pig".
This task builds the signal only. It does not change how the pig behaves.

## Files you may change
`src/Cuy.Core/Input/MouseShakeDetector.cs` (exists, see below; change only to fix a failing test), new
`tests/Cuy.Core.Tests/MouseShakeTests.cs`, new `src/Cuy/dotNet/Platform/MouseShakeMonitor.cs`, `src/Cuy/dotNet/SelfTest.cs` (one check).

## Specification
1. Core `Cuy.Core.Input.MouseShakeDetector` already exists (copied from the researched, tested draft): `Push(int x, int y, double distanceToPigPx, DateTime utc)`
   returns true exactly once per shake. Defaults: `MinReversals` 6 horizontal direction changes within `WindowSeconds` 1.0, average speed above
   `MinSpeedPxPerSec` 900, cursor within `MaxDistancePx` 300 of the pig, `DebounceSeconds` 2.0, `MinStepPx` 4 (small jitter ignored). The class is pure
   (no WinForms, no clock), `LangVersion` 7.3. Do not rewrite it. Add `tests/Cuy.Core.Tests/MouseShakeTests.cs` for gaps the existing tests in
   `ReadyMadeComponentsTests.cs` do not cover: a slow wide sweep (not a shake), vertical shaking (not counted, only horizontal reversals),
   `Reset()` clears state, two shakes closer than the debounce count once, a shake after the debounce counts again.
2. `MouseShakeMonitor` (`Cuy.Platform`, WinForms): a `System.Windows.Forms.Timer` every 33 ms (UI thread) reads `Cursor.Position`, computes the distance
   from the cursor to the centre of the pig window (`FormPet` of the main pig; pass a `Func<Point?>` that returns the pig centre so the class does not
   depend on pig internals), pushes into the detector with `DateTime.UtcNow`, and raises `event Action<Point> Shaken` on true. Start/Stop methods; it
   does nothing while stopped; it never throws (try/catch around the tick, log `[Shake] error ...` once). Log each detection as `[Shake] detected`.
   No behaviour consumes it in this task (F6-02 will); do not edit `BrainController.cs` or any behaviour.
3. `SelfTest.cs`: one check that `MouseShakeDetector` flags a synthetic zig-zag track and ignores a straight line (PASS/FAIL format of the file).
4. Important for F6-02: its text describes its own Core `MouseShakeDetector` with `Push(x, y, utc)`. After this task the class already exists with the
   signature above; F6-02 must use it (the pig distance comes from the caller) and must not create a second class.

## Checks
`dotnet test tests/Cuy.Core.Tests/Cuy.Core.Tests.csproj -c Release` passes; `dotnet build src/Cuy/Cuy.csproj -c Release -p:EnableWindowsTargeting=true`.

## Gotowe pliki
- `research/gotowce/src/Cuy.Core/Input/MouseShakeDetector.cs` → `src/Cuy.Core/Input/MouseShakeDetector.cs` (ALREADY copied by the rebuild session, compiles, tested in
  `tests/Cuy.Core.Tests/ReadyMadeComponentsTests.cs`: `Wild_shake_near_the_pig_is_detected_once`, `Normal_mouse_work_is_not_a_shake`, `Shake_far_from_the_pig_is_ignored`).
- `MouseShakeMonitor` has no ready-made file: write it in this task.

## Testy ręczne (ZWERYFIKUJ NA PC)
- `TESTY_RECZNE.md` SHAKE-01: with a Debug build and the monitor started, shake the real mouse next to the pig: the log shows `[Shake] detected` once per shake,
  normal mouse work and drag-and-drop never log it. The default thresholds (900 px/s, 6 reversals) come from the draft, not from a source: tune them by hand.

When done, open a pull request against `main` titled `F3-04: Mouse shake detector`.
