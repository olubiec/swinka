# Task F1-07: Real-life care calendar – model and rules (Cuy.Core + data + tests)

Read `AGENTS.md` first and follow it.

## Goal
The player has real guinea pigs. Cuy keeps a care calendar for them and reminds her (later task: the desktop pig walks
out with a bubble): fresh vegetables, fresh water, hay, spot cleaning, weekly weighing with a weight log, full cage
clean, brushing, nail trim, yearly vet check-up. This task is ONLY the model, schedule maths and data, fully tested.

## Files you may add
`assets/data/care.json`, `src/Cuy.Core/Care/CareTaskDefinition.cs`, `src/Cuy.Core/Care/CareState.cs`,
`src/Cuy.Core/Care/CareSchedule.cs`, `src/Cuy.Core/GameState.Care.cs`, `src/Cuy.Core/Pet.Care.cs`,
`tests/Cuy.Core.Tests/CareScheduleTests.cs`. Do not edit existing files.

## Data (assets/data/care.json), sources: Merck Vet Manual "Routine Health Care of Guinea Pigs", RSPCA guinea pig care
```json
{ "tasks": [
  { "id": "veggies",   "title": "Fresh veggies",   "schedule": "daily",  "time": "18:00",
    "text": "Time for fresh veggies: about a cup per pig, with something rich in vitamin C (bell pepper, parsley, kale)." },
  { "id": "water",     "title": "Fresh water",     "schedule": "daily",  "time": "09:00",
    "text": "Change the water and check that the bottle drips." },
  { "id": "hay",       "title": "Hay top-up",      "schedule": "daily",  "time": "09:00",
    "text": "Top up the hay. Guinea pigs should always have hay (it keeps their teeth short)." },
  { "id": "spot_clean","title": "Quick clean",     "schedule": "daily",  "time": "20:00",
    "text": "Remove wet bedding and poops from the favourite corners." },
  { "id": "weigh",     "title": "Weigh-in",        "schedule": "weekly", "weekday": 0, "time": "10:00", "weight_log": true,
    "text": "Weekly weigh-in. Write down each pig's weight; a steady loss is an early sign of illness." },
  { "id": "full_clean","title": "Big cage clean",  "schedule": "weekly", "weekday": 6, "time": "11:00",
    "text": "Change all bedding and wash the bowls and the bottle." },
  { "id": "brush",     "title": "Brushing",        "schedule": "weekly", "weekday": 3, "time": "19:00",
    "text": "Brush the fur (long-haired pigs more often) and check the skin for flakes or bald spots." },
  { "id": "nails",     "title": "Nail trim",       "schedule": "every_n_days", "every_days": 28, "time": "17:00",
    "text": "Check the nails and trim them if they curl." },
  { "id": "vet_check", "title": "Vet check-up",    "schedule": "every_n_days", "every_days": 365, "time": "12:00",
    "text": "Yearly check-up at a vet who knows guinea pigs (teeth, weight, skin)." }
],
  "weight_alert": { "drop_grams": 50, "drop_percent": 5 },
  "snooze_minutes": [15, 60, 180] }
```
(weekday: 0 = Sunday ... 6 = Saturday, local time.)

## Model
- `CareTaskDefinition` (from JSON). `CareSettings` (saved): `List<string> PigNames` (default empty = "your pigs"),
  per task id: `Enabled` (default true), optional `Time`, `Weekday`, `EveryDays` overrides.
- `CareState` (saved): `Settings`, `Dictionary<string, DateTime> LastDoneUtc`, `Dictionary<string, DateTime> SnoozedUntilUtc`,
  `List<CareHistoryEntry> History` (`LocalDate`, `TaskId`; keep the last 120 days), `List<WeightEntry> Weights`
  (`LocalDate`, `Pig`, `Grams`), `Dictionary<string,int> Streaks`.
- `GameState.Care.cs`: lazy property `Care` (backing field, `??=` in the getter so old saves work).
- `CareSchedule` (pure, testable, takes `IClock` local time):
  - `DateTime NextDueLocal(task, settings, lastDoneUtc)`: daily → today's time if not done today, else tomorrow's;
    weekly → this week's weekday/time if not done since the start of that due window, else next week; every_n_days →
    lastDone date + N days at time (first time: today at time).
  - `bool IsDue(task, now)`: due time passed, not done in the current window, not snoozed, enabled.
  - `IReadOnlyList<DueTask> GetDue(now)` sorted by due time.
- `Pet.Care.cs`: `MarkCareDone(taskId)` (updates LastDone, History, Streaks: +1 if the previous window was done too,
  else 1; returns true if it was due), `SnoozeCare(taskId, minutes)`, `AddWeight(pig, grams, localDate?)` (one entry per
  pig per day, replaces), `DeleteWeight(pig, localDate)`, `WeightAlerts()` → for each pig, if the latest weight is lower
  than the previous entry (within 14 days) by >= drop_grams or >= drop_percent, an alert text like
  `"Pumpkin lost 60 g since 12 Oct. Watch her and see a vet if it continues."`, `SetCareSettings(...)`.

## Tests (CareScheduleTests.cs)
daily due before/after time, done today → next tomorrow; weekly Sunday rules across a week boundary; every_n_days
first time and after done; snooze hides until time; disabled tasks never due; streak increments and resets; weight
replace same day; alert on 50 g drop and on 5 % drop, none on gain; history trimmed to 120 days; JSON round-trip of
GameState with Care; old save JSON without Care loads.

## Checks
`dotnet test tests/Cuy.Core.Tests/Cuy.Core.Tests.csproj -c Release` all green.

When done, open a pull request against `main` titled `F1-07: Care calendar core (schedule, weights, alerts)`.
