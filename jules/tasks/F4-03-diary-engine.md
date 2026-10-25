# Task F4-03: Diary engine - one entry per day written by the pig (Core)

Read `AGENTS.md` first and follow it. Requires waves 0-3 merged.

## Goal
`GameState.Diary` (`List<DiaryEntry>`) and `Pet.AddDiaryEntry` exist but nothing writes entries. Add a generator that
writes one warm, funny English entry per day from the pig's point of view, built from templates and the day's numbers.

## Files you may change
New: `src/Cuy.Core/Diary/DiaryWriter.cs`, `src/Cuy.Core/Diary/DayStats.cs`, `src/Cuy.Core/Pet.Diary.cs`,
`assets/data/diary.json`, `tests/Cuy.Core.Tests/DiaryTests.cs`. Also `src/Cuy/dotNet/ItemCatalogLoader.cs`-style loader
is NOT needed: load the JSON through a small `DiaryTemplates.Load(string json)` in Core and let the desktop pass the text.

## Specification
1. `assets/data/diary.json`: at least 48 templates, at least 8 per life stage group (baby, junior, adult, senior/legend)
   plus generic ones. Each template: `{ "id", "stages": ["adult"], "when": { "minFed": 3, "sick": false, "mood": "low|ok|high", "birthday": false, "weather": "rain|cold|hot|any" }, "text": "..." }`.
   Text uses placeholders `{name}` `{fed}` (times fed) `{vegetable}` (favourite vegetable name) `{pets}` (times petted)
   `{games}` `{poops}` `{clovers}`. Tone: cute, short (max 160 characters), never sad-dark; e.g.
   "Today I ate {fed} snacks and wheeked at {pets} cuddles. Best day ever, said {name}."
2. `DayStats` is collected by `Pet` through the existing `Count(...)` counters (feed, pet, minigame, poop cleaned, bond
   points): add counters where missing, keyed by local date, reset at local midnight; keep only the last 3 days.
3. `Pet.TryWriteDiary()` (called by `Pet.Update()` when the local date changed since the last entry): picks a matching
   template with the injectable `System.Random`, fills it, calls `AddDiaryEntry`; never two entries per local date;
   no entry for a day with zero activity (a "quiet day" generic line is allowed once). Keep at most 365 entries.
4. Tests (xUnit, `ManualClock`, fixed `Random`): one entry per day, no entry twice, stage filter works, placeholders all
   replaced (no `{` left), max length, 400 simulated days stay below 365 entries.

## Checks
`dotnet test tests/Cuy.Core.Tests/Cuy.Core.Tests.csproj -c Release` passes.

When done, open a pull request against `main` titled `F4-03: Diary engine`.
