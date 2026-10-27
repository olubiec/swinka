# Task W3-03: The pig leaves quietly during games, films and presentations

Read `AGENTS.md` first and follow it (its rules about assertions and the PR description apply to this task).
Requires: W2-01 (behaviors) merged and W2-06 (settings, touches `SoundManager.cs`) merged. Edge peeks (F1-05) are on main.
Replaces old task(s): F6-03. Older F-numbers inside the text below are the old ids; the mapping table is in `jules/PLAN.md`.

## Design (changed after research R13)
Logic of Chromium `ui/base/fullscreen_win.cc` (BSD-3): the shell state `QUNS_RUNNING_D3D_FULL_SCREEN` or `QUNS_PRESENTATION_MODE` from
`SHQueryUserNotificationState`, **`QUNS_BUSY` is NOT used** (it is also set by borderless games and browser F11 and it is
undocumented as a fullscreen signal; Chromium and PowerToys ignore it), plus the geometry of the foreground window: it must cover its whole
monitor. A normal maximised window overhangs its monitor by about 8 px and keeps `WS_THICKFRAME`, so it does not match; the desktop
(`Progman`, `WorkerW` hosting `SHELLDLL_DefView`) and the taskbar never count (idea of Flow Launcher's `IsForegroundWindowFullscreen`; do
not copy its code, its licence is unconfirmed).

## Files you may change
New: `src/Cuy/dotNet/Platform/FullscreenDetector.cs`, `src/Cuy/dotNet/Behaviors/FullscreenHideBehavior.cs`, `src/Cuy.Core/Pet.Away.cs`,
`tests/Cuy.Core.Tests/AwayTests.cs`; edit `src/Cuy/dotNet/SoundManager.cs` (only `IsFullScreenOrBusy()`), `PoopManager.cs`/`FoodManager.cs`
(`HideAll()/ShowAll()`), `FormPet` hide helpers if missing.

## Specification
1. `FullscreenDetector.Check()` (static, never throws, call every 2-5 s): returns `Result { IsFullscreen, ShellBusy, MonitorBounds, Reason }`
   and `Covers(Point)` for a point on the full-screen window's monitor. `ShellBusy` is only reported for the log, never used to hide.
   If the shell says D3D/presentation but no covering foreground window exists, assume the primary monitor (like Chromium).
2. `FullscreenHideBehavior`: check every 3 s; leave after 2 positive checks, come back after 2 negative ones; hide only when
   `Covers(pig position)` (a game on another monitor does not hide the pig). Never during `FirstRunIntro`, a drag or a toss.
   Hide: the pig walks calmly to the nearest edge and leaves (reuse `EdgePeekScene`), then the pet form, poop forms, food forms and the
   status bubble are hidden. Show: all return and the pig peeks in from the edge, then lives on.
3. Core: `Pet.SetAway(bool)` (new `Pet.Away.cs`): while away, needs decay like offline (multiplier from `actions.json` `offline`, floor 20)
   and the poop timer is paused. Tests in `tests/Cuy.Core.Tests/AwayTests.cs`.
4. Bug fix: `SoundManager.IsFullScreenOrBusy()` treats a click on the desktop (`Progman`/`WorkerW`) and `QUNS_BUSY` as full screen. Replace its
   body with `FullscreenDetector.Check().IsFullscreen`. Add a regression test only where Core is involved; note the manual test in the PR.
5. No sounds while away (already by `SoundManager`), no care reminders while away. Log every state change as `[Away] ...` with
   `Result.Reason`.
6. Optional: log the raw state (state value, class name, rect, styles) to `cuy.log` once per change (needed for the F6-09 probe).

## Checks
`dotnet test ... -c Release`; build passes.

## Gotowe pliki
- `research/gotowce/src/Cuy/dotNet/Platform/FullscreenDetector.cs` → `src/Cuy/dotNet/Platform/FullscreenDetector.cs` (copy, then compile).
- `research/gotowce/src/Cuy/dotNet/Behaviors/FullscreenHideBehavior.cs` → `src/Cuy/dotNet/Behaviors/FullscreenHideBehavior.cs` (copy, then compile;
  it expects `Pet.SetAway`, `PoopManager/FoodManager HideAll/ShowAll`, `FormPet.HideStatusBubble`, which this task adds).
- Files under `research/gotowce/src/Cuy/` were never compiled (they need Windows + .NET Framework 4.8): use them as the starting point and fix compile errors in this task. Files already copied into `src/Cuy.Core/` and `tests/Cuy.Core.Tests/` by the rebuild session compile and are tested.

## Testy ręczne (ZWERYFIKUJ NA PC)
UNVERIFIED in the sources (R13.1-R13.3); the human measures each with the F6-09 probe (`TESTY_RECZNE.md` FS-01..FS-10):
- Borderless game, browser F11, YouTube fullscreen, PowerPoint slide show, Teams/Zoom screen share, Focus assist: which state values appear?
- Maximised Chrome, Edge, Explorer and Office on Windows 11 must NOT hide the pig; clicking the desktop must NOT hide it.
- Second monitor and Alt+Tab out of a game.

When done, open a pull request against `main` titled `W3-03: Hide on fullscreen`.
