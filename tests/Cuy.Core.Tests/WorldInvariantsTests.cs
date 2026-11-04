using System;
using System.Collections.Generic;
using System.IO;
using System.Linq;
using Cuy.Core.World;
using Xunit;

namespace Cuy.Core.Tests
{
    // Data-level invariants from docs/WORLD.md section 6.4 (items 2, 3, 5, 6, 10).
    // Reads the real assets with the real FarmEngine, MarketPricing, Comfort and PlaceCatalog.
    // The 365-day thresholds (item 9) are checked by tools/qa/economy-sim.js --check.
    public class WorldInvariantsTests
    {
        private static readonly DateTime Start = new DateTime(2026, 1, 1, 0, 0, 0, DateTimeKind.Utc);

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

        private static FarmConfig LoadFarm() => FarmConfig.LoadFromFile(RepoFile("assets/data/farm.json"));
        private static MarketConfig LoadMarket() => MarketConfig.LoadFromFile(RepoFile("assets/data/market.json"));
        private static PlaceCatalog LoadPlaces() => PlaceCatalog.LoadFromFile(RepoFile("assets/data/places.json"));
        private static WorldItemCatalog LoadWorldItems() => WorldItemCatalog.LoadFromFile(RepoFile("assets/data/world_items.json"));

        [Fact]
        public void Crops_SellPriceStaysBelowShopPriceEvenWithWiggle()
        {
            var farm = LoadFarm();
            var market = LoadMarket();
            var items = ItemCatalog.LoadDefault();
            double wiggle = market.PriceWigglePercent / 100.0;

            foreach (var crop in farm.Crops)
            {
                var shop = items.GetItem(crop.ItemId);
                Assert.True(shop?.Price != null, $"Crop '{crop.Id}' has no shop price in the item catalog.");

                double sellMax = crop.SellPrice * (1.0 + wiggle);
                double buyMin = shop.Price.Value * (1.0 - wiggle);
                Assert.True(sellMax < buyMin,
                    $"Crop '{crop.Id}': sell {crop.SellPrice} x (1+{wiggle}) = {sellMax} is not below shop {shop.Price.Value} x (1-{wiggle}) = {buyMin}.");
            }
        }

        [Fact]
        public void Annual_CropProfitPerCycleIsBetween1And20()
        {
            var farm = LoadFarm();

            // Perennials (saplings, max_stock) have no single cycle, so only annuals are checked.
            foreach (var crop in farm.Crops.Where(c => c.Kind == CropKind.Annual))
            {
                int profit = crop.Yield * crop.SellPrice - crop.SeedPrice;
                Assert.InRange(profit, 1, 20);
            }
        }

        [Fact]
        public void Crops_ForbiddenFoodsAbsentAndSeedPricesMatchCatalog()
        {
            var farm = LoadFarm();
            var items = ItemCatalog.LoadDefault();

            foreach (var crop in farm.Crops)
            {
                Assert.False(farm.ForbiddenFoods.Contains(crop.ItemId, StringComparer.OrdinalIgnoreCase),
                    $"Forbidden food '{crop.ItemId}' is in the crop list.");
                Assert.False(farm.ForbiddenFoods.Contains(crop.Id, StringComparer.OrdinalIgnoreCase),
                    $"Forbidden food '{crop.Id}' is in the crop list.");

                var seed = items.GetItem(crop.SeedItemId);
                Assert.True(seed?.Price != null, $"Seed '{crop.SeedItemId}' is missing from the item catalog.");
                Assert.Equal(seed.Price.Value, crop.SeedPrice);
            }
        }

        [Fact]
        public void Annual_HarvestRunTwiceAfter400DayJumpYieldsOnce()
        {
            var farm = LoadFarm();
            var crop = farm.Find("dandelion");
            Assert.NotNull(crop);

            var state = new FarmState { PlotsOwned = farm.StartPlots };
            Assert.Equal(PlantResult.Ok, FarmEngine.Plant(farm, state, Start, 0, crop.Id, 0));

            var later = Start.AddDays(400);
            var first = FarmEngine.Harvest(farm, state, later, 0);
            var second = FarmEngine.Harvest(farm, state, later, 0);
            FarmEngine.Tick(farm, state, later.AddDays(1));
            var third = FarmEngine.Harvest(farm, state, later.AddDays(1), 0);

            Assert.True(first.Count >= crop.Yield, $"First harvest gave {first.Count}, expected at least {crop.Yield}.");
            Assert.Equal(0, second.Count);
            Assert.Equal(0, third.Count);
            Assert.True(string.IsNullOrEmpty(state.Plots[0].CropId));
        }

        [Fact]
        public void Perennial_OrchardHarvestAfter400DayJumpIsCappedAtMaxStock()
        {
            var farm = LoadFarm();
            var crop = farm.Find("strawberry");
            Assert.NotNull(crop);
            Assert.Equal(CropKind.Perennial, crop.Kind);

            var state = new FarmState { OrchardSlots = 1 };
            Assert.Equal(PlantResult.Ok, FarmEngine.PlantOrchard(farm, state, Start, 0, crop.Id, int.MaxValue));

            var later = Start.AddDays(400);
            var first = FarmEngine.HarvestOrchard(farm, state, later, 0);
            var second = FarmEngine.HarvestOrchard(farm, state, later, 0);

            Assert.Equal(crop.MaxStock, first.Count);
            Assert.Equal(0, second.Count);
        }

        [Fact]
        public void Comfort_CapIs100AndMoodReductionAtMost15Percent()
        {
            var places = LoadPlaces();
            var worldItems = LoadWorldItems();
            var top = worldItems.Items.OrderByDescending(i => i.Comfort).First();
            Assert.True(top.Comfort > 0);

            var world = new WorldState();
            var placed = new List<PlacedItem>();
            for (int i = 0; i < 200; i++)
            {
                placed.Add(new PlacedItem { Uid = "u" + i, ItemId = top.Id });
            }
            world.Rooms["house"] = new RoomLayout { Items = placed };

            int score = Comfort.Score(world, worldItems, null);
            Assert.True(score > 100, $"Test setup should exceed the cap, got {score}.");
            Assert.Equal(100, places.ComfortCap);
            Assert.Equal(places.ComfortCap, Comfort.Capped(score, places));

            for (int s = 0; s <= places.ComfortCap; s++)
            {
                double factor = Comfort.MoodDecayFactor(Comfort.Capped(s, places), places);
                Assert.InRange(factor, 1.0 - 0.15 - 1e-9, 1.0 + 1e-9);
            }

            double maxReduction = 1.0 - Comfort.MoodDecayFactor(Comfort.Capped(10000, places), places);
            Assert.True(maxReduction >= 0.0 && maxReduction <= 0.15 + 1e-9,
                $"Mood reduction {maxReduction} is outside 0..15%.");
        }

        [Fact]
        public void Demand_MeterFollowsSaleFormulaAndDailyRecovery()
        {
            var farm = LoadFarm();
            var market = LoadMarket();
            var crop = farm.Find("dandelion");
            var state = new MarketState();
            MarketPricing.NewDay(state, "2026-01-01", market);

            var quote = MarketPricing.Sell(state, market, crop, 3, "2026-01-01");
            Assert.Equal(3, quote.Units);
            Assert.Equal(Math.Max(market.DemandFloor, 1.0 - market.DemandDropPerUnit * 3), state.Demand[crop.ItemId], 9);

            MarketPricing.NewDay(state, "2026-01-02", market);
            Assert.Equal(0.8, state.Demand[crop.ItemId], 9);

            state.Demand[crop.ItemId] = 0.95;
            MarketPricing.NewDay(state, "2026-01-03", market);
            Assert.Equal(1.0, state.Demand[crop.ItemId], 9);
        }

        [Fact]
        public void Demand_SaleTotalIsFlooredOnceAndMeterNeverBelowFloor()
        {
            var farm = LoadFarm();
            var market = LoadMarket();
            var crop = farm.Find("cucumber");
            var state = new MarketState();
            MarketPricing.NewDay(state, "2026-01-01", market);

            var quote = MarketPricing.Sell(state, market, crop, 12, "2026-01-01");

            // Mirror the per-unit loop: price = base x meter, meter drops by DemandDropPerUnit, floored.
            double basePrice = crop.SellPrice * (1.0 + MarketPricing.Wiggle("2026-01-01", crop.ItemId, market));
            double meter = 1.0;
            double total = 0.0;
            for (int i = 0; i < quote.Units; i++)
            {
                total += basePrice * meter;
                meter = Math.Max(market.DemandFloor, meter - market.DemandDropPerUnit);
            }

            Assert.Equal((int)Math.Floor(total), quote.TotalClovers);
            Assert.Equal(Math.Max(market.DemandFloor, meter), state.Demand[crop.ItemId], 9);
            Assert.True(state.Demand[crop.ItemId] >= market.DemandFloor - 1e-9);
        }

        [Fact]
        public void Sales_NeverExceedDailyCap()
        {
            var farm = LoadFarm();
            var market = LoadMarket();
            var state = new MarketState();
            MarketPricing.NewDay(state, "2026-01-01", market);

            int sumClovers = 0;
            foreach (var crop in farm.Crops)
            {
                for (int round = 0; round < 3; round++)
                {
                    var quote = MarketPricing.Sell(state, market, crop, 50, "2026-01-01");
                    sumClovers += quote.TotalClovers;
                }
            }

            Assert.True(sumClovers <= market.DailySalesCapClovers,
                $"Sold {sumClovers} clovers, cap is {market.DailySalesCapClovers}.");
            Assert.True(state.SalesToday <= market.DailySalesCapClovers + 1e-9);
        }
    }
}
