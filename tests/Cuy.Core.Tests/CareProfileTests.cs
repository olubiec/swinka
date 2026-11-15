using System;
using System.Collections.Generic;
using System.Linq;
using Cuy.Core.Care;
using Cuy.Core.Time;
using Newtonsoft.Json;
using Xunit;

namespace Cuy.Core.Tests
{
    public class CareProfileTests
    {
        private static readonly DateTime FixedNowUtc = new DateTime(2026, 6, 15, 12, 0, 0, DateTimeKind.Utc);

        [Fact]
        public void T1_ValidProfile_SerializesAndDeserializesRoundtrip()
        {
            var profile = new CarePigProfile
            {
                Name = "Puffy",
                BirthDate = "2024-01-15",
                AdoptedDate = "2024-02-01",
                BaselineGrams = 850
            };

            var careState = new CareState();
            careState.Settings.PigNames.Add("Puffy");
            careState.Settings.Pigs.Add(profile);

            string json = JsonConvert.SerializeObject(careState);
            var deserialized = JsonConvert.DeserializeObject<CareState>(json);

            Assert.NotNull(deserialized);
            Assert.NotNull(deserialized.Settings);
            Assert.Single(deserialized.Settings.Pigs);

            var roundtripped = deserialized.Settings.Pigs[0];
            Assert.Equal("Puffy", roundtripped.Name);
            Assert.Equal("2024-01-15", roundtripped.BirthDate);
            Assert.Equal("2024-02-01", roundtripped.AdoptedDate);
            Assert.Equal(850, roundtripped.BaselineGrams);
        }

        [Fact]
        public void T2_FutureAndGarbageDates_Rejected()
        {
            var todayLocal = new DateTime(2026, 6, 15);

            // Future birth date
            Assert.False(CareInput.TryProfile("Cuy", "2026-06-16", null, 500, todayLocal, out _));

            // Future adopted date
            Assert.False(CareInput.TryProfile("Cuy", "2024-01-01", "2026-06-16", 500, todayLocal, out _));

            // Garbage dates
            Assert.False(CareInput.TryProfile("Cuy", "not-a-date", null, 500, todayLocal, out _));
            Assert.False(CareInput.TryProfile("Cuy", "2024/01/01", null, 500, todayLocal, out _));
            Assert.False(CareInput.TryProfile("Cuy", "31-12-2023", null, 500, todayLocal, out _));

            // Date before 2020-01-01
            Assert.False(CareInput.TryProfile("Cuy", "2019-12-31", null, 500, todayLocal, out _));
        }

        [Fact]
        public void T3_AdoptionBeforeBirth_Rejected()
        {
            var todayLocal = new DateTime(2026, 6, 15);

            // Adoption before birth: rejected
            Assert.False(CareInput.TryProfile("Cuy", "2024-05-10", "2024-05-09", 500, todayLocal, out _));

            // Adoption on same day as birth: allowed
            Assert.True(CareInput.TryProfile("Cuy", "2024-05-10", "2024-05-10", 500, todayLocal, out var sameDay));
            Assert.Equal("2024-05-10", sameDay.AdoptedDate);

            // Adoption after birth: allowed
            Assert.True(CareInput.TryProfile("Cuy", "2024-05-10", "2024-06-01", 500, todayLocal, out var afterBirth));
            Assert.Equal("2024-06-01", afterBirth.AdoptedDate);

            // Only birth or only adopted: allowed
            Assert.True(CareInput.TryProfile("Cuy", "2024-05-10", null, 500, todayLocal, out _));
            Assert.True(CareInput.TryProfile("Cuy", null, "2024-06-01", 500, todayLocal, out _));
        }

        [Fact]
        public void T4_RemovedPigProfile_DisappearsAfterNormalize()
        {
            var careState = new CareState
            {
                Settings = new CareSettings
                {
                    PigNames = new List<string> { "Cuy", "Fluffy" },
                    Pigs = new List<CarePigProfile>
                    {
                        new CarePigProfile { Name = "Cuy", BaselineGrams = 800 },
                        new CarePigProfile { Name = "RemovedPig", BaselineGrams = 900 },
                        new CarePigProfile { Name = "Fluffy", BaselineGrams = 850 },
                        new CarePigProfile { Name = "Cuy", BaselineGrams = 820 } // Duplicate
                    }
                }
            };

            careState.Normalize();

            Assert.Equal(2, careState.Settings.Pigs.Count);
            Assert.Contains(careState.Settings.Pigs, p => p.Name == "Cuy" && p.BaselineGrams == 800);
            Assert.Contains(careState.Settings.Pigs, p => p.Name == "Fluffy" && p.BaselineGrams == 850);
            Assert.DoesNotContain(careState.Settings.Pigs, p => p.Name == "RemovedPig");
        }

        [Fact]
        public void T5_NewGame_NoTaskIsDue_UntilExplicitlyEnabledInTaskOverrides()
        {
            var clock = new ManualClock(new DateTime(2026, 6, 15, 17, 30, 0, DateTimeKind.Utc)); // 19:30 local (+2)
            var dailyTask = new CareTaskDefinition
            {
                Id = "veggies",
                Schedule = "daily",
                Time = "18:00"
            };

            var state = CareState.CreateNew();
            Assert.True(state.Settings.ManualOptIn);

            // Without override: not due
            Assert.False(CareSchedule.IsDue(dailyTask, state.Settings, state, clock.UtcNow, clock));

            // With override Enabled = false: not due
            state.Settings.TaskOverrides[dailyTask.Id] = new CareTaskOverride { Enabled = false };
            Assert.False(CareSchedule.IsDue(dailyTask, state.Settings, state, clock.UtcNow, clock));

            // With override Enabled = true: due
            state.Settings.TaskOverrides[dailyTask.Id] = new CareTaskOverride { Enabled = true };
            Assert.True(CareSchedule.IsDue(dailyTask, state.Settings, state, clock.UtcNow, clock));
        }

        [Fact]
        public void T6_LegacySaveWithoutManualOptIn_PreservesExistingBehavior()
        {
            var clock = new ManualClock(new DateTime(2026, 6, 15, 17, 30, 0, DateTimeKind.Utc));
            var dailyTask = new CareTaskDefinition
            {
                Id = "veggies",
                Schedule = "daily",
                Time = "18:00"
            };

            // Legacy CareState JSON
            string legacyJson = "{\"Settings\":{\"PigNames\":[\"Cuy\"]}}";
            var careState = JsonConvert.DeserializeObject<CareState>(legacyJson);
            careState.Normalize();

            Assert.Null(careState.Settings.ManualOptIn);
            // In legacy mode, task without override is due
            Assert.True(CareSchedule.IsDue(dailyTask, careState.Settings, careState, clock.UtcNow, clock));

            // Full GameState deserialization test
            string fullLegacyJson = "{\"Name\":\"Cuy\",\"Care\":{\"Settings\":{\"PigNames\":[\"Cuy\"]}}}";
            var gameState = JsonConvert.DeserializeObject<GameState>(fullLegacyJson);
            gameState.Normalize();

            Assert.Null(gameState.Care.Settings.ManualOptIn);
            Assert.True(CareSchedule.IsDue(dailyTask, gameState.Care.Settings, gameState.Care, clock.UtcNow, clock));
        }

        [Fact]
        public void T7_AddWeight_ClosesWeighReminder_AndDoesNotDuplicateStreak()
        {
            // Sunday at 11:00 local (after 10:00 due time)
            var sunday = new DateTime(2026, 6, 14, 9, 0, 0, DateTimeKind.Utc); // 2026-06-14 is a Sunday
            while (sunday.ToLocalTime().DayOfWeek != DayOfWeek.Sunday)
            {
                sunday = sunday.AddDays(1);
            }
            var targetLocal = sunday.ToLocalTime().Date.AddHours(11);
            var clock = new ManualClock(targetLocal.ToUniversalTime());

            var weighTask = new CareTaskDefinition
            {
                Id = "weigh",
                Schedule = "weekly",
                Weekday = (int)DayOfWeek.Sunday,
                Time = "10:00",
                WeightLog = true
            };

            var state = GameState.CreateNew("Cuy", clock.UtcNow);
            var pet = new Pet(state, clock);
            pet.SetCareTasks(new[] { weighTask });

            // Initially due
            Assert.True(CareSchedule.IsDue(weighTask, pet.State.Care.Settings, pet.State.Care, clock.UtcNow, clock));

            // Logging weight closes the reminder
            pet.AddWeight("Cuy", 850);

            Assert.False(CareSchedule.IsDue(weighTask, pet.State.Care.Settings, pet.State.Care, clock.UtcNow, clock));
            Assert.Equal(1, pet.State.Care.Streaks["weigh"]);
            Assert.Single(pet.State.Care.History);

            // Logging weight again on the same day does not duplicate streak or history
            pet.AddWeight("Cuy", 860);
            Assert.Equal(1, pet.State.Care.Streaks["weigh"]);
            Assert.Single(pet.State.Care.History);

            // Advance by 7 days to next Sunday 11:00
            clock.UtcNow = clock.UtcNow.AddDays(7);
            Assert.True(CareSchedule.IsDue(weighTask, pet.State.Care.Settings, pet.State.Care, clock.UtcNow, clock));

            pet.AddWeight("Cuy", 870);
            Assert.False(CareSchedule.IsDue(weighTask, pet.State.Care.Settings, pet.State.Care, clock.UtcNow, clock));
            Assert.Equal(2, pet.State.Care.Streaks["weigh"]);
            Assert.Equal(2, pet.State.Care.History.Count);
        }

        [Fact]
        public void T8_BaselineGrams_BoundaryChecks()
        {
            var today = new DateTime(2026, 6, 15);

            // 49 -> too low
            Assert.False(CareInput.TryProfile("Cuy", null, null, 49, today, out _));

            // 50 -> minimum valid
            Assert.True(CareInput.TryProfile("Cuy", null, null, 50, today, out var p50));
            Assert.Equal(50, p50.BaselineGrams);

            // 3000 -> maximum valid
            Assert.True(CareInput.TryProfile("Cuy", null, null, 3000, today, out var p3000));
            Assert.Equal(3000, p3000.BaselineGrams);

            // 3001 -> too high
            Assert.False(CareInput.TryProfile("Cuy", null, null, 3001, today, out _));

            // 0 -> valid (means no baseline)
            Assert.True(CareInput.TryProfile("Cuy", null, null, 0, today, out var p0));
            Assert.Null(p0.BaselineGrams);

            // null -> valid (means no baseline)
            Assert.True(CareInput.TryProfile("Cuy", null, null, null, today, out var pNull));
            Assert.Null(pNull.BaselineGrams);

            // negative -> too low
            Assert.False(CareInput.TryProfile("Cuy", null, null, -100, today, out _));
        }

        [Fact]
        public void Pet_SetPigProfile_AddsAndUpdatesProfile()
        {
            var clock = new ManualClock(FixedNowUtc);
            var state = GameState.CreateNew("Cuy", clock.UtcNow);
            var pet = new Pet(state, clock);

            bool added = pet.SetPigProfile("Fluffy", "2024-03-01", "2024-04-01", 920);
            Assert.True(added);
            Assert.Contains("Fluffy", pet.State.Care.Settings.PigNames);
            Assert.Single(pet.State.Care.Settings.Pigs);

            var pig = pet.State.Care.Settings.Pigs[0];
            Assert.Equal("Fluffy", pig.Name);
            Assert.Equal(920, pig.BaselineGrams);

            // Update profile
            bool updated = pet.SetPigProfile("Fluffy", "2024-03-01", "2024-04-01", 950);
            Assert.True(updated);
            Assert.Single(pet.State.Care.Settings.Pigs);
            Assert.Equal(950, pet.State.Care.Settings.Pigs[0].BaselineGrams);
        }
    }
}
