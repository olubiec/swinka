# W2-03: Diary writer: one entry per day (Core)
Goal: Core can write one warm diary entry for a day from templates and the day's numbers.
Depends on: W1-05 (`assets/data/diary.json`) merged. `GameState.Diary` and `Pet.AddDiaryEntry` exist.
Change: new `src/Cuy.Core/Diary/DiaryWriter.cs`, new `src/Cuy.Core/Diary/DayStats.cs`, new `src/Cuy.Core/Pet.Diary.cs`, new `tests/Cuy.Core.Tests/DiaryWriterTests.cs`
Do not touch: everything not listed under Change; in particular `AGENTS.md`, `docs/PLAN.md`, `tasks/*`.
Steps:
1. `DiaryWriter.Load(string json)` (desktop passes the text) and `Render(template inputs, Random)` using `TraceryGrammar`: set facts before rendering, pick a template matching stage, mood, sickness, birthday and weather, never repeat the previous template id.
2. `DayStats`: counts for fed, pets, games, poops cleaned, bond points, clovers, keyed by local date; keeps the last 3 days; a small plain class that `Pet` fills (W3-03 hooks the counters in; here only the class and its unit tests).
3. `Pet.TryWriteDiary()` (not yet called from `Pet.Update`): writes at most one entry per local date through `AddDiaryEntry`; no entry for a day with zero activity (one generic "quiet day" line is allowed once); keeps at most 365 entries. Time from `IClock`, randomness from an injectable `Random`.
4. Tests (`ManualClock`, fixed `Random`): one entry per day, never twice, stage filter, no `#` or `[` left, length <= 160, 400 simulated days stay under 365 entries, the same template is never used twice in a row.
Verify: `dotnet test tests/Cuy.Core.Tests/Cuy.Core.Tests.csproj -c Release` passes.
Prohibited: changing or deleting existing test assertions, new dependencies, touching files outside "Change".
PR: what was done, decisions and why, how to check by hand; screenshot if the change is visual.
