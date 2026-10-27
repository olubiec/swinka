<!-- SUPERSEDED: the Tick and the card already exist (PR #32). The new W2-01 replaces this file. -->
# W2-01: Calendar: reminders from the desktop pig
Goal: when a care task is due, the desktop pig wheeks and the reminder card appears above it.
Depends on: W1-01 (CareReminderForm) and W1-02 (CalendarFeature) merged.
Change: `src/Cuy/dotNet/Features/CalendarFeature.cs`
Do not touch: everything not listed under Change; in particular `AGENTS.md`, `docs/PLAN.md`, `tasks/*`.
Steps:
1. Add `Tick` (every 30 real seconds): ask `CareSchedule.GetDue(now)`; show the card for the earliest due task only if it was not shown in this session in the last 20 minutes, the user is active (`Win32Input.GetIdleTime()` below 3 minutes), there is no full-screen app (use `SoundManager.IsFullScreenOrBusy()` as it is), Home is closed and the first-run scene is over (`!pet.State.NeedsNaming`).
2. Before showing: `brain.RequestAnimation("wheek")` and `SoundManager.Instance?.PlayWheek("reminder")`. Create `CareReminderForm` with the task icon (`CareReminderForm.IconFor`), title and text from the task definition.
3. Callbacks: Done runs the same Core path as the `calendar_done` message; Later snoozes with `pet.SnoozeCare(id, minutes)` (use the method the `calendar_snooze` handler uses); then `HomeWindow.NotifyStateChanged()`. `calendar_done` and `calendar_snooze` from Home also call `CareReminderForm.CloseCurrent(taskId)`.
4. Only one card at a time; a card that auto-hides may come back after 20 minutes; log every show/hide as `[Calendar] ...`.
Verify: `dotnet build src/Cuy/Cuy.csproj -c Release -p:EnableWindowsTargeting=true` and `dotnet test tests/Cuy.Core.Tests/Cuy.Core.Tests.csproj -c Release` pass.
Prohibited: changing or deleting existing test assertions, new dependencies, touching files outside "Change".
PR: what was done, decisions and why, how to check by hand; "Windows check for the human": set a task time 2 minutes ahead (Settings or the save), wait; the pig wheeks, the card appears, Done gives clovers once; screenshot if the change is visual.
