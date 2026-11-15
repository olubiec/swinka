# PK-P8b Log: Calendar UI, Profiles, Settings, and Weight
- Messages: Added `calendar_profile` with `{pig, birthDate, adoptedDate, baselineGrams}`, handled in `CalendarFeature.cs` via `pet.SetPigProfile`.
- State: Exposed `profiles` (list of `{name, birthDate, adoptedDate, baselineGrams}`) and `manualOptIn` in `CalendarFeature.AddState`.
- Reminders: Default to disabled when `manualOptIn` is true unless explicitly enabled; toggle change/save sends `calendar_settings`.
- Profiles: Added pig profile editor (birth date, adopted date, initial weight) and new pig form in Settings.
- Weight: Form validation ensures grams in [50..3000]; history table displays up to 10 entries with deltas vs previous and baseline weight.
- Task completion: Logging weight auto-completes weigh task, dismisses reminder popup, and removes weigh task from Today.
- Game style tabs: Styled in `feature.css` with 1-px `#3a1d17` border, hard corners (0px radius), and wood/paper palette backgrounds.
- QA: Created `tools/qa/ux-p8-calendar.js` with T1-T8 covering tabs styling, manual opt-in, profile/weight messages, and Today task disappearance.
