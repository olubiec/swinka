using System;
using System.Collections.Generic;
using System.IO;
using System.Linq;
using Cuy.Core;
using Cuy.Core.Achievements;
using Cuy.Core.Time;
using Xunit;

namespace Cuy.Core.Tests
{
    public class WorldAchievementsTests
    {
        private static AchievementCatalog LoadCatalog()
        {
            var path = RepoFile.Find("assets/data/achievements.json");
            var json = File.ReadAllText(path);
            return AchievementCatalog.Load(json);
        }

        private static (Pet pet, GameState state, List<AchievementEarnedEventArgs> earned) CreateTestPet(AchievementCatalog catalog, ManualClock clock)
        {
            var state = new GameState
            {
                BirthDateUtc = clock.UtcNow,
                GrowthStartUtc = clock.UtcNow
            };
            var balance = new Balance();
            var pet = new Pet(state, clock, balance)
            {
                AchievementsTable = catalog
            };

            var earned = new List<AchievementEarnedEventArgs>();
            pet.AchievementEarned += (s, e) => earned.Add(e);

            // Mark first_diary as already earned so that diary entries written on earning achievements
            // do not trigger the diary achievement during world counter tests.
            state.EarnedAchievements["first_diary"] = clock.UtcNow;

            return (pet, state, earned);
        }

        [Fact]
        public void AchievementIds_AreGloballyUnique()
        {
            var catalog = LoadCatalog();
            var ids = catalog.All.Select(a => a.Id).ToList();
            var uniqueIds = new HashSet<string>(ids);
            Assert.Equal(uniqueIds.Count, ids.Count);
        }

        [Fact]
        public void WorldAchievements_ExistWithExactRulesAndRewards()
        {
            var catalog = LoadCatalog();

            var expected = new Dictionary<string, (string ruleKind, string counterName, int atLeast, int reward, string category)>
            {
                ["first_harvest"] = ("counter", "harvests", 1, 25, "care"),
                ["green_thumb"] = ("counter", "harvests", 25, 75, "care"),
                ["market_regular"] = ("counter", "units_sold", 20, 50, "social"),
                ["tidy_nest"] = ("counter", "items_placed", 10, 50, "care"),
                ["garden_party"] = ("counter", "places_unlocked", 1, 50, "social"),
                ["grand_park"] = ("counter", "places_unlocked", 2, 100, "social"),
                ["full_farm"] = ("counter", "plots_owned", 24, 150, "care"),
                ["home_designer"] = ("counter", "items_placed", 30, 75, "care"),
            };

            var worldDefs = catalog.All.Where(a => expected.ContainsKey(a.Id)).ToList();
            Assert.Equal(8, worldDefs.Count);

            int totalReward = 0;
            foreach (var def in worldDefs)
            {
                var exp = expected[def.Id];
                Assert.NotNull(def.Rule);
                Assert.Equal(exp.ruleKind, def.Rule.Kind);
                Assert.Equal(exp.counterName, def.Rule.Name);
                Assert.Equal(exp.atLeast, def.Rule.AtLeast);
                Assert.Equal(exp.reward, def.Reward);
                Assert.Equal(exp.category, def.Category);
                Assert.False(def.Hidden);
                Assert.False(string.IsNullOrWhiteSpace(def.Title));
                Assert.False(string.IsNullOrWhiteSpace(def.Text));
                totalReward += def.Reward;
            }

            Assert.Equal(575, totalReward);
        }

        [Fact]
        public void WorldAchievements_Harvests_EarnedAndPaidOnce()
        {
            var catalog = LoadCatalog();
            var clock = new ManualClock(DateTime.UtcNow);
            var (pet, state, earned) = CreateTestPet(catalog, clock);

            int initialClovers = state.Clovers;

            // Below threshold
            state.Stats.Counters["harvests"] = 0;
            pet.CheckAchievements();
            Assert.Empty(earned);
            Assert.Equal(initialClovers, state.Clovers);

            // First harvest (1)
            state.Stats.Counters["harvests"] = 1;
            pet.CheckAchievements();
            Assert.Single(earned);
            Assert.Equal("first_harvest", earned[0].Id);
            Assert.Equal(25, earned[0].Reward);
            Assert.Equal(initialClovers + 25, state.Clovers);
            Assert.True(state.EarnedAchievements.ContainsKey("first_harvest"));

            // Re-checking does not duplicate
            pet.CheckAchievements();
            Assert.Single(earned);
            Assert.Equal(initialClovers + 25, state.Clovers);

            // Intermediate progress
            state.Stats.Counters["harvests"] = 24;
            pet.CheckAchievements();
            Assert.Single(earned);
            Assert.Equal(initialClovers + 25, state.Clovers);

            // Green thumb (25)
            state.Stats.Counters["harvests"] = 25;
            pet.CheckAchievements();
            Assert.Equal(2, earned.Count);
            Assert.Equal("green_thumb", earned[1].Id);
            Assert.Equal(75, earned[1].Reward);
            Assert.Equal(initialClovers + 25 + 75, state.Clovers);
            Assert.True(state.EarnedAchievements.ContainsKey("green_thumb"));

            // Re-checking at higher value
            state.Stats.Counters["harvests"] = 30;
            pet.CheckAchievements();
            Assert.Equal(2, earned.Count);
            Assert.Equal(initialClovers + 25 + 75, state.Clovers);
        }

        [Fact]
        public void WorldAchievements_ItemsPlaced_EarnedAndPaidOnce()
        {
            var catalog = LoadCatalog();
            var clock = new ManualClock(DateTime.UtcNow);
            var (pet, state, earned) = CreateTestPet(catalog, clock);

            int initialClovers = state.Clovers;

            state.Stats.Counters["items_placed"] = 9;
            pet.CheckAchievements();
            Assert.Empty(earned);

            // Tidy Nest (10)
            state.Stats.Counters["items_placed"] = 10;
            pet.CheckAchievements();
            Assert.Single(earned);
            Assert.Equal("tidy_nest", earned[0].Id);
            Assert.Equal(50, earned[0].Reward);
            Assert.Equal(initialClovers + 50, state.Clovers);

            pet.CheckAchievements();
            Assert.Single(earned);

            // Intermediate progress
            state.Stats.Counters["items_placed"] = 29;
            pet.CheckAchievements();
            Assert.Single(earned);

            // Home Designer (30)
            state.Stats.Counters["items_placed"] = 30;
            pet.CheckAchievements();
            Assert.Equal(2, earned.Count);
            Assert.Equal("home_designer", earned[1].Id);
            Assert.Equal(75, earned[1].Reward);
            Assert.Equal(initialClovers + 50 + 75, state.Clovers);

            pet.CheckAchievements();
            Assert.Equal(2, earned.Count);
            Assert.Equal(initialClovers + 50 + 75, state.Clovers);
        }

        [Fact]
        public void WorldAchievements_PlacesUnlocked_EarnedAndPaidOnce()
        {
            var catalog = LoadCatalog();
            var clock = new ManualClock(DateTime.UtcNow);
            var (pet, state, earned) = CreateTestPet(catalog, clock);

            int initialClovers = state.Clovers;

            state.Stats.Counters["places_unlocked"] = 0;
            pet.CheckAchievements();
            Assert.Empty(earned);

            // Garden Party (1 place unlocked)
            state.Stats.Counters["places_unlocked"] = 1;
            pet.CheckAchievements();
            Assert.Single(earned);
            Assert.Equal("garden_party", earned[0].Id);
            Assert.Equal(50, earned[0].Reward);
            Assert.Equal(initialClovers + 50, state.Clovers);

            // Grand Park (2 places unlocked)
            state.Stats.Counters["places_unlocked"] = 2;
            pet.CheckAchievements();
            Assert.Equal(2, earned.Count);
            Assert.Equal("grand_park", earned[1].Id);
            Assert.Equal(100, earned[1].Reward);
            Assert.Equal(initialClovers + 50 + 100, state.Clovers);

            // Re-checking does not duplicate
            pet.CheckAchievements();
            Assert.Equal(2, earned.Count);
            Assert.Equal(initialClovers + 50 + 100, state.Clovers);
        }

        [Fact]
        public void WorldAchievements_UnitsSold_And_PlotsOwned_EarnedAndPaidOnce()
        {
            var catalog = LoadCatalog();
            var clock = new ManualClock(DateTime.UtcNow);
            var (pet, state, earned) = CreateTestPet(catalog, clock);

            int initialClovers = state.Clovers;

            // Market regular (20 units sold)
            state.Stats.Counters["units_sold"] = 19;
            pet.CheckAchievements();
            Assert.Empty(earned);

            state.Stats.Counters["units_sold"] = 20;
            pet.CheckAchievements();
            Assert.Single(earned);
            Assert.Equal("market_regular", earned[0].Id);
            Assert.Equal(50, earned[0].Reward);
            Assert.Equal(initialClovers + 50, state.Clovers);

            // Full farm (24 plots owned)
            state.Stats.Counters["plots_owned"] = 23;
            pet.CheckAchievements();
            Assert.Single(earned);

            state.Stats.Counters["plots_owned"] = 24;
            pet.CheckAchievements();
            Assert.Equal(2, earned.Count);
            Assert.Equal("full_farm", earned[1].Id);
            Assert.Equal(150, earned[1].Reward);
            Assert.Equal(initialClovers + 50 + 150, state.Clovers);

            // Re-checking does not duplicate
            pet.CheckAchievements();
            Assert.Equal(2, earned.Count);
            Assert.Equal(initialClovers + 50 + 150, state.Clovers);
        }
    }
}
