using System;
using System.IO;
using System.Linq;
using Cuy.Core.World;
using Xunit;

namespace Cuy.Core.Tests
{
    /// <summary>
    /// Same sink totals and price relations as tools/qa/economy-sim.js (variants pigrooms, full),
    /// checked against the real data files so a data change that breaks the economy fails dotnet test.
    /// </summary>
    public class PigRoomInvariantsTests
    {
        private const int PigCount = 5;
        private const int FurnishedRoomCount = 6; // 5 pig rooms + the shared bedroom
        private const int FenceCount = 16;
        private const string FenceItemId = "fence_wood";

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

        private static PigRoomConfig PigRooms()
        {
            return PigRoomConfig.Load(File.ReadAllText(RepoFile("assets/data/pig_rooms.json")));
        }

        private static HomeEconomyConfig HomeEconomy()
        {
            return HomeEconomyConfig.Load(File.ReadAllText(RepoFile("assets/data/home_economy.json")));
        }

        private static WorldItemCatalog WorldItems()
        {
            return WorldItemCatalog.Load(File.ReadAllText(RepoFile("assets/data/world_items.json")));
        }

        private static PlaceCatalog Places()
        {
            return PlaceCatalog.Load(File.ReadAllText(RepoFile("assets/data/places.json")));
        }

        private static bool IsHouseItem(WorldItemDefinition item)
        {
            return item.Place != null && item.Place.Contains("house");
        }

        [Fact]
        public void PigRoomLevels_ForFivePigsCostBetween5000And8000()
        {
            var pig = PigRooms();
            int perPig = pig.Levels.Sum(l => l.Cost);

            Assert.InRange(PigCount * perPig, 5000, 8000);
        }

        [Fact]
        public void Furnishing_OfHouseItemsForSixRoomsBetween10000And14000()
        {
            var items = WorldItems();
            int furnishingPerRoom = items.All
                .Where(i => IsHouseItem(i) && !i.IsFree && i.SignatureOf == null && i.PropOf == null)
                .Sum(i => i.Price);

            Assert.InRange(FurnishedRoomCount * furnishingPerRoom, 10000, 14000);
        }

        [Fact]
        public void SharedBedroom_UnlockAndLevelsBetween3500And5000()
        {
            var dorm = PigRooms().Dorm;
            int total = dorm.UnlockCost + dorm.Levels.Sum(l => l.Cost);

            Assert.InRange(total, 3500, 5000);
        }

        [Fact]
        public void WholeNewSink_BetweenFifteenThousandAndThirtyThousand()
        {
            var pig = PigRooms();
            var home = HomeEconomy();
            var items = WorldItems();

            int pigLevels = PigCount * pig.Levels.Sum(l => l.Cost);
            int furnishing = FurnishedRoomCount * items.All
                .Where(i => IsHouseItem(i) && !i.IsFree && i.SignatureOf == null && i.PropOf == null)
                .Sum(i => i.Price);
            int dorm = pig.Dorm.UnlockCost + pig.Dorm.Levels.Sum(l => l.Cost);
            int colours = 3 * items.All.Where(i => i.Recolor).Sum(i => home.VariantPrice(i.Price));
            var gate = items.Find(home.RunGateItem);
            var fence = items.Find(FenceItemId);
            Assert.NotNull(gate);
            Assert.NotNull(fence);
            int run = gate.Price + FenceCount * fence.Price;

            Assert.InRange(pigLevels + furnishing + dorm + colours + run, 15000, 30000);
        }

        [Fact]
        public void RoomLevels_GrowInSizeAndCostAndFirstLevelIsFree()
        {
            var pig = PigRooms();
            var rooms = new[] { pig.Levels, pig.Dorm.Levels };

            foreach (var levels in rooms)
            {
                Assert.Equal(0, levels[0].Cost);
                for (int i = 1; i < levels.Count; i++)
                {
                    var prev = levels[i - 1];
                    var cur = levels[i];
                    Assert.True(cur.Cols >= prev.Cols && cur.Rows >= prev.Rows, $"level {i} shrinks");
                    Assert.True(cur.Cols * cur.Rows > prev.Cols * prev.Rows, $"level {i} is not larger");
                    Assert.True(cur.Cost > prev.Cost, $"level {i} is not more expensive");
                }
            }
        }

        [Fact]
        public void ComfortWeights_AreOrderedAndOwnIsOne()
        {
            var pig = PigRooms();

            Assert.Equal(1.0, pig.ComfortOwn, 6);
            Assert.True(pig.ComfortOwn >= pig.ComfortCommon);
            Assert.True(pig.ComfortCommon >= pig.ComfortOthers);
        }

        [Fact]
        public void ComfortPerClover_OfPurchasableHouseItemsIsAtMostSixHundredthsPerClover()
        {
            var purchasable = WorldItems().All.Where(i => IsHouseItem(i) && !i.IsFree && i.Price > 0).ToList();

            Assert.NotEmpty(purchasable);
            double best = purchasable.Max(i => (double)i.Comfort / i.Price);
            Assert.True(best <= 0.06, $"best comfort per clover is {best}");
        }

        [Fact]
        public void FreeItems_HaveNoVariantPrice()
        {
            var home = HomeEconomy();
            var free = WorldItems().All.Where(i => i.IsFree).ToList();

            Assert.NotEmpty(free);
            foreach (var item in free)
            {
                Assert.Equal(0, home.VariantPrice(item.Price));
            }
        }

        [Fact]
        public void Resale_IsOff()
        {
            Assert.False(HomeEconomy().ResaleAllowed);
        }

        [Fact]
        public void MaxMoodSlowDown_IsStillFifteenHundredths()
        {
            Assert.Equal(0.15, Places().MoodDecayReductionAtCap, 6);
        }
    }
}
