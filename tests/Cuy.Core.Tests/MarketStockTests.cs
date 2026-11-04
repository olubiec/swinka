using System;
using System.Collections.Generic;
using System.Linq;
using Cuy.Core;
using Cuy.Core.World;
using Xunit;

namespace Cuy.Core.Tests
{
    public class MarketStockTests
    {
        private MarketConfig CreateMarketConfig()
        {
            return new MarketConfig
            {
                SpecialSlots = 3,
                SpecialDiscountPercent = 20,
                SpecialPool = new List<string> { "decor", "seed", "toy" },
                StallUpgrades = new List<StallUpgradeDefinition>
                {
                    new StallUpgradeDefinition("big_stall", extraSpecialSlots: 2, cost: 500)
                },
                OrdersPerDay = 2,
                OrderRewardFactor = 1.15,
                OrdersUnlockHarvests = 30
            };
        }

        private FarmConfig CreateFarmConfig()
        {
            var crops = new List<CropDefinition>
            {
                new CropDefinition("parsley_crop", "parsley", CropKind.Annual, "seed_parsley", seedPrice: 4, growMinutes: 30, yield: 1, sellPrice: 4, unlockHarvests: 0, maxStock: 0),
                new CropDefinition("carrot_crop", "carrot", CropKind.Annual, "seed_carrot", seedPrice: 6, growMinutes: 60, yield: 1, sellPrice: 6, unlockHarvests: 10, maxStock: 0),
                new CropDefinition("apple_tree", "apple", CropKind.Perennial, "sapling_apple", seedPrice: 50, growMinutes: 120, yield: 2, sellPrice: 15, unlockHarvests: 0, maxStock: 5),
                new CropDefinition("late_crop", "late_crop_item", CropKind.Annual, "seed_late", seedPrice: 10, growMinutes: 90, yield: 1, sellPrice: 12, unlockHarvests: 50, maxStock: 0)
            };

            return new FarmConfig(
                startPlots: 4,
                plotPacks: Array.Empty<PlotPack>(),
                orchardSlots: Array.Empty<int>(),
                waterTimeCutPercent: 20,
                cans: Array.Empty<WaterCan>(),
                greatHarvestChancePercent: 10,
                greatHarvestExtraYield: 1,
                overripeNeverSpoils: false,
                starterSeeds: new Dictionary<string, int>(),
                forbiddenFoods: Array.Empty<string>(),
                crops: crops);
        }

        private WorldItemCatalog CreateWorldItemCatalog()
        {
            string json = @"{
                ""layers"": [""floor"", ""surface""],
                ""items"": [
                    { ""id"": ""mat_green"", ""name"": ""Green Mat"", ""place"": [""house""], ""w"": 1, ""h"": 1, ""price"": 20, ""comfort"": 1, ""layer"": ""floor"" },
                    { ""id"": ""cushion"", ""name"": ""Cushion"", ""place"": [""house""], ""w"": 1, ""h"": 1, ""price"": 40, ""comfort"": 2, ""layer"": ""surface"" },
                    { ""id"": ""free_bowl"", ""name"": ""Free Bowl"", ""place"": [""house""], ""w"": 1, ""h"": 1, ""price"": 0, ""comfort"": 0, ""layer"": ""surface"", ""is_free"": true }
                ]
            }";
            return WorldItemCatalog.Load(json);
        }

        private ItemCatalog CreateItemCatalog()
        {
            string json = @"{
                ""currency"": ""clovers"",
                ""currency_icon"": ""clover"",
                ""items"": [
                    { ""id"": ""ball"", ""name"": ""Ball"", ""category"": ""toy"", ""price"": 15 },
                    { ""id"": ""tunnel"", ""name"": ""Tunnel"", ""category"": ""toy"", ""price"": 35 },
                    { ""id"": ""pellets"", ""name"": ""Pellets"", ""category"": ""food"", ""price"": 5 }
                ]
            }";
            return ItemCatalog.LoadJson(json);
        }

        [Fact]
        public void Specials_SlotCounts3And5WithBigStall()
        {
            var mCfg = CreateMarketConfig();
            var fCfg = CreateFarmConfig();
            var wCat = CreateWorldItemCatalog();
            var iCat = CreateItemCatalog();

            var specialsLevel0 = MarketStock.Specials("2026-11-04", mCfg, 0, wCat, fCfg, iCat);
            Assert.Equal(3, specialsLevel0.Count);

            var specialsLevel1 = MarketStock.Specials("2026-11-04", mCfg, 1, wCat, fCfg, iCat);
            Assert.Equal(5, specialsLevel1.Count);
        }

        [Fact]
        public void Specials_Discount20Percent_AndSeedPriceFloor()
        {
            var mCfg = CreateMarketConfig();
            var fCfg = CreateFarmConfig();
            var wCat = CreateWorldItemCatalog();
            var iCat = CreateItemCatalog();

            var specials = MarketStock.Specials("2026-11-04", mCfg, 1, wCat, fCfg, iCat);
            foreach (var s in specials)
            {
                Assert.Equal(20, s.DiscountPercent);
                // 20% off: discounted price = round(orig * 0.8)
                int expected = (int)Math.Round(s.OriginalPrice * 0.8);
                if (s.Category == "seed")
                {
                    int minSeedPrice = (int)Math.Ceiling(s.OriginalPrice * 0.5);
                    expected = Math.Max(minSeedPrice, expected);
                }
                Assert.Equal(expected, s.DiscountedPrice);
            }
        }

        [Fact]
        public void Specials_NoDuplicatesInOneDaysSpecials()
        {
            var mCfg = CreateMarketConfig();
            var fCfg = CreateFarmConfig();
            var wCat = CreateWorldItemCatalog();
            var iCat = CreateItemCatalog();

            for (int d = 1; d <= 30; d++)
            {
                string dt = $"2026-11-{d:D2}";
                var specials = MarketStock.Specials(dt, mCfg, 1, wCat, fCfg, iCat);
                var ids = specials.Select(s => s.ItemId).ToList();
                Assert.Equal(ids.Distinct().Count(), ids.Count);
            }
        }

        [Fact]
        public void Specials_DeterminismPerDate_AndDifferentDatesDiffer()
        {
            var mCfg = CreateMarketConfig();
            var fCfg = CreateFarmConfig();
            var wCat = CreateWorldItemCatalog();
            var iCat = CreateItemCatalog();

            // Same date produces same result
            var s1 = MarketStock.Specials("2026-11-04", mCfg, 0, wCat, fCfg, iCat);
            var s2 = MarketStock.Specials("2026-11-04", mCfg, 0, wCat, fCfg, iCat);
            Assert.Equal(s1.Select(x => x.ItemId), s2.Select(x => x.ItemId));

            // Across 30 dates, at least one pair must differ
            bool foundDifference = false;
            var firstDay = MarketStock.Specials("2026-11-01", mCfg, 0, wCat, fCfg, iCat).Select(x => x.ItemId).ToList();
            for (int d = 2; d <= 30; d++)
            {
                var otherDay = MarketStock.Specials($"2026-11-{d:D2}", mCfg, 0, wCat, fCfg, iCat).Select(x => x.ItemId).ToList();
                if (!firstDay.SequenceEqual(otherDay))
                {
                    foundDifference = true;
                    break;
                }
            }
            Assert.True(foundDifference);
        }

        [Fact]
        public void Orders_NoOrdersBelow30Harvests_TwoAt30()
        {
            var mCfg = CreateMarketConfig();
            var fCfg = CreateFarmConfig();

            var ordersBelow = MarketStock.Orders("2026-11-04", mCfg, fCfg, 29);
            Assert.Empty(ordersBelow);

            var ordersAt30 = MarketStock.Orders("2026-11-04", mCfg, fCfg, 30);
            Assert.Equal(2, ordersAt30.Count);
        }

        [Fact]
        public void Orders_DeterminismPerDate()
        {
            var mCfg = CreateMarketConfig();
            var fCfg = CreateFarmConfig();

            var o1 = MarketStock.Orders("2026-11-04", mCfg, fCfg, 30);
            var o2 = MarketStock.Orders("2026-11-04", mCfg, fCfg, 30);

            Assert.Equal(o1.Select(o => o.CropId), o2.Select(o => o.CropId));
            Assert.Equal(o1.Select(o => o.Count), o2.Select(o => o.Count));
        }

        [Fact]
        public void Orders_OnlyForUnlockedAnnualCrops()
        {
            var mCfg = CreateMarketConfig();
            var fCfg = CreateFarmConfig();

            // At 30 harvests:
            // parsley (annual, 0 harvests) -> unlocked
            // carrot (annual, 10 harvests) -> unlocked
            // apple (perennial) -> excluded
            // late_crop (annual, 50 harvests) -> locked
            for (int d = 1; d <= 30; d++)
            {
                var orders = MarketStock.Orders($"2026-11-{d:D2}", mCfg, fCfg, 30);
                foreach (var order in orders)
                {
                    Assert.Contains(order.CropId, new[] { "parsley_crop", "carrot_crop" });
                    Assert.DoesNotContain(order.CropId, new[] { "apple_tree", "late_crop" });
                    Assert.Equal(2, order.Count);
                    Assert.False(order.Done);
                }
            }
        }

        [Fact]
        public void OrderReward_For2ParsleySell4_Is9()
        {
            var mCfg = CreateMarketConfig(); // reward factor 1.15
            var fCfg = CreateFarmConfig();   // parsley sell price 4

            var order = new OrderState { CropId = "parsley_crop", Count = 2 };
            int reward = MarketStock.OrderReward(order, fCfg, mCfg);

            // 4 * 2 * 1.15 = 9.20 -> 9
            Assert.Equal(9, reward);
        }
    }
}
