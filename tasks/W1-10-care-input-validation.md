# W1-10: Care calendar input validation (Core, pure functions)
Goal: every value the calendar page can send is checked by one tested Core class, so the desktop handler only calls it.
Depends on: nothing (wave start). Contract: `docs/contracts.md`, section calendar. Today `CalendarFeature.cs` validates loosely (`TimeSpan.TryParse` accepts "1.02:03:04"; weekday and everyDays are not checked).
Change: new `src/Cuy.Core/Care/CareInput.cs`, new `tests/Cuy.Core.Tests/CareInputTests.cs`
Do not touch: everything not listed under Change; in particular `AGENTS.md`, `docs/PLAN.md`, `tasks/*`, `CalendarFeature.cs` (W2-01 uses this class).
Steps:
1. `public static class CareInput` (namespace `Cuy.Core.Care`). Nothing throws; null or bad input returns false / an empty list.
   - `bool TryPigName(string raw, out string name)`: trims; 1-16 characters; only letters (`char.IsLetter`), digits and single spaces inside; control characters rejected.
   - `List<string> CleanPigNames(IEnumerable<string> raw)`: valid names only, duplicates removed (ignore case), at most 8, order kept.
   - `bool TryGrams(int grams)`: 50-3000.
   - `bool TryTime(string raw, out string hhmm)`: strictly `HH:mm`, 00:00-23:59 (regex; not `TimeSpan.TryParse`).
   - `bool TryWeekday(int day)`: 0-6 (0 = Sunday, as in `care.json`).
   - `bool TryEveryDays(int days)`: 1-730.
   - `bool TrySnoozeMinutes(int minutes)`: 1-1440.
   - `bool TryDate(string raw, DateTime todayLocal, out string date)`: strict `yyyy-MM-dd` (`DateTime.TryParseExact`, invariant culture), a real calendar date, not after `todayLocal`, not before 2020-01-01; returns the normalized string.
2. Tests (xUnit `[Theory]` tables): good and bad values for each method, including: "  Pumpkin " -> "Pumpkin", 17 characters rejected, "Pum<b>" rejected, "A  B" (double space) rejected, grams 49 / 50 / 3000 / 3001, time "24:00", "7:5", "1.02:03", "09:05", weekday -1 / 0 / 6 / 7, everyDays 0 / 1 / 730 / 731, snooze 0 / 15 / 1440 / 1441, date "2026-02-30", "2026-10-28" when today is 2026-10-27, "2019-12-31", a null for every method, and `CleanPigNames` with duplicates, nine names and an invalid entry in the middle.
Verify: `dotnet test tests/Cuy.Core.Tests/Cuy.Core.Tests.csproj -c Release` passes.
Prohibited: changing or deleting existing test assertions, new dependencies, touching files outside "Change".
PR: what was done, decisions and why, how to check by hand; screenshot if the change is visual.
