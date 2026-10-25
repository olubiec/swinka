using System;
using System.Collections.Generic;
using System.Linq;
using Xunit;
using Cuy.Core;
using Cuy.Core.Care;
using Cuy.Core.Time;
using Newtonsoft.Json;

namespace Cuy.Core.Tests
{
    public class ManualClock2 : IClock
    {
        public DateTime UtcNow { get; set; }
        public double Multiplier { get; set; } = 1.0;
        public ManualClock2(DateTime utcNow) { UtcNow = utcNow; }
    }

    public class CareScheduleTests
    {
        private CareTaskDefinition _dailyTask = new CareTaskDefinition { Id = "t_daily", Schedule = "daily", Time = "18:00" };
        private CareTaskDefinition _weeklyTask = new CareTaskDefinition { Id = "t_weekly", Schedule = "weekly", Weekday = 0, Time = "10:00" }; // Sunday
        private CareTaskDefinition _everyNDaysTask = new CareTaskDefinition { Id = "t_everyn", Schedule = "every_n_days", EveryDays = 28, Time = "17:00" };

        [Fact]
        public void Daily_DueBeforeAfterTime_NextTomorrow()
        {
            var clock = new ManualClock2(new DateTime(2023, 10, 10, 15, 0, 0, DateTimeKind.Utc));
            var localNow = clock.UtcNow.ToLocalTime();
            var targetLocal = localNow.Date.AddHours(18);

            clock.UtcNow = targetLocal.AddHours(-1).ToUniversalTime();

            var due = CareSchedule.NextDueLocal(_dailyTask, new CareSettings(), null, clock);
            Assert.Equal(targetLocal, due);

            Assert.False(CareSchedule.IsDue(_dailyTask, new CareSettings(), new CareState(), clock.UtcNow, clock));

            clock.UtcNow = targetLocal.AddMinutes(1).ToUniversalTime();
            Assert.True(CareSchedule.IsDue(_dailyTask, new CareSettings(), new CareState(), clock.UtcNow, clock));

            var lastDoneLocal = targetLocal.AddMinutes(5);
            var nextDue = CareSchedule.NextDueLocal(_dailyTask, new CareSettings(), lastDoneLocal.ToUniversalTime(), clock);
            Assert.Equal(targetLocal.AddDays(1), nextDue);
        }

        [Fact]
        public void Weekly_SundayRules()
        {
            var clock = new ManualClock2(DateTime.UtcNow);
            var localNow = clock.UtcNow.ToLocalTime();
            var sunday = localNow.Date;
            while (sunday.DayOfWeek != DayOfWeek.Sunday) sunday = sunday.AddDays(1);

            var targetLocal = sunday.AddHours(9);
            clock.UtcNow = targetLocal.ToUniversalTime();

            var due = CareSchedule.NextDueLocal(_weeklyTask, new CareSettings(), null, clock);
            Assert.Equal(sunday.AddHours(10), due);

            Assert.False(CareSchedule.IsDue(_weeklyTask, new CareSettings(), new CareState(), clock.UtcNow, clock));

            clock.UtcNow = sunday.AddHours(11).ToUniversalTime();
            Assert.True(CareSchedule.IsDue(_weeklyTask, new CareSettings(), new CareState(), clock.UtcNow, clock));

            var nextDue = CareSchedule.NextDueLocal(_weeklyTask, new CareSettings(), sunday.AddHours(11).ToUniversalTime(), clock);
            Assert.Equal(sunday.AddDays(7).AddHours(10), nextDue);

            var monday = sunday.AddDays(1);
            var nextDueFromMonday = CareSchedule.NextDueLocal(_weeklyTask, new CareSettings(), monday.AddHours(10).ToUniversalTime(), clock);
            Assert.Equal(sunday.AddDays(7).AddHours(10), nextDueFromMonday);
        }

        [Fact]
        public void EveryNDays_FirstTimeAndAfterDone()
        {
            var clock = new ManualClock2(DateTime.UtcNow);
            var localNow = clock.UtcNow.ToLocalTime();
            var targetLocal = localNow.Date.AddHours(10);
            clock.UtcNow = targetLocal.ToUniversalTime();

            var due = CareSchedule.NextDueLocal(_everyNDaysTask, new CareSettings(), null, clock);
            Assert.Equal(localNow.Date.AddHours(17), due);

            var nextDue = CareSchedule.NextDueLocal(_everyNDaysTask, new CareSettings(), targetLocal.ToUniversalTime(), clock);
            Assert.Equal(targetLocal.Date.AddDays(28).AddHours(17), nextDue);
        }

        [Fact]
        public void Snooze_HidesUntilTime()
        {
            var clock = new ManualClock2(DateTime.UtcNow);
            var localNow = clock.UtcNow.ToLocalTime();
            var targetLocal = localNow.Date.AddHours(18).AddMinutes(1);
            clock.UtcNow = targetLocal.ToUniversalTime();

            var state = new CareState();
            state.Normalize();

            Assert.True(CareSchedule.IsDue(_dailyTask, state.Settings, state, clock.UtcNow, clock));

            state.SnoozedUntilUtc[_dailyTask.Id] = clock.UtcNow.AddMinutes(15);
            Assert.False(CareSchedule.IsDue(_dailyTask, state.Settings, state, clock.UtcNow, clock));

            clock.UtcNow = clock.UtcNow.AddMinutes(16);
            Assert.True(CareSchedule.IsDue(_dailyTask, state.Settings, state, clock.UtcNow, clock));
        }

        [Fact]
        public void DisabledTasks_NeverDue()
        {
            var clock = new ManualClock2(DateTime.UtcNow);
            var localNow = clock.UtcNow.ToLocalTime();
            var targetLocal = localNow.Date.AddHours(18).AddMinutes(1);
            clock.UtcNow = targetLocal.ToUniversalTime();

            var state = new CareState();
            state.Normalize();
            state.Settings.TaskOverrides[_dailyTask.Id] = new CareTaskOverride { Enabled = false };

            Assert.False(CareSchedule.IsDue(_dailyTask, state.Settings, state, clock.UtcNow, clock));
        }

        [Fact]
        public void Pet_MarkCareDone_StreaksAndHistory()
        {
            var clock = new ManualClock2(DateTime.UtcNow);
            var pet = new Pet(GameState.CreateNew("Test", clock.UtcNow), clock);
            pet.SetCareTasks(new[] { _dailyTask });

            var localNow = clock.UtcNow.ToLocalTime();
            var targetLocal = localNow.Date.AddHours(18).AddMinutes(1);
            clock.UtcNow = targetLocal.ToUniversalTime();

            bool wasDue = pet.MarkCareDone(_dailyTask.Id);
            Assert.True(wasDue);

            Assert.Equal(1, pet.State.Care.Streaks[_dailyTask.Id]);
            Assert.Single(pet.State.Care.History);

            targetLocal = targetLocal.AddDays(1).AddMinutes(1);
            clock.UtcNow = targetLocal.ToUniversalTime();

            bool wasDue2 = pet.MarkCareDone(_dailyTask.Id);
            Assert.True(wasDue2);
            Assert.Equal(2, pet.State.Care.Streaks[_dailyTask.Id]);
            Assert.Equal(2, pet.State.Care.History.Count);

            // Miss a day
            targetLocal = targetLocal.AddDays(2);
            clock.UtcNow = targetLocal.ToUniversalTime();

            bool wasDue3 = pet.MarkCareDone(_dailyTask.Id);
            Assert.True(wasDue3);
            Assert.Equal(1, pet.State.Care.Streaks[_dailyTask.Id]); // streak reset
        }

        [Fact]
        public void History_TrimmedTo120Days()
        {
            var clock = new ManualClock2(DateTime.UtcNow);
            var pet = new Pet(GameState.CreateNew("Test", clock.UtcNow), clock);
            pet.SetCareTasks(new[] { _dailyTask });

            pet.State.Care.History.Add(new CareHistoryEntry { TaskId = _dailyTask.Id, LocalDate = clock.LocalNow().AddDays(-130).ToString("yyyy-MM-dd") });
            pet.State.Care.History.Add(new CareHistoryEntry { TaskId = _dailyTask.Id, LocalDate = clock.LocalNow().AddDays(-10).ToString("yyyy-MM-dd") });

            var targetLocal = clock.LocalNow().Date.AddHours(18).AddMinutes(1);
            clock.UtcNow = targetLocal.ToUniversalTime();

            pet.MarkCareDone(_dailyTask.Id);

            Assert.Equal(2, pet.State.Care.History.Count);
        }

        [Fact]
        public void Weight_ReplaceSameDay()
        {
            var clock = new ManualClock2(DateTime.UtcNow);
            var pet = new Pet(GameState.CreateNew("Test", clock.UtcNow), clock);

            pet.AddWeight("Piggy", 1000, "2023-10-10");
            pet.AddWeight("Piggy", 1050, "2023-10-10");
            pet.AddWeight("Piggy", 1100, "2023-10-11");

            Assert.Equal(2, pet.State.Care.Weights.Count);
            Assert.Equal(1050, pet.State.Care.Weights.First(w => w.LocalDate == "2023-10-10").Grams);
        }

        [Fact]
        public void Weight_AlertOnDrop()
        {
            var clock = new ManualClock2(DateTime.UtcNow);
            var pet = new Pet(GameState.CreateNew("Test", clock.UtcNow), clock);

            pet.AddWeight("Piggy", 1000, "2023-10-01");
            pet.AddWeight("Piggy", 950, "2023-10-08");

            var alerts = pet.WeightAlerts().ToList();
            Assert.Single(alerts);
            Assert.Contains("lost 50 g", alerts[0]);

            pet.AddWeight("Piggy", 949, "2023-10-08");
            alerts = pet.WeightAlerts().ToList();
            Assert.Single(alerts);

            pet.AddWeight("Piggy", 1020, "2023-10-08");
            alerts = pet.WeightAlerts().ToList();
            Assert.Empty(alerts);
        }

        [Fact]
        public void JSON_RoundTrip_WithCare()
        {
            var state = GameState.CreateNew("Test", DateTime.UtcNow);
            state.Care.Settings.PigNames.Add("Pumpkin");
            state.Care.History.Add(new CareHistoryEntry { TaskId = "veggies", LocalDate = "2023-10-10" });

            string json = JsonConvert.SerializeObject(state);
            var loaded = JsonConvert.DeserializeObject<GameState>(json);
            loaded.Normalize();

            Assert.Single(loaded.Care.Settings.PigNames);
            Assert.Equal("Pumpkin", loaded.Care.Settings.PigNames[0]);
            Assert.Single(loaded.Care.History);
        }

        [Fact]
        public void OldSaveJSON_LoadsWithoutCare()
        {
            string oldJson = "{\"Name\":\"Test\",\"Version\":2}";
            var loaded = JsonConvert.DeserializeObject<GameState>(oldJson);
            loaded.Normalize();

            Assert.NotNull(loaded.Care);
            Assert.Empty(loaded.Care.Settings.PigNames);
        }
    }
}
