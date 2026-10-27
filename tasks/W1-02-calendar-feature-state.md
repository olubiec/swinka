# W1-02: Calendar: C# state and messages for the Home page
Goal: the Home calendar page receives its state and its four `calendar_*` messages are handled by C#.
Depends on: nothing (wave start). Contract: `docs/contracts.md`, section calendar. Core: `CareSchedule`, `Pet.Care.cs`, `assets/data/care.json` (all on main).
Change: new `src/Cuy/dotNet/Features/CalendarFeature.cs`
Do not touch: everything not listed under Change; in particular `AGENTS.md`, `docs/PLAN.md`, `tasks/*`.
Steps:
1. `CalendarFeature : HomeFeatureBase`, `Id = "calendar"` (copy the structure of `ToysFeature.cs` and `DailyFeature.cs`). `AddState` builds the contract object from `pet.State.Care`, the task definitions in `care.json`, `CareSchedule` (due and next due), the last 62 days of history, weights, `pet.WeightAlerts()` and the economy numbers (`EconomyConfig.Current.CareTask`, today's care clovers from `pet.State.Economy`).
2. `HandleMessage` for `calendar_done`, `calendar_snooze`, `calendar_settings`, `calendar_weight`, `calendar_weight_delete` exactly as in the contract. `calendar_done`: `pet.MarkCareDone(id)`; if the task was due then `pet.AwardCareTask()`; `brain.RequestAnimation("happy")`; save with `brain.Session.AutoSaver.SaveNow()`.
3. Validate every input: pig names 1-16 letters, digits or spaces; grams 50-3000; times `HH:mm`; unknown task ids are ignored and logged `[Calendar] ...`. Invalid input never throws.
4. No `Tick` and no reminder window here (W2-01 adds them; W1-01 builds the form). Do not reference `CareReminderForm`.
Verify: `dotnet build src/Cuy/Cuy.csproj -c Release -p:EnableWindowsTargeting=true` and `dotnet test tests/Cuy.Core.Tests/Cuy.Core.Tests.csproj -c Release` pass.
Prohibited: changing or deleting existing test assertions, new dependencies, touching files outside "Change".
PR: what was done, decisions and why, how to check by hand; list the message types handled and the validation rules; screenshot if the change is visual.
