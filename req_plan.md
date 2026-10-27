1. **Create `src/Cuy/dotNet/CareReminderForm.cs`:**
   - Develop `CareReminderForm` that inherits from `Form`.
   - Set properties: `FormBorderStyle = None`, `TopMost = true`, `ShowInTaskbar = false`, `DoubleBuffered = true`.
   - Style: Background color `#f7ecd9`, border color `#2b1712` (3 px width).
   - Layout:
     - Close button (small '×') at the top right.
     - Title label (bold text) indicating the task.
     - Icon (from `PetIcons.GetIconBitmap(icon)`) scaled to 2x.
     - Text label (first sentence of the task text).
     - "Done" button.
     - "Later (1 h)" button.
   - Behavior:
     - On load, position the form above the pig (`FormPet.ActivePet.Bounds`), and keep it fully visible on screen.
     - A timer (`Tick` 200 ms) follows the pig.
     - A timer (`Tick` auto-hide after 3 minutes): Close without doing anything.
     - Click "Done": `pet.MarkCareDone(id)`, if due `pet.AwardCareTask()`, request animation `happy`, save, close.
     - Click "Later (1 h)": `pet.SnoozeCare(id, 60)`, close.
     - Click "×": `pet.SnoozeCare(id, 15)`, close.
     - Provide a static method to check if a reminder is open, and open only one at a time.
     - When closing normally or handled, call `HomeWindow.NotifyStateChanged()` if state modified.

2. **Create `src/Cuy/dotNet/Features/CalendarFeature.cs`:**
   - Create class `CalendarFeature` inheriting `HomeFeatureBase`, `Id = "calendar"`.
   - Override `AddState`:
     - Provide full contract state based on `pet.State.Care`, `EconomyConfig.Current.CareTask`, etc.
   - Override `HandleMessage`:
     - Handlers for `calendar_done`, `calendar_snooze`, `calendar_settings`, `calendar_weight`, `calendar_weight_delete`.
     - When `calendar_done`: call `pet.MarkCareDone(taskId)`, if due `pet.AwardCareTask()`, request "happy" animation, save, close reminder if it's the current task.
     - Validate input constraints.
   - Override `Tick`:
     - Run logic every 30 real seconds.
     - Fetch due tasks (`CareSchedule.GetDue(now)`).
     - Check conditions: user active (`Win32Input.GetIdleTime() < 3 min`), no fullscreen app, Home closed, no first-run scene (`!pet.State.NeedsNaming`).
     - Wait at least 20 minutes since the last reminder in the current session.
     - Request `wheek` animation, play `reminder` wheek sound (`SoundManager.Instance?.PlayWheek("reminder")`).
     - Show `CareReminderForm` for the earliest due task.

3. **Pre-commit Steps:**
   - Call `pre_commit_instructions` and execute required tests and checks.

4. **Submit:**
   - Commit changes to branch `task-f2-02-care-calendar`.
