using System;
using System.Collections.Generic;
using System.IO;
using System.Linq;
using Xunit;
using Cuy.Core;
using Cuy.Core.Care;
using Cuy.Core.Time;

namespace Cuy.Core.Tests
{
    public class CareDataTests
    {
        public static string RepoFile(string relativePath)
        {
            string dir = AppContext.BaseDirectory;
            while (dir != null)
            {
                if (File.Exists(Path.Combine(dir, "Cuy.sln")))
                    return Path.Combine(dir, relativePath);
                dir = Path.GetDirectoryName(dir);
            }
            throw new FileNotFoundException($"Cannot find repo root to resolve {relativePath}");
        }

        [Fact]
        public void Load_RealJson_ParsesCorrectly()
        {
            string json = File.ReadAllText(RepoFile("assets/data/care.json"));
            var data = CareData.Load(json);

            Assert.NotNull(data);
            Assert.NotNull(data.Tasks);

            // Validate 9 tasks
            Assert.Equal(9, data.Tasks.Count);

            var taskIds = data.Tasks.Select(t => t.Id).ToList();
            var expectedIds = new[] { "veggies", "water", "hay", "spot_clean", "weigh", "full_clean", "brush", "nails", "vet_check" };
            Assert.Equal(expectedIds, taskIds);

            // Validate nails and vet_check
            var nails = data.Tasks.First(t => t.Id == "nails");
            Assert.Equal(28, nails.EveryDays);

            var vetCheck = data.Tasks.First(t => t.Id == "vet_check");
            Assert.Equal(365, vetCheck.EveryDays);

            // Validate weigh
            var weigh = data.Tasks.First(t => t.Id == "weigh");
            Assert.True(weigh.WeightLog);
            Assert.Equal(0, weigh.Weekday);

            // Validate full_clean
            var fullClean = data.Tasks.First(t => t.Id == "full_clean");
            Assert.Equal(6, fullClean.Weekday);

            // Validate WeightAlert
            Assert.NotNull(data.WeightAlert);
            Assert.Equal(50, data.WeightAlert.DropGrams);
            Assert.Equal(5, data.WeightAlert.DropPercent);

            // Validate SnoozeMinutes
            Assert.NotNull(data.SnoozeMinutes);
            Assert.Equal(new List<int> { 15, 60, 180 }, data.SnoozeMinutes);

            // Validate Title, Text, and Time
            foreach (var t in data.Tasks)
            {
                Assert.False(string.IsNullOrWhiteSpace(t.Title));
                Assert.False(string.IsNullOrWhiteSpace(t.Text));
                Assert.Matches(@"^\d{2}:\d{2}$", t.Time);
            }
        }

        [Fact]
        public void Load_BrokenJson_ReturnsDefaultsWithoutThrowing()
        {
            string brokenJson = "{ \"tasks\": [ { \"id\": \"test\", \"schedule\": \"daily\" } "; // Missing closing brackets
            var data = CareData.Load(brokenJson);

            Assert.NotNull(data);
            Assert.Empty(data.Tasks);
            Assert.Equal(50, data.WeightAlert.DropGrams);
            Assert.Equal(5, data.WeightAlert.DropPercent);
            Assert.Equal(new List<int> { 15, 60, 180 }, data.SnoozeMinutes);
        }

        [Fact]
        public void Load_UnknownSchedule_DropsTask()
        {
            string json = "{ \"tasks\": [ { \"id\": \"t1\", \"schedule\": \"daily\" }, { \"id\": \"t2\", \"schedule\": \"monthly\" } ] }";
            var data = CareData.Load(json);

            Assert.Single(data.Tasks);
            Assert.Equal("t1", data.Tasks[0].Id);
        }

        [Fact]
        public void Load_WorksWithCareSchedule()
        {
            string json = File.ReadAllText(RepoFile("assets/data/care.json"));
            var data = CareData.Load(json);

            var clock = new ManualClock2(new DateTime(2023, 10, 10, 12, 0, 0, DateTimeKind.Utc));
            var settings = new CareSettings();

            foreach (var t in data.Tasks)
            {
                if (t.Schedule == "every_n_days")
                {
                    Assert.True(t.EveryDays > 0);
                }

                var nextDue = CareSchedule.NextDueLocal(t, settings, null, clock);
                Assert.True(nextDue > DateTime.MinValue);
            }
        }
    }
}
