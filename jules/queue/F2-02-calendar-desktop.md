# Task F2-02: Care calendar – C# feature and reminders from the desktop pig

Read `AGENTS.md` and `jules/contracts.md` (section **calendar**) first and follow them exactly.
Requires F1-01 (feature plugins), F1-06 (economy) and F1-07 (care core) merged.

## Goal
1. `CalendarFeature` (C#) serves the `calendar` state and messages for the Home page (built in parallel, task F2-01).
2. When a care task becomes due, the desktop pig reminds the player: it walks a little toward the screen centre, wheeks
   once, and a small pixel reminder card appears above it with the task, **Done** and **Later**.

## Files you may add
`src/Cuy/dotNet/Features/CalendarFeature.cs`, `src/Cuy/dotNet/CareReminderForm.cs`. Do not edit other files.

## Specification
1. `CalendarFeature : HomeFeatureBase`, `Id = "calendar"`:
   - `AddState`: build the contract object from `pet.State.Care`, the task definitions (`assets/data/care.json`, loaded
     once via the Core loader from F1-07), `CareSchedule` (due/next due), history (last 62 days), weights, alerts
     (`pet.WeightAlerts()`), economy numbers (`EconomyConfig.Current.CareTask`, today's care clovers from
     `pet.State.Economy`).
   - `HandleMessage`: the four `calendar_*` messages. `calendar_done`: `pet.MarkCareDone(id)`; if it was due →
     `pet.AwardCareTask()`; `brain.RequestAnimation("happy")`; save (`brain.Session.AutoSaver.SaveNow()`); close the
     reminder card for that task if open. Validate input (names 1-16 letters/digits/spaces, grams 50-3000, times HH:mm).
   - `Tick`: every 30 real seconds check `CareSchedule.GetDue(now)`. If something is due, not already shown in this
     session in the last 20 minutes, the user is active (`Win32Input.GetIdleTime()` < 3 min), no full-screen app, Home
     closed, no first-run scene (`!pet.State.NeedsNaming`) → show the reminder for the earliest due task.
2. Reminder: `CareReminderForm` – borderless, TopMost, no taskbar button, does not steal focus, pixel style
   (cream `#f7ecd9` background, 3 px dark border `#2b1712`, the task icon via `PetIcons.GetIconBitmap(icon)` 2x,
   title bold, first sentence of the text, buttons **Done** and **Later (1 h)**, small × to close = Later 15 min).
   Positioned above the pig (`FormPet.ActivePet` bounds), kept on screen, follows the pig every 200 ms. Before showing:
   `brain.RequestAnimation("wheek")` and play the wheek sound (`SoundManager.Instance?.PlayWheek("reminder")`).
   Done/Later call the same Core methods as the messages, then `HomeWindow.NotifyStateChanged()`. Auto-hide after
   3 minutes (counts as nothing; it may come back after 20 minutes). Only one card at a time.
3. Icons per task id: same mapping as the web (veggies bell_pepper, water water_drop, hay hay, spot_clean broom, weigh
   scale, full_clean broom, brush brush, nails nail_clipper, vet_check vet).

## Checks
- `dotnet build src/Cuy/Cuy.csproj -c Release -p:EnableWindowsTargeting=true` and Core tests pass.
- PR "Windows check for the human": set a task time 2 minutes ahead in Settings (or edit the save), wait; the pig wheeks
  and the card shows; Done gives clovers once.

When done, open a pull request against `main` titled `F2-02: Care calendar desktop reminders`.
