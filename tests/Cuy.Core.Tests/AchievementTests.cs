using System;
using System.IO;
using System.Linq;
using Cuy.Core;
using Cuy.Core.Achievements;
using Cuy.Core.Save;
using Cuy.Core.Time;
using Xunit;

namespace Cuy.Core.Tests
{
    public class AchievementTests
    {
        private static string RepoFile(string relativePath)
        {
            var dir = AppContext.BaseDirectory;
            while (dir != null && !File.Exists(Path.Combine(dir, "Cuy.sln")))
            {
                dir = Directory.GetParent(dir)?.FullName;
            }
            if (dir == null)
            {
                throw new InvalidOperationException("Could not find Cuy.sln repository root.");
            }
            return Path.Combine(dir, relativePath);
        }

        [Fact]
        public void RealCatalog_LoadsWithAtLeast15EntriesAndUniqueIds()
        {
            string json = File.ReadAllText(RepoFile("assets/data/achievements.json"));
            var catalog = AchievementCatalog.Load(json);

            Assert.True(catalog.All.Count >= 15, $"Expected at least 15 achievements, got {catalog.All.Count}");

            var ids = catalog.All.Select(a => a.Id).ToList();
            var distinctIds = ids.Distinct(StringComparer.OrdinalIgnoreCase).ToList();
            Assert.Equal(distinctIds.Count, ids.Count);

            foreach (var def in catalog.All)
            {
                Assert.False(string.IsNullOrWhiteSpace(def.Id));
                Assert.False(string.IsNullOrWhiteSpace(def.Title));
                Assert.False(string.IsNullOrWhiteSpace(def.Text));
                Assert.True(def.Reward >= 25 && def.Reward <= 200, $"Reward for {def.Id} was {def.Reward}");
                Assert.NotNull(def.Rule);
                Assert.False(string.IsNullOrWhiteSpace(def.Rule.Kind));
            }
        }

        [Fact]
        public void Achievement_RuleFiresOnceAndGrantsRewardOnce()
        {
            string testJson = @"{
                ""achievements"": [
                    {
                        ""id"": ""test_feed"",
                        ""title"": ""Test Feed"",
                        ""text"": ""Feed the pig"",
                        ""category"": ""care"",
                        ""reward"": 75,
                        ""rule"": { ""kind"": ""counter"", ""name"": ""feedings"", ""atLeast"": 1 }
                    }
                ]
            }";

            var catalog = AchievementCatalog.Load(testJson);
            var clock = new ManualClock(new DateTime(2026, 3, 1, 10, 0, 0, DateTimeKind.Utc));
            var state = GameState.CreateNew("Piggy", clock.UtcNow);
            state.Clovers = 100;

            var pet = new Pet(state, clock);
            pet.AchievementsTable = catalog;

            // Initially, 0 feedings -> no achievement
            var earned1 = pet.CheckAchievements();
            Assert.Empty(earned1);
            Assert.Equal(100, pet.State.Clovers);

            // Increment feeding
            pet.Count("feedings");

            // Event check
            bool eventFired = false;
            pet.AchievementEarned += (s, e) =>
            {
                if (e.Id == "test_feed" && e.Reward == 75) eventFired = true;
            };

            var earned2 = pet.CheckAchievements();
            Assert.Single(earned2);
            Assert.Equal("test_feed", earned2[0].Id);
            Assert.True(eventFired);
            Assert.Equal(175, pet.State.Clovers);
            Assert.True(pet.State.IsAchievementEarned("test_feed"));
            Assert.Equal(1, pet.State.Stats.Counters["achievements_earned"]);

            // Check again with further feedings -> should NOT fire again
            pet.Count("feedings");
            var earned3 = pet.CheckAchievements();
            Assert.Empty(earned3);
            Assert.Equal(175, pet.State.Clovers);
            Assert.Equal(1, pet.State.Stats.Counters["achievements_earned"]);
        }

        [Fact]
        public void Achievement_SaveAndLoadKeepsEarnedIds()
        {
            var clock = new ManualClock(new DateTime(2026, 3, 1, 12, 0, 0, DateTimeKind.Utc));
            var state = GameState.CreateNew("Piggy", clock.UtcNow);
            state.RecordAchievement("achieve_1", clock.UtcNow);
            state.RecordAchievement("achieve_2", clock.UtcNow.AddMinutes(5));

            var tempDir = Path.Combine(Path.GetTempPath(), "Cuy_AchieveTest_" + Guid.NewGuid().ToString("N"));
            Directory.CreateDirectory(tempDir);
            try
            {
                var saveSystem = new SaveSystem(tempDir);
                saveSystem.Save(state);

                var loadedResult = saveSystem.Load();
                var loaded = loadedResult.State;

                Assert.True(loaded.IsAchievementEarned("achieve_1"));
                Assert.True(loaded.IsAchievementEarned("achieve_2"));
                Assert.False(loaded.IsAchievementEarned("achieve_3"));
                Assert.Equal(clock.UtcNow, loaded.EarnedAchievements["achieve_1"]);
            }
            finally
            {
                if (Directory.Exists(tempDir)) Directory.Delete(tempDir, true);
            }
        }

        [Fact]
        public void Achievement_UnknownRuleNamesAreIgnored()
        {
            string testJson = @"{
                ""achievements"": [
                    {
                        ""id"": ""unknown_rule"",
                        ""title"": ""Unknown Rule"",
                        ""text"": ""Will not crash"",
                        ""category"": ""care"",
                        ""reward"": 50,
                        ""rule"": { ""kind"": ""fly_to_moon"", ""name"": ""moon"", ""atLeast"": 1 }
                    }
                ]
            }";

            var catalog = AchievementCatalog.Load(testJson);
            var clock = new ManualClock(new DateTime(2026, 3, 1, 10, 0, 0, DateTimeKind.Utc));
            var state = GameState.CreateNew("Piggy", clock.UtcNow);
            var pet = new Pet(state, clock);
            pet.AchievementsTable = catalog;

            var earned = pet.CheckAchievements();
            Assert.Empty(earned);
            Assert.False(pet.State.IsAchievementEarned("unknown_rule"));
        }

        [Fact]
        public void Achievement_DefaultNewPetDoesNotChangeNumbersUntilCheckAchievementsCalled()
        {
            var clock = new ManualClock(new DateTime(2026, 3, 1, 10, 0, 0, DateTimeKind.Utc));
            var state = GameState.CreateNew("Piggy", clock.UtcNow);
            int initialClovers = state.Clovers;

            var pet = new Pet(state, clock);

            // Numbers must remain unchanged
            Assert.Equal(initialClovers, pet.State.Clovers);
            Assert.False(pet.State.Stats.Counters.ContainsKey("achievements_earned"));
            Assert.Empty(pet.State.EarnedAchievements);
        }
    }
}
