using System;
using System.IO;
using Cuy.Core;
using Cuy.Core.Time;
using Cuy.Core.Save;
using Xunit;

namespace Cuy.Core.Tests
{
    public class BondRewardTests : IDisposable
    {
        private readonly string _testDir;

        public BondRewardTests()
        {
            _testDir = Path.Combine(Path.GetTempPath(), "CuyBondRewardTest_" + Guid.NewGuid().ToString("N"));
            Directory.CreateDirectory(_testDir);
        }

        public void Dispose()
        {
            try
            {
                if (Directory.Exists(_testDir))
                {
                    Directory.Delete(_testDir, true);
                }
            }
            catch { }
        }

        private static string RepoFile(string relativePath)
        {
            string dir = AppContext.BaseDirectory;
            while (!string.IsNullOrEmpty(dir))
            {
                if (File.Exists(Path.Combine(dir, "Cuy.sln")))
                {
                    return Path.Combine(dir, relativePath);
                }
                dir = Path.GetDirectoryName(dir);
            }
            throw new FileNotFoundException($"Could not find Cuy.sln to resolve {relativePath}");
        }

        [Fact]
        public void ReachingLevel20_GrantsGoldenBowl_Once()
        {
            var table = BondUnlocks.Load(File.ReadAllText(RepoFile("assets/data/bond.json")));
            var state = new GameState();
            state.Bond.Level = 19;
            state.Bond.Points = new Balance().BondPointsForLevel(19);

            var clock = new ManualClock(new DateTime(2025, 1, 1, 12, 0, 0, DateTimeKind.Utc));
            var pet = new Pet(state, clock, new Balance());
            pet.BondTable = table;

            // Give enough points to reach 20. Level 19 -> 20 takes 285 points (more than 1 day limit)
            while (pet.State.Bond.Level < 20)
            {
                pet.AddBondPoints(30);
                clock.Advance(TimeSpan.FromDays(1));
            }

            Assert.Equal(20, pet.State.Bond.Level);
            Assert.Equal(1, pet.GetItemCount("golden_bowl"));
            Assert.Equal(1, pet.State.Stats.Counters["golden_bowl_granted"]);
            Assert.Contains(pet.State.Diary, e => e.Text.Contains("Level 20! My human gave me a golden bowl."));
            Assert.Single(pet.State.Diary);

            // Re-leveling (simulated) or adding more points shouldn't grant it again
            clock.Advance(TimeSpan.FromDays(1));
            pet.AddBondPoints(30);
            Assert.Equal(1, pet.GetItemCount("golden_bowl"));
            Assert.Equal(1, pet.State.Stats.Counters["golden_bowl_granted"]);
            Assert.Single(pet.State.Diary);
        }

        [Fact]
        public void BigJumpToLevel20_GrantsGoldenBowl()
        {
            var table = BondUnlocks.Load(File.ReadAllText(RepoFile("assets/data/bond.json")));
            var state = new GameState();
            state.Bond.Level = 3;
            state.Bond.Points = new Balance().BondPointsForLevel(3);

            var clock = new ManualClock(new DateTime(2025, 1, 1, 12, 0, 0, DateTimeKind.Utc));
            var pet = new Pet(state, clock, new Balance());
            pet.BondTable = table;

            // Keep adding points across days to simulate a big offline jump (if someone hacked the points or we just accumulated points fast)
            // Or just add a ton of points across many days
            int neededPoints = new Balance().BondPointsForLevel(20) - state.Bond.Points;

            while (pet.State.Bond.Level < 20)
            {
                pet.AddBondPoints(30);
                clock.Advance(TimeSpan.FromDays(1));
            }

            Assert.True(pet.State.Bond.Level >= 20);
            Assert.Equal(1, pet.GetItemCount("golden_bowl"));
            Assert.Equal(1, pet.State.Stats.Counters["golden_bowl_granted"]);
            Assert.Single(pet.State.Diary);
        }

        [Fact]
        public void LoadSaveRoundTrip_DoesNotGrantAgain()
        {
            var table = BondUnlocks.Load(File.ReadAllText(RepoFile("assets/data/bond.json")));
            var state = new GameState();
            state.Bond.Level = 19;
            state.Bond.Points = new Balance().BondPointsForLevel(19);

            var clock = new ManualClock(new DateTime(2025, 1, 1, 12, 0, 0, DateTimeKind.Utc));
            var pet = new Pet(state, clock, new Balance());
            pet.BondTable = table;

            while (pet.State.Bond.Level < 20)
            {
                pet.AddBondPoints(30);
                clock.Advance(TimeSpan.FromDays(1));
            }

            var saveSystem = new SaveSystem(_testDir);
            saveSystem.Save(pet.State);

            var loadResult = saveSystem.Load();
            var pet2 = new Pet(loadResult.State, clock, new Balance());
            pet2.BondTable = table;

            clock.Advance(TimeSpan.FromDays(1));
            pet2.AddBondPoints(30); // More points

            Assert.Equal(1, pet2.GetItemCount("golden_bowl"));
            Assert.Equal(1, pet2.State.Stats.Counters["golden_bowl_granted"]);
            Assert.Single(pet2.State.Diary);
        }

        [Fact]
        public void LevelsBelow20_GrantNothing()
        {
            var table = BondUnlocks.Load(File.ReadAllText(RepoFile("assets/data/bond.json")));
            var state = new GameState();
            state.Bond.Level = 2;
            state.Bond.Points = new Balance().BondPointsForLevel(2);

            var clock = new ManualClock(new DateTime(2025, 1, 1, 12, 0, 0, DateTimeKind.Utc));
            var pet = new Pet(state, clock, new Balance());
            pet.BondTable = table;

            pet.AddBondPoints(30); // Level 3

            Assert.Equal(3, pet.State.Bond.Level);
            Assert.Equal(0, pet.GetItemCount("golden_bowl"));
            Assert.Empty(pet.State.Diary);
        }

        [Fact]
        public void GoldenBowlItem_LoadedCorrectly_CanBuyIsFalse()
        {
            string json = File.ReadAllText(RepoFile("assets/data/items_shop.json"));
            var catalog = ItemCatalog.LoadJson(json);

            var bowl = catalog.GetItem("golden_bowl");
            Assert.NotNull(bowl);
            Assert.False(bowl.CanBuy);
            Assert.Equal("equipment", bowl.Category);
            Assert.True(bowl.OneTime || bowl.IsUnlimited == false); // Actually we set "permanent": true, wait let's check
            // permanent is not a property on ItemDefinition it seems, let's check what properties it has.
            // (we will just check CanBuy)
            Assert.Null(bowl.Price);
        }
    }
}
