using System;
using System.Collections.Generic;
using System.IO;
using System.Linq;
using Cuy.Core.World;
using Xunit;

namespace Cuy.Core.Tests
{
    public class MarketStockTests
    {
        private static string RepoFile(string relativePath)
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

        private static MarketConfig LoadRealMarketConfig()
        {
            return MarketConfig.Load(File.ReadAllText(RepoFile("assets/data/market.json")));
        }

        private static FarmConfig LoadRealFarmConfig()
        {
            return FarmConfig.Load(File.ReadAllText(RepoFile("assets/data/farm.json")));
        }

        private static WorldItemCatalog LoadRealWorldItems()
        {
            return WorldItemCatalog.Load(File.ReadAllText(RepoFile("assets/data/world_items.json")));
        }

        private static ItemCatalog LoadRealItemCatalog()
        {
            var jsons = new[]
            {
                File.ReadAllText(RepoFile("assets/data/items.json")),
                File.ReadAllText(RepoFile("assets/data/items_shop.json")),
                File.ReadAllText(RepoFile("assets/data/items_decor.json")),
                File.ReadAllText(RepoFile("assets/data/items_farm.json"))
            };
            return ItemCatalog.LoadJsonFiles(jsons);
        }

        [Fact]
        public void SpecialsAndOrders_AreDeterministicPerDate_AndDifferentDatesDiffer()
        {
            var cfg = LoadRealMarketConfig();
            var farm = LoadRealFarmConfig();
            var worldItems = LoadRealWorldItems();
            var items = LoadRealItemCatalog();

            var s1 = MarketStock.Specials("2026-11-04", cfg, 0, worldItems, farm, items);
            var s2 = MarketStock.Specials("2026-11-04", cfg, 0, worldItems, farm, items);
            Assert.Equal(s1.Select(x => x.ItemId), s2.Select(x => x.ItemId));
            Assert.Equal(s1.Select(x => x.Price), s2.Select(x => x.Price));

            var o1 = MarketStock.Orders("2026-11-04", cfg, farm, 50);
            var o2 = MarketStock.Orders("2026-11-04", cfg, farm, 50);
            Assert.Equal(o1.Select(x => x.CropId), o2.Select(x => x.CropId));

            bool specialsDiffer = false;
            bool ordersDiffer = false;
            for (int day = 1; day <= 30; day++)
            {
                string date = $"2026-11-{day:D2}";
                var sd = MarketStock.Specials(date, cfg, 0, worldItems, farm, items);
                var od = MarketStock.Orders(date, cfg, farm, 50);
                if (!sd.Select(x => x.ItemId).SequenceEqual(s1.Select(x => x.ItemId)))
                    specialsDiffer = true;
                if (!od.Select(x => x.CropId).SequenceEqual(o1.Select(x => x.CropId)))
                    ordersDiffer = true;
            }

            Assert.True(specialsDiffer, "Specials should differ across at least one of 30 dates.");
            Assert.True(ordersDiffer, "Orders should differ across at least one of 30 dates.");
        }

        [Fact]
        public void Specials_SlotCounts_ThreeNormal_FiveWithBigStall_AndNoDuplicates()
        {
            var cfg = LoadRealMarketConfig();
            var farm = LoadRealFarmConfig();
            var worldItems = LoadRealWorldItems();
            var items = LoadRealItemCatalog();

            for (int day = 1; day <= 30; day++)
            {
                string date = $"2026-11-{day:D2}";
                var normal = MarketStock.Specials(date, cfg, 0, worldItems, farm, items);
                var bigStall = MarketStock.Specials(date, cfg, 1, worldItems, farm, items);

                Assert.Equal(3, normal.Count);
                Assert.Equal(5, bigStall.Count);

                Assert.Equal(normal.Count, normal.Select(x => x.ItemId).Distinct(StringComparer.OrdinalIgnoreCase).Count());
                Assert.Equal(bigStall.Count, bigStall.Select(x => x.ItemId).Distinct(StringComparer.OrdinalIgnoreCase).Count());
            }
        }

        [Fact]
        public void Specials_HaveTwentyPercentDiscount_AndRespectPriceFloor()
        {
            var cfg = LoadRealMarketConfig();
            var farm = LoadRealFarmConfig();
            var worldItems = LoadRealWorldItems();
            var items = LoadRealItemCatalog();

            for (int day = 1; day <= 30; day++)
            {
                string date = $"2026-11-{day:D2}";
                var specials = MarketStock.Specials(date, cfg, 1, worldItems, farm, items);

                foreach (var sp in specials)
                {
                    Assert.True(sp.OriginalPrice > 0);
                    Assert.True(sp.Price > 0 && sp.Price <= sp.OriginalPrice);

                    int expected20 = (int)Math.Round(sp.OriginalPrice * 0.8, MidpointRounding.AwayFromZero);
                    if (string.Equals(sp.Category, "seed", StringComparison.OrdinalIgnoreCase))
                    {
                        int seedFloor = (int)Math.Ceiling(sp.OriginalPrice * 0.5);
                        Assert.True(sp.Price >= seedFloor);
                        Assert.Equal(Math.Max(seedFloor, expected20), sp.Price);
                    }
                    else
                    {
                        Assert.Equal(Math.Max(1, expected20), sp.Price);
                    }
                }
            }
        }

        [Fact]
        public void Orders_NoneBelowThirtyHarvests_TwoAtThirty_AndOnlyUnlockedAnnualCrops()
        {
            var cfg = LoadRealMarketConfig();
            var farm = LoadRealFarmConfig();

            Assert.Empty(MarketStock.Orders("2026-11-04", cfg, farm, 0));
            Assert.Empty(MarketStock.Orders("2026-11-04", cfg, farm, 29));

            for (int day = 1; day <= 30; day++)
            {
                string date = $"2026-11-{day:D2}";
                var ordersAt30 = MarketStock.Orders(date, cfg, farm, 30);
                Assert.Equal(2, ordersAt30.Count);

                foreach (var o in ordersAt30)
                {
                    Assert.Equal(2, o.Count);
                    Assert.False(o.Done);

                    var crop = farm.Find(o.CropId);
                    Assert.NotNull(crop);
                    Assert.Equal(CropKind.Annual, crop.Kind);
                    Assert.True(crop.UnlockHarvests <= 30, $"Order chose locked crop '{crop.Id}' (unlock_harvests={crop.UnlockHarvests}) at 30 harvests.");
                }
            }
        }

        [Fact]
        public void OrderReward_ForTwoParsley_IsNine()
        {
            var cfg = LoadRealMarketConfig();
            var farm = LoadRealFarmConfig();

            // Parsley sell_price = 4, count = 2, reward_factor = 1.15 -> 4 * 2 * 1.15 = 9.2 -> round = 9
            var order = new OrderState
            {
                CropId = "parsley",
                Count = 2,
                Done = false
            };

            int reward = MarketStock.OrderReward(order, farm, cfg);
            Assert.Equal(9, reward);
        }
    }
}
