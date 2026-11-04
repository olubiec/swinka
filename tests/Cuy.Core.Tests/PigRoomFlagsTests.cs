using System;
using System.IO;
using System.Linq;
using Cuy.Core;
using Cuy.Core.Achievements;
using Cuy.Core.Time;
using Xunit;

namespace Cuy.Core.Tests
{
    public class PigRoomFlagsTests
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
        public void PigRoomFlags_DefaultToFalse()
        {
            var balance = Balance.CreateDefault();

            Assert.False(balance.PigRoomsActive);
            Assert.False(balance.DormActive);
        }

        [Fact]
        public void PigRoomFlags_AreIndependentOfOlderFlags()
        {
            var balance = Balance.CreateDefault();
            bool placesBefore = balance.PlacesActive;
            bool worldDecorBefore = balance.WorldDecorActive;

            balance.PigRoomsActive = true;
            Assert.True(balance.PigRoomsActive);
            Assert.False(balance.DormActive);
            Assert.Equal(placesBefore, balance.PlacesActive);
            Assert.Equal(worldDecorBefore, balance.WorldDecorActive);

            balance.PigRoomsActive = false;
            balance.DormActive = true;
            Assert.False(balance.PigRoomsActive);
            Assert.True(balance.DormActive);
            Assert.Equal(placesBefore, balance.PlacesActive);
        }

        [Fact]
        public void PigRoomAchievements_ExistOnceWithExactRulesAndRewards()
        {
            var catalog = AchievementCatalog.Load(File.ReadAllText(RepoFile("assets/data/achievements.json")));

            AssertDefinition(catalog, "own_room", "pig_room_items", 5, 25);
            AssertDefinition(catalog, "every_pig_home", "pig_rooms_furnished", 5, 100);
            AssertDefinition(catalog, "shared_nest", "dorm_unlocked", 1, 75);
        }

        [Theory]
        [InlineData("own_room", "pig_room_items", 5, 25)]
        [InlineData("every_pig_home", "pig_rooms_furnished", 5, 100)]
        [InlineData("shared_nest", "dorm_unlocked", 1, 75)]
        public void PigRoomAchievement_IsEarnedAndPaidOnceAtThreshold(string id, string counter, int atLeast, int reward)
        {
            var catalog = AchievementCatalog.Load(File.ReadAllText(RepoFile("assets/data/achievements.json")));
            var clock = new ManualClock(new DateTime(2026, 3, 1, 10, 0, 0, DateTimeKind.Utc));
            var state = GameState.CreateNew("Piggy", clock.UtcNow);
            var pet = new Pet(state, clock);
            pet.AchievementsTable = catalog;

            // Other achievements count as earned already, so only the target can fire
            // (earning one writes a diary entry, which would fire first_diary).
            foreach (var other in catalog.All.Where(a => a.Id != id))
            {
                state.RecordAchievement(other.Id, clock.UtcNow);
            }

            for (int i = 0; i < atLeast - 1; i++) pet.Count(counter);
            Assert.DoesNotContain(id, pet.CheckAchievements().Select(a => a.Id));
            Assert.False(state.IsAchievementEarned(id));

            int cloversBefore = pet.State.Clovers;
            pet.Count(counter);
            var earned = pet.CheckAchievements();
            Assert.Single(earned);
            Assert.Equal(id, earned[0].Id);
            Assert.Equal(cloversBefore + reward, pet.State.Clovers);
            Assert.True(state.IsAchievementEarned(id));

            pet.Count(counter);
            Assert.Empty(pet.CheckAchievements());
            Assert.Equal(cloversBefore + reward, pet.State.Clovers);
        }

        [Fact]
        public void PigRoomAchievements_TotalTwoHundredClovers()
        {
            var catalog = AchievementCatalog.Load(File.ReadAllText(RepoFile("assets/data/achievements.json")));
            int total = new[] { "own_room", "every_pig_home", "shared_nest" }
                .Sum(id => catalog.All.Single(a => a.Id == id).Reward);

            Assert.Equal(200, total);
        }

        private static void AssertDefinition(AchievementCatalog catalog, string id, string counter, int atLeast, int reward)
        {
            var matches = catalog.All.Where(a => a.Id == id).ToList();
            Assert.Single(matches);
            Assert.Equal(reward, matches[0].Reward);
            Assert.Equal("counter", matches[0].Rule.Kind);
            Assert.Equal(counter, matches[0].Rule.Name);
            Assert.Equal(atLeast, matches[0].Rule.AtLeast);
        }
    }
}
