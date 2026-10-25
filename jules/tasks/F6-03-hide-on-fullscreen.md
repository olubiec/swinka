# Task F6-03: The pig leaves quietly during games, films and presentations

Read `AGENTS.md` first and follow it. Requires F4-09 and F1-05 (`EdgePeekScene`) merged.

## Specification
1. `FullscreenHideBehavior`: every 5 s call `SHQueryUserNotificationState` (shell32 P/Invoke, ignore failures). Hide when the
   state is `QUNS_BUSY`, `QUNS_RUNNING_D3D_FULL_SCREEN` or `QUNS_PRESENTATION_MODE` for two checks in a row (10 s); show again
   after two normal checks. Also reuse `SoundManager.IsFullScreenOrBusy()` as a second opinion; hide only when at least one
   of the two says so.
2. Hide: the pig walks calmly to the nearest edge and leaves (reuse `EdgePeekScene`), then the pet form, poop forms, food
   forms and the status bubble are hidden (add small `HideAll()/ShowAll()` methods to `PoopManager`/`FoodManager`).
   Show: all forms return and the pig peeks in from the edge, then lives on.
3. Core: `Pet.SetAway(bool)` (new `Pet.Away.cs`): while away, needs decay like offline (multiplier from `actions.json`
   `offline`, floor 20) and the poop timer is paused. Tests in `tests/Cuy.Core.Tests/AwayTests.cs`.
4. No sounds while away (already by `SoundManager`), no reminders (F2-02 care cards) are shown; they appear after returning.
5. Never trigger while `FirstRunIntro` runs. Log `[Away] ...`.

## Checks
`dotnet test ... -c Release`; build passes. PR "Windows check": play a video fullscreen, leave, come back.

When done, open a pull request against `main` titled `F6-03: Hide on fullscreen`.
