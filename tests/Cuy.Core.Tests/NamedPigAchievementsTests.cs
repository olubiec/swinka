using System;
using System.IO;
using System.Linq;
using Cuy.Core;
using Cuy.Core.Achievements;
using Cuy.Core.Time;
using Xunit;

namespace Cuy.Core.Tests
{
    public class NamedPigAchievementsTests
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

        private static AchievementCatalog LoadRealCatalog()
        {
            string json = File.ReadAllText(RepoFile("assets/data/achievements.json"));
            return AchievementCatalog.Load(json);
        }

        private static Pet CreatePetWithRealCatalog(int initialClovers = 0)
        {
            var catalog = LoadRealCatalog();
            var clock = new ManualClock(new DateTime(2026, 3, 1, 10, 0, 0, DateTimeKind.Utc));
            var state = GameState.CreateNew("Piggy", clock.UtcNow);
            state.Clovers = initialClovers;

            // Pre-record any existing non-adoption achievements so this suite isolates adoption achievements
            foreach (var existing in catalog.All)
            {
                if (existing.Id != "new_friend" && existing.Id != "full_house" && existing.Id != "forever_family")
                {
                    state.RecordAchievement(existing.Id, clock.UtcNow);
                }
            }

            return new Pet(state, clock) { AchievementsTable = catalog };
        }

        [Fact]
        public void RealCatalog_ContainsAdoptionAchievements_WithExactValuesAndUniqueIds()
        {
            var catalog = LoadRealCatalog();

            // Real catalog ids are still unique
            var ids = catalog.All.Select(a => a.Id).ToList();
            var distinctIds = ids.Distinct(StringComparer.OrdinalIgnoreCase).ToList();
            Assert.Equal(distinctIds.Count, ids.Count);

            // Three ids exist exactly once
            Assert.Equal(1, ids.Count(id => string.Equals(id, "new_friend", StringComparison.OrdinalIgnoreCase)));
            Assert.Equal(1, ids.Count(id => string.Equals(id, "full_house", StringComparison.OrdinalIgnoreCase)));
            Assert.Equal(1, ids.Count(id => string.Equals(id, "forever_family", StringComparison.OrdinalIgnoreCase)));

            // new_friend definition
            Assert.True(catalog.TryGet("new_friend", out var newFriend));
            Assert.Equal("New Friend", newFriend.Title);
            Assert.Equal("A new guinea pig joins the family.", newFriend.Text);
            Assert.Equal("social", newFriend.Category);
            Assert.False(newFriend.Hidden);
            Assert.Equal(50, newFriend.Reward);
            Assert.NotNull(newFriend.Rule);
            Assert.Equal("counter", newFriend.Rule.Kind);
            Assert.Equal("pigs_arrived", newFriend.Rule.Name);
            Assert.Equal(1, newFriend.Rule.AtLeast);

            // full_house definition
            Assert.True(catalog.TryGet("full_house", out var fullHouse));
            Assert.Equal("Full House", fullHouse.Title);
            Assert.Equal("The whole family has arrived.", fullHouse.Text);
            Assert.Equal("social", fullHouse.Category);
            Assert.False(fullHouse.Hidden);
            Assert.Equal(150, fullHouse.Reward);
            Assert.NotNull(fullHouse.Rule);
            Assert.Equal("counter", fullHouse.Rule.Kind);
            Assert.Equal("pigs_arrived", fullHouse.Rule.Name);
            Assert.Equal(3, fullHouse.Rule.AtLeast);

            // forever_family definition
            Assert.True(catalog.TryGet("forever_family", out var foreverFamily));
            Assert.Equal("Forever in the Family", foreverFamily.Title);
            Assert.Equal("A special friend stays close, always.", foreverFamily.Text);
            Assert.Equal("social", foreverFamily.Category);
            Assert.False(foreverFamily.Hidden);
            Assert.Equal(50, foreverFamily.Reward);
            Assert.NotNull(foreverFamily.Rule);
            Assert.Equal("counter", foreverFamily.Rule.Kind);
            Assert.Equal("memorial_pigs", foreverFamily.Rule.Name);
            Assert.Equal(1, foreverFamily.Rule.AtLeast);
        }

        [Fact]
        public void PigsArrived_CounterProgression_EarnsAndPaysOnce()
        {
            var pet = CreatePetWithRealCatalog(initialClovers: 0);

            // With the counter at 0 neither is earned
            var initialEarned = pet.CheckAchievements();
            Assert.Empty(initialEarned);
            Assert.Equal(0, pet.State.Clovers);
            Assert.False(pet.State.IsAchievementEarned("new_friend"));
            Assert.False(pet.State.IsAchievementEarned("full_house"));

            // At 1 only new_friend is earned and pays 50
            pet.Count("pigs_arrived", 1);
            var earnedAt1 = pet.CheckAchievements();
            Assert.Single(earnedAt1);
            Assert.Equal("new_friend", earnedAt1[0].Id);
            Assert.Equal(50, pet.State.Clovers);
            Assert.True(pet.State.IsAchievementEarned("new_friend"));
            Assert.False(pet.State.IsAchievementEarned("full_house"));

            // Earning is paid once (a second check pays nothing)
            var secondCheck = pet.CheckAchievements();
            Assert.Empty(secondCheck);
            Assert.Equal(50, pet.State.Clovers);

            // At counter = 2 full_house is not yet earned
            pet.Count("pigs_arrived", 1);
            var earnedAt2 = pet.CheckAchievements();
            Assert.Empty(earnedAt2);
            Assert.Equal(50, pet.State.Clovers);
            Assert.False(pet.State.IsAchievementEarned("full_house"));

            // At 3 full_house is earned and pays 150
            pet.Count("pigs_arrived", 1);
            var earnedAt3 = pet.CheckAchievements();
            Assert.Single(earnedAt3);
            Assert.Equal("full_house", earnedAt3[0].Id);
            Assert.Equal(200, pet.State.Clovers); // 50 + 150
            Assert.True(pet.State.IsAchievementEarned("full_house"));

            // Earning is paid once (a second check pays nothing)
            var secondCheckAt3 = pet.CheckAchievements();
            Assert.Empty(secondCheckAt3);
            Assert.Equal(200, pet.State.Clovers);
        }

        [Fact]
        public void MemorialPigs_CounterProgression_EarnsForeverFamilyAndPaysOnce()
        {
            var pet = CreatePetWithRealCatalog(initialClovers: 0);

            // With the counter at 0 neither is earned
            var initialEarned = pet.CheckAchievements();
            Assert.Empty(initialEarned);
            Assert.Equal(0, pet.State.Clovers);
            Assert.False(pet.State.IsAchievementEarned("forever_family"));

            // memorial_pigs at 1 earns forever_family and pays 50
            pet.Count("memorial_pigs", 1);
            var earned = pet.CheckAchievements();
            Assert.Single(earned);
            Assert.Equal("forever_family", earned[0].Id);
            Assert.Equal(50, pet.State.Clovers);
            Assert.True(pet.State.IsAchievementEarned("forever_family"));

            // Earning is paid once (a second check pays nothing)
            var secondCheck = pet.CheckAchievements();
            Assert.Empty(secondCheck);
            Assert.Equal(50, pet.State.Clovers);
        }
    }
}
