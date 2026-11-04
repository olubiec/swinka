using System;
using System.IO;
using Cuy.Core.World;
using Xunit;

namespace Cuy.Core.Tests
{
    public class MarketPricingTests
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
            string json = File.ReadAllText(RepoFile("assets/data/market.json"));
            return MarketConfig.Load(json);
        }

        private static FarmConfig LoadRealFarmConfig()
        {
            string json = File.ReadAllText(RepoFile("assets/data/farm.json"));
            return FarmConfig.Load(json);
        }

        [Fact]
        public void FirstUnitOfFreshCrop_PaysFloorOfSellPriceTimesOnePlusWiggle()
        {
            var cfg = LoadRealMarketConfig();
            var farm = LoadRealFarmConfig();
            var state = new MarketState { DayLocalDate = "2026-11-04" };

            foreach (var crop in farm.Crops)
            {
                double wiggle = MarketPricing.Wiggle("2026-11-04", crop.Id, cfg);
                int expected = (int)Math.Floor(crop.SellPrice * (1.0 + wiggle) + 1e-9);
                var quote = MarketPricing.Quote(state, cfg, crop, 1, "2026-11-04");

                Assert.Equal(1, quote.Units);
                Assert.Equal(expected, quote.TotalClovers);
                Assert.Equal(0.9, quote.NewDemand, 6);
            }
        }

        [Fact]
        public void SellingTenUnits_LowersDemandToFloor_AndRoundsTotalOnce()
        {
            var cfg = LoadRealMarketConfig();
            cfg.DailySalesCapClovers = 200; // high cap so all 10 units fit
            cfg.PriceWigglePercent = 0;     // isolate rounding of demand series
            var state = new MarketState { DayLocalDate = "2026-11-04" };
            var crop = new CropDefinition
            {
                Id = "dandelion",
                ItemId = "dandelion",
                SellPrice = 3
            };

            // Demand series for 10 units: 1.0, 0.9, 0.8, 0.7, 0.6, 0.5, 0.4, 0.3, 0.2, 0.1 -> sum = 5.5
            // Total = floor(3 * 5.5) = floor(16.5) = 16 (whereas rounding per unit would give 3+2+2+2+1+1+1+0+0+0 = 12)
            var quote = MarketPricing.Sell(state, cfg, crop, 10, "2026-11-04");

            Assert.Equal(10, quote.Units);
            Assert.Equal(16, quote.TotalClovers);
            Assert.Equal(0.05, quote.NewDemand, 6);
            Assert.Equal(0.05, state.Demand["dandelion"], 6);
            Assert.Equal(10, state.SoldToday["dandelion"]);
            Assert.Equal(16.0, state.SalesToday, 6);
        }

        [Fact]
        public void NewDay_RaisesDemandByPointOne_AndClearsDailyCounters()
        {
            var cfg = LoadRealMarketConfig();
            var state = new MarketState
            {
                DayLocalDate = "2026-11-04",
                SalesToday = 22
            };
            state.SoldToday["dandelion"] = 5;
            state.Demand["dandelion"] = 0.5;
            state.Demand["parsley"] = 0.95;

            // Calling NewDay with the same date does nothing
            MarketPricing.NewDay(state, "2026-11-04", cfg);
            Assert.Equal(22, state.SalesToday);
            Assert.Equal(0.5, state.Demand["dandelion"], 6);

            // Advancing the date recovers demand by 0.1 (capped at 1.0) and resets SoldToday / SalesToday
            MarketPricing.NewDay(state, "2026-11-05", cfg);
            Assert.Equal("2026-11-05", state.DayLocalDate);
            Assert.Equal(0, state.SalesToday);
            Assert.Empty(state.SoldToday);
            Assert.Equal(0.6, state.Demand["dandelion"], 6);
            Assert.Equal(1.0, state.Demand["parsley"], 6);
        }

        [Fact]
        public void Wiggle_IsDeterministic_AndAlwaysWithinPlusMinusFifteenPercent()
        {
            var cfg = LoadRealMarketConfig();
            var farm = LoadRealFarmConfig();

            for (int day = 1; day <= 30; day++)
            {
                string date = $"2026-11-{day:D2}";
                foreach (var crop in farm.Crops)
                {
                    double w1 = MarketPricing.Wiggle(date, crop.Id, cfg);
                    double w2 = MarketPricing.Wiggle(date, crop.Id, cfg);

                    Assert.Equal(w1, w2, 12);
                    Assert.InRange(w1, -0.15, 0.15);
                }
            }
        }

        [Fact]
        public void Cap_StopsLargeSale_AndReportsFewerUnits_ThenCapLeftIsZero()
        {
            var cfg = LoadRealMarketConfig();
            cfg.PriceWigglePercent = 0;
            var state = new MarketState { DayLocalDate = "2026-11-04" };

            // A high-value crop so 10 units exceed the 30-clover cap
            var crop = new CropDefinition
            {
                Id = "strawberry",
                ItemId = "strawberry",
                SellPrice = 10
            };

            // Unit 1: 10*1.0 = 10
            // Unit 2: +10*0.9 = 19
            // Unit 3: +10*0.8 = 27
            // Unit 4: +10*0.7 = 34 (> 30 cap!) -> stops at 3 units, paying 27
            var sold = MarketPricing.Sell(state, cfg, crop, 10, "2026-11-04");
            Assert.Equal(3, sold.Units);
            Assert.Equal(27, sold.TotalClovers);
            Assert.Equal(3, MarketPricing.CapLeft(state, cfg));

            // Fill the remaining 3 clovers exactly with a 3-clover crop at demand 1.0
            var dandelion = new CropDefinition
            {
                Id = "dandelion",
                ItemId = "dandelion",
                SellPrice = 3
            };
            var sold2 = MarketPricing.Sell(state, cfg, dandelion, 5, "2026-11-04");
            Assert.Equal(1, sold2.Units);
            Assert.Equal(3, sold2.TotalClovers);

            Assert.Equal(0, MarketPricing.CapLeft(state, cfg));

            var afterCapQuote = MarketPricing.Quote(state, cfg, dandelion, 5, "2026-11-04");
            Assert.Equal(0, afterCapQuote.Units);
            Assert.Equal(0, afterCapQuote.TotalClovers);
        }

        [Theory]
        [InlineData(0)]
        [InlineData(-1)]
        [InlineData(-50)]
        public void Quote_ForZeroOrNegativeCounts_IsEmpty(int count)
        {
            var cfg = LoadRealMarketConfig();
            var farm = LoadRealFarmConfig();
            var state = new MarketState { DayLocalDate = "2026-11-04" };
            var crop = farm.Find("parsley");

            var quote = MarketPricing.Quote(state, cfg, crop, count, "2026-11-04");
            Assert.Equal(0, quote.Units);
            Assert.Equal(0, quote.TotalClovers);
            Assert.Equal(1.0, quote.NewDemand, 6);
        }

        [Fact]
        public void MarketConfig_LoadsRealFile_AndClampsInvalidValues()
        {
            var cfg = LoadRealMarketConfig();
            Assert.Equal(30, cfg.DailySalesCapClovers);
            Assert.Equal(0.10, cfg.DemandDropPerUnit, 6);
            Assert.Equal(0.10, cfg.DemandRecoverPerDay, 6);
            Assert.Equal(0.05, cfg.DemandFloor, 6);
            Assert.Equal(15, cfg.PriceWigglePercent);
            Assert.Equal(6, cfg.RestockHourLocal);
            Assert.Equal(3, cfg.SpecialSlots);
            Assert.Equal(20, cfg.SpecialDiscountPercent);
            Assert.Equal(2, cfg.OrdersPerDay);
            Assert.Equal(1.15, cfg.OrderRewardFactor, 6);
            Assert.Equal(30, cfg.OrdersUnlockHarvests);

            var clamped = MarketConfig.Load(@"{
                ""daily_sales_cap_clovers"": 999,
                ""price_wiggle_percent"": 50,
                ""restock_hour_local"": 99,
                ""demand"": { ""drop_per_unit"": 0.9, ""recover_per_day"": 0.001, ""floor"": 0.001 }
            }");
            Assert.Equal(200, clamped.DailySalesCapClovers);
            Assert.Equal(20, clamped.PriceWigglePercent);
            Assert.Equal(23, clamped.RestockHourLocal);
            Assert.Equal(0.5, clamped.DemandDropPerUnit, 6);
            Assert.Equal(0.01, clamped.DemandRecoverPerDay, 6);
            Assert.Equal(0.01, clamped.DemandFloor, 6);
        }
    }
}
