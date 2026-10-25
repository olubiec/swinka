# Task F8-03: Settings: reset the game (with confirmation) and choose the monitor

Read `AGENTS.md` first and follow it. Requires F2-08 merged.

## Goal
The settings panel promised a reset with confirmation and a choice of screen for the pig. Neither exists yet.

## Files you may change
`src/Cuy/dotNet/HomeWindow.cs` (messages), `src/Cuy/dotNet/LocalData.cs`, `src/Cuy/dotNet/StartUp.cs` (monitor only),
`src/Cuy.Core/Save/SaveSystem.cs` (only a `ResetKeepingBackup` helper), settings feature JS (from F2-08),
`web/home/bridge.js` (mock), `tests/Cuy.Core.Tests/SaveLoadTests.cs`.

## Specification
1. Reset: button "Start a new pig" in the settings panel. It opens an in-page confirmation (type-to-confirm is NOT needed;
   a two-button dialog "Yes, start again" / "Cancel" with the text "Your pig will start as a baby. Clovers and items are lost.").
   Message `settings_reset_confirmed {}`. C# moves `save.json` to `save.reset-<date>.bak` (never delete), creates a new game,
   restarts the pig with the first-run intro (F-run flow: corner peek, naming), and logs `[Reset] New game started`.
2. Monitor: a dropdown "Show the pig on" listing `Screen.AllScreens` (name and resolution); default = primary. Message
   `settings_monitor { index }`; saved in `LocalData`; the pig moves to that screen's taskbar on change and on start
   (if the monitor is gone, fall back to primary). Taskbar of each monitor is out of scope; say so in the PR.
3. Tests: `ResetKeepingBackup` keeps the old file and creates a fresh save; migration still works on the new one.

## Checks
`dotnet test ... -c Release`; `node --check`; smoke test (open settings, open reset dialog, cancel; assert no reset without
confirm); build passes.

When done, open a pull request against `main` titled `F8-03: Settings reset and monitor`.
