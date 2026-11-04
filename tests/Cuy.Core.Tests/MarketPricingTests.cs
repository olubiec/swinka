using System;
using System.Collections.Generic;
using Cuy.Core.World;
using Xunit;

namespace Cuy.Core.Tests
{
    public class MarketPricingTests
    {
        private MarketConfig CreateTestConfig()
        {
            return new MarketConfig
            {
                DailySalesCapClovers = 30,
                PriceWigglePercent = 15,
                DemandDropPerUnit = 0.10,
                DemandRecoverPerDay = 0.10,
                DemandFloor = 0.05
            };
        }

        private CropDefinition CreateCrop(string id = "parsley_crop", string itemId = "parsley", int sellPrice = 4)
        {
            return new CropDefinition(
                id,
                itemId,
                CropKind.Annual,
                "seed_parsley",
                seedPrice: 2,
                growMinutes: 30,
                yield: 1,
                sellPrice: sellPrice,
                unlockHarvests: 0,
                maxStock: 0);
        }

        [Fact]
        public void Wiggle_IsSameForSameDateAndItem_AndAlwaysWithinRange()
        {
            var cfg = CreateTestConfig();
            string date = "2026-11-04";
            string item = "parsley";

            double w1 = MarketPricing.Wiggle(date, item, cfg);
            double w2 = MarketPricing.Wiggle(date, item, cfg);
            Assert.Equal(w1, w2);

            // Test across many dates and items that it's always in [-0.15, +0.15]
            for (int d = 1; d <= 30; d++)
            {
                string dt = $"2026-11-{d:D2}";
                double w = MarketPricing.Wiggle(dt, item, cfg);
                Assert.InRange(w, -0.1500001, 0.1500001);
            }
        }

        [Fact]
        public void FirstUnitOfFreshCrop_PaysFloorSellPriceTimesOnePlusWiggle()
        {
            var cfg = CreateTestConfig();
            var state = new MarketState();
            var crop = CreateCrop(sellPrice: 10);
            string date = "2026-11-04";

            double wiggle = MarketPricing.Wiggle(date, crop.ItemId, cfg);
            int expected = (int)Math.Floor(crop.SellPrice * (1.0 + wiggle));

            var quote = MarketPricing.Quote(state, cfg, crop, 1, date);
            Assert.Equal(1, quote.Units);
            Assert.Equal(expected, quote.TotalClovers);
            Assert.Equal(0.90, quote.NewDemand, precision: 4);
        }

        [Fact]
        public void Selling10Units_LowersDemandToFloor_AndTotalIsRoundedOnce()
        {
            var cfg = CreateTestConfig();
            // Give large cap so all 10 units fit
            cfg.DailySalesCapClovers = 100;
            var state = new MarketState();
            var crop = CreateCrop(sellPrice: 4);
            string date = "2026-11-04";

            double wiggle = MarketPricing.Wiggle(date, crop.ItemId, cfg);
            double basePrice = crop.SellPrice * (1.0 + wiggle);

            // Calculate expected manually
            double expectedRunning = 0.0;
            double d = 1.0;
            for (int i = 0; i < 10; i++)
            {
                expectedRunning += basePrice * d;
                d = Math.Max(cfg.DemandFloor, d - cfg.DemandDropPerUnit);
            }
            int expectedClovers = (int)Math.Floor(expectedRunning);

            var quote = MarketPricing.Sell(state, cfg, crop, 10, date);

            Assert.Equal(10, quote.Units);
            Assert.Equal(cfg.DemandFloor, quote.NewDemand, precision: 4);
            Assert.Equal(expectedClovers, quote.TotalClovers);
            Assert.Equal(cfg.DemandFloor, state.Demand[crop.ItemId], precision: 4);
            Assert.Equal(10, state.SoldToday[crop.ItemId]);
            Assert.Equal(expectedClovers, (int)state.SalesToday);
        }

        [Fact]
        public void NewDay_RaisesDemandBy0_1()
        {
            var cfg = CreateTestConfig();
            var state = new MarketState
            {
                DayLocalDate = "2026-11-04",
                Demand = new Dictionary<string, double> { ["parsley"] = 0.5 },
                SoldToday = new Dictionary<string, int> { ["parsley"] = 5 },
                SalesToday = 20
            };

            MarketPricing.NewDay(state, "2026-11-05", cfg);

            Assert.Equal(0.6, state.Demand["parsley"], precision: 4);
            Assert.Equal("2026-11-05", state.DayLocalDate);
            Assert.Empty(state.SoldToday);
            Assert.Equal(0, state.SalesToday);

            // Calling NewDay on the same day does nothing
            MarketPricing.NewDay(state, "2026-11-05", cfg);
            Assert.Equal(0.6, state.Demand["parsley"], precision: 4);
        }

        [Fact]
        public void Cap_StopsLargeSale_AndReportsFewerUnits()
        {
            var cfg = CreateTestConfig();
            cfg.DailySalesCapClovers = 15;
            var state = new MarketState();
            var crop = CreateCrop(sellPrice: 10);
            string date = "2026-11-04";

            // With price ~10, only 1 unit should fit within 15 cap, 2nd unit would exceed 15
            var quote = MarketPricing.Quote(state, cfg, crop, 10, date);

            Assert.True(quote.Units < 10);
            Assert.True(quote.TotalClovers <= 15);
        }

        [Fact]
        public void AfterCap_CapLeftIsZero_AndQuoteReturnsZeroUnits()
        {
            var cfg = CreateTestConfig();
            cfg.DailySalesCapClovers = 30;
            var state = new MarketState { SalesToday = 30 };

            Assert.Equal(0, MarketPricing.CapLeft(state, cfg));

            var crop = CreateCrop(sellPrice: 4);
            var quote = MarketPricing.Quote(state, cfg, crop, 5, "2026-11-04");

            Assert.Equal(0, quote.Units);
            Assert.Equal(0, quote.TotalClovers);
            Assert.True(quote.IsEmpty);
        }

        [Theory]
        [InlineData(0)]
        [InlineData(-1)]
        [InlineData(-5)]
        public void SaleQuote_ForZeroOrNegativeCounts_IsEmpty(int count)
        {
            var cfg = CreateTestConfig();
            var state = new MarketState();
            var crop = CreateCrop();

            var quote = MarketPricing.Quote(state, cfg, crop, count, "2026-11-04");
            Assert.Equal(0, quote.Units);
            Assert.Equal(0, quote.TotalClovers);
            Assert.True(quote.IsEmpty);
        }
    }
}
