1.  **Modify `src/Cuy.Core/Balance.cs`**:
    *   Add `public bool DiaryActive { get; set; } = false;` (with XML doc).
    *   Add `public int DiaryWriteHour { get; set; } = 20;` (with XML doc).
2.  **Modify `src/Cuy.Core/GameSession.cs`**:
    *   In `GameSession.Open`, when `balance` is null, initialize it with both `HayRackActive = true` and `DiaryActive = true` (or just ensure `DiaryActive` is set next to `HayRackActive`).
3.  **Create `src/Cuy.Core/GameState.DayLog.cs`**:
    *   Implement `partial class GameState` with properties: `DayLogDate`, `DayLogCounters`, `DiaryLastWrittenDate`, `DiaryLastTemplateId`.
    *   Add a partial method or logic if necessary (though the prompt says to follow the other `GameState.*.cs` and they are just properties). Ensure properties have correct default values and `null`-safe initializations in `Normalize()`? The prompt says "null-safe. Old saves must load." so I should ensure `DayLogCounters` initializes safely if it's not handled automatically by Json deserialization, probably by modifying `GameState.cs`'s `Normalize` method, or using C# property initializers ` = new Dictionary<string,int>();`.
4.  **Create `src/Cuy.Core/Pet.Diary.cs`**:
    *   Implement `partial class Pet` with `public bool TryWriteDiary(DiaryWriter writer = null, Random rng = null)`.
    *   Implement the rules:
        *   if `!Balance.DiaryActive` return false.
        *   `today = Clock.LocalNow().ToString("yyyy-MM-dd", CultureInfo.InvariantCulture)`
        *   if `State.DayLogDate != today`, update `DayLogDate` and copy counters to `DayLogCounters`, return false.
        *   if `Clock.LocalNow().Hour < Balance.DiaryWriteHour` or `State.DiaryLastWrittenDate == today` return false.
        *   `State.DiaryLastWrittenDate = today;`
        *   Calculate `DayStats.FromCounters(today, State.DayLogCounters, State.Stats.Counters)`.
        *   If no activity (`stats.HasActivity == false`), return false.
        *   Create `DiaryContext` with the specified mapping (mood: <35="low", >70="high", else="ok").
        *   Call `Render` on writer (use default if null) and shared `Random` (or provided if not null).
        *   If result is not null, `AddDiaryEntry`, store `TemplateId`, trim `State.Diary` to max 365, return true.
5.  **Modify `src/Cuy.Core/Pet.cs`**:
    *   Add `TryWriteDiary();` in `Update()` just after `CheckAll();`.
6.  **Create `tests/Cuy.Core.Tests/DiaryDailyTests.cs`**:
    *   Write required test cases as described in the instructions.
7.  **Pre commit steps**:
    *   Run `pre_commit_instructions` tool and verify changes pass all checks.
