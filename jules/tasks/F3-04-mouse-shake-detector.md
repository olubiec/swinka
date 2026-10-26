# Task F3-04: Mouse shake signal (tests for the Core detector + desktop cursor monitor, no reaction yet)

Read `AGENTS.md` first and follow it. Requires waves 0-2 merged; it does not depend on F2-02 or F2-07.

## Goal
Give later reactions (F6-02 fear of a shaken mouse, anything else) one tested signal: "the player shakes the mouse near the pig".
This task builds and tests the signal only. It does not change how the pig behaves.

## Research status (read this, it limits what you may claim)
- R16.1: the PowerToys "Find My Mouse" shake code was NOT read, and no other open-source shake detector with numbers was found. So none of the
  detector's five numbers (6 reversals, 1.0 s, 900 px/s, 300 px, 2 s debounce, 4 px step) has a source. They are tunable draft defaults:
  do NOT change them, do NOT describe them as researched; put the comment `// not sourced (R16.1): tune on the PC, see SHAKE-01` above them.
- R16.2 (Microsoft Learn, `GetMouseMovePointsEx`): returns up to 64 recent points with time stamps; with several monitors it may fail or return wrong
  values for negative coordinates (use the virtual-screen metrics); the `MOUSEMOVEPOINT` layout and a .NET P/Invoke sample were not verified. So this task polls
  `Cursor.Position` as specified and does NOT use `GetMouseMovePointsEx` (optional later improvement, manual test SHAKE-02). No source was found on the CPU cost of
  30 Hz polling or on antivirus flags for `GetCursorPos`: do not claim either way.

## Facts about the repo (checked on main, 26.10.2026; do not re-derive)
- `src/Cuy.Core/Input/MouseShakeDetector.cs` exists (Core, netstandard2.0, C# 7.3, pure, no clock): `bool Push(int x, int y, double distanceToPigPx, DateTime utc)` returns true
  exactly once per shake; `Reset()`; properties `MinReversals`=6, `WindowSeconds`=1.0, `MinSpeedPxPerSec`=900, `MaxDistancePx`=300, `DebounceSeconds`=2.0, `MinStepPx`=4.
  Only horizontal direction changes (`dx`) are counted; the speed uses the full path length (dx and dy); after a hit the reversal counter is cleared and the detector is
  quiet for `DebounceSeconds`; its ring buffers hold 64 samples (1 s at 60 Hz).
- Three tests already exist in `tests/Cuy.Core.Tests/ReadyMadeComponentsTests.cs` (`Wild_shake_near_the_pig_is_detected_once`, `Normal_mouse_work_is_not_a_shake`,
  `Shake_far_from_the_pig_is_ignored`, 60 Hz samples). Do not duplicate them.
- `src/Cuy/dotNet/Platform/` does not exist yet; create it. The namespace for platform code is `Cuy.Platform` (F6-01 uses the same). `src/Cuy/Cuy.csproj` is SDK-style, so new
  files are compiled without editing the project.
- The app is PerMonitorV2 DPI aware (`src/Cuy/Properties/app.manifest`), so `Cursor.Position` and a form's `Bounds` are in the same physical-pixel space: compare them directly,
  do not scale.
- The main pig window is `FormPet.ActivePet` (static; companions are not `ActivePet`). `FormPet.NextStep()` already starts `EdgePeekDirector.EnsureStarted()` inside
  `if (Visible)`; `EdgePeekDirector` reads `--peek-test` from the command line the same way.

## Files you may change / add
New `tests/Cuy.Core.Tests/MouseShakeTests.cs`; new `src/Cuy/dotNet/Platform/MouseShakeMonitor.cs`; `src/Cuy/dotNet/SelfTest.cs` (one check);
`src/Cuy/dotNet/FormPet.cs` (only the 4-line Debug hook in step 4; keep the file's encoding, BOM and line endings); `src/Cuy.Core/Input/MouseShakeDetector.cs` only to add the
comment above and to fix a bug that a failing new test proves.
Conflict note: F3-03 also edits `SelfTest.cs` and adds its checks directly after `Check("sounds", CheckSounds);`. Add YOURS directly before `Check("save folder writable", ...)`
and put the helper method at the end of the class, so the hunks do not overlap.

## Steps
1. `MouseShakeTests.cs` (xUnit; build tracks in code, sample every 33 ms like the monitor will, pass distance 100 unless a test says otherwise). Cover what the existing tests do not:
   - `Slow_wide_sweep_is_not_a_shake`: sweep 0 -> 800 -> 0 px over 4 s, no hit.
   - `Vertical_shaking_is_not_counted`: x constant, y zig-zag +/-100 px with a 200 ms period (fast), no hit.
   - `Reset_clears_state`: feed 4 reversals (about 0.4 s of shaking, no hit), `Reset()`, feed 3 reversals immediately after (about 0.3 s, no hit); add a comment that without `Reset()` those 7
     reversals inside one second would be a shake.
   - `Monitor_rate_shake_is_detected_once`: triangle wave, amplitude 150 px, period 200 ms, sampled every 33 ms for 1.5 s: exactly one hit.
   - `Two_shakes_inside_the_debounce_count_once`: continue the shake of the previous test for another 0.8 s right after the hit (the shake ends before the 2 s debounce is over): still one hit in total.
   - `Shake_after_the_debounce_counts_again`: shake 1 s, hold the cursor still for 3 s, shake 1 s: two hits in total.
   If one of these fails, first check your track against the rules above; change the detector only for a real bug and say so in the PR.
2. `MouseShakeMonitor` (`Cuy.Platform`, `IDisposable`):
   - Constructor `MouseShakeMonitor(Func<Point?> pigCenter)` (no dependency on pig internals); `event Action<Point> Shaken`; `Start()`, `Stop()`, `Dispose()`; owns one
     `MouseShakeDetector` with default settings.
   - A `System.Windows.Forms.Timer`, `Interval = 33`, UI thread. Tick: read `Cursor.Position`; `var c = pigCenter()`; if `c` is null call `detector.Reset()` and return; distance =
     Euclidean distance from the cursor to `c`; `if (detector.Push(p.X, p.Y, distance, DateTime.UtcNow))` log `[Shake] detected` and raise `Shaken(p)`.
   - It does nothing while stopped (the timer is stopped; `Start()` after `Stop()` begins with a `Reset()`). The whole tick is in try/catch; the first exception logs
     `[Shake] error <message>` once and later ones are silent. Use `BrainController.Log`.
3. `SelfTest.cs`: `Check("mouse shake detector", CheckMouseShake)`: a synthetic zig-zag track (as in the Monitor-rate test) is flagged exactly once and a straight line of the same
   length is never flagged. Same PASS/FAIL format as the file.
4. Debug-only manual hook, so SHAKE-01 can be run: in `MouseShakeMonitor` add `public static void EnsureDebugStarted()` wrapped in `#if DEBUG`: only when the command line contains
   `--shake-test`, once, it creates a monitor whose `pigCenter` is `() => FormPet.ActivePet != null && FormPet.ActivePet.Visible ? (Point?)new Point(b.Left + b.Width / 2, b.Top +
   b.Height / 2) : null` (`b = FormPet.ActivePet.Bounds`), starts it, and only logs (`[Shake] detected` comes from the monitor). Call it from `FormPet.NextStep()` directly after
   `EdgePeekDirector.EnsureStarted();` inside `#if DEBUG ... #endif`. Nothing in Release starts the monitor.
5. No behaviour consumes the signal: do not edit `BrainController.cs` or any `Behavior` class. F6-02 must use this detector (`Push(x, y, distance, utc)`, the pig distance comes
   from its caller) and must not create a second detector class.

## Checks
`dotnet test tests/Cuy.Core.Tests/Cuy.Core.Tests.csproj -c Release` passes; `dotnet build src/Cuy/Cuy.csproj -c Release -p:EnableWindowsTargeting=true`; no new package.

## Gotowe pliki
- `research/gotowce/src/Cuy.Core/Input/MouseShakeDetector.cs` is ALREADY in `src/Cuy.Core/Input/` (compiles, three tests exist). `MouseShakeMonitor` has no ready file: write it.

## Testy ręczne (ZWERYFIKUJ NA PC)
- SHAKE-01: Debug build, start `Cuy.exe --shake-test`, shake the real mouse next to the pig: `cuy.log` shows `[Shake] detected` once per shake; normal mouse work, dragging a window
  and drag-and-drop never log it. The thresholds come from a draft, not from a source: tune them by hand and write the values you settle on in `TESTY_RECZNE.md`.
- SHAKE-02 (optional, later): compare 33 ms polling with `GetMouseMovePointsEx` (up to 64 recent points with time stamps) on a two-monitor PC with a monitor left of the primary
  one (negative coordinates).

When done, open a pull request against `main` titled `F3-04: Mouse shake detector and monitor`.
