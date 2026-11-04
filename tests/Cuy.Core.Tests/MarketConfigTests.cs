using System;
using System.IO;
using System.Linq;
using Cuy.Core.World;
using Xunit;

namespace Cuy.Core.Tests
{
    public class MarketConfigTests
    {
        private static string RepoFile(string relativePath)
        {
            var dir = AppContext.BaseDirectory;
            while (dir != null && !File.Exists(Path.Combine(dir, "Cuy.sln")))
            {
                var parent = Directory.GetParent(dir);
                if (parent == null) break;
                dir = parent.FullName;
            }
            if (dir == null)
            {
                throw new InvalidOperationException("Could not find Cuy.sln repository root.");
            }
            return Path.Combine(dir, relativePath);
        }

        [Fact]
        public void RealFile_LoadsExpectedValues()
        {
            string filePath = RepoFile("assets/data/market.json");
            var config = MarketConfig.LoadFromFile(filePath);

            Assert.True(config.UnlockedAtStart);
            Assert.Equal(30, config.DailySalesCapClovers);
            Assert.Equal(15, config.PriceWigglePercent);
            Assert.Equal(6, config.RestockHourLocal);

            // Special offers
            Assert.Equal(3, config.SpecialSlots);
            Assert.Equal(20, config.SpecialDiscountPercent);
            Assert.Equal(new[] { "decor", "seed", "toy" }, config.SpecialPool);

            // Stall upgrades
            Assert.Single(config.StallUpgrades);
            var upgrade = config.StallUpgrades[0];
            Assert.Equal("big_stall", upgrade.Id);
            Assert.Equal(2, upgrade.ExtraSpecialSlots);
            Assert.Equal(500, upgrade.Cost);

            // Orders
            Assert.Equal(2, config.OrdersPerDay);
            Assert.Equal(1.15, config.OrderRewardFactor, 3);
            Assert.True(config.OrdersCountTowardCap);
            Assert.Equal(30, config.OrdersUnlockHarvests);

            // Demand
            Assert.Equal(0.10, config.DemandDropPerUnit, 3);
            Assert.Equal(0.10, config.DemandRecoverPerDay, 3);
            Assert.Equal(0.05, config.DemandFloor, 3);
        }

        [Fact]
        public void Defaults_EqualRealFileValues()
        {
            string filePath = RepoFile("assets/data/market.json");
            var fromFile = MarketConfig.LoadFromFile(filePath);
            var defaults = MarketConfig.CreateDefault();

            Assert.Equal(fromFile.UnlockedAtStart, defaults.UnlockedAtStart);
            Assert.Equal(fromFile.DailySalesCapClovers, defaults.DailySalesCapClovers);
            Assert.Equal(fromFile.PriceWigglePercent, defaults.PriceWigglePercent);
            Assert.Equal(fromFile.RestockHourLocal, defaults.RestockHourLocal);
            Assert.Equal(fromFile.SpecialSlots, defaults.SpecialSlots);
            Assert.Equal(fromFile.SpecialDiscountPercent, defaults.SpecialDiscountPercent);
            Assert.Equal(fromFile.SpecialPool, defaults.SpecialPool);

            Assert.Equal(fromFile.StallUpgrades.Count, defaults.StallUpgrades.Count);
            for (int i = 0; i < fromFile.StallUpgrades.Count; i++)
            {
                Assert.Equal(fromFile.StallUpgrades[i].Id, defaults.StallUpgrades[i].Id);
                Assert.Equal(fromFile.StallUpgrades[i].ExtraSpecialSlots, defaults.StallUpgrades[i].ExtraSpecialSlots);
                Assert.Equal(fromFile.StallUpgrades[i].Cost, defaults.StallUpgrades[i].Cost);
            }

            Assert.Equal(fromFile.OrdersPerDay, defaults.OrdersPerDay);
            Assert.Equal(fromFile.OrderRewardFactor, defaults.OrderRewardFactor, 3);
            Assert.Equal(fromFile.OrdersCountTowardCap, defaults.OrdersCountTowardCap);
            Assert.Equal(fromFile.OrdersUnlockHarvests, defaults.OrdersUnlockHarvests);

            Assert.Equal(fromFile.DemandDropPerUnit, defaults.DemandDropPerUnit, 3);
            Assert.Equal(fromFile.DemandRecoverPerDay, defaults.DemandRecoverPerDay, 3);
            Assert.Equal(fromFile.DemandFloor, defaults.DemandFloor, 3);
        }

        [Theory]
        [InlineData(0.005, 0.01)]
        [InlineData(0.01, 0.01)]
        [InlineData(0.25, 0.25)]
        [InlineData(0.50, 0.50)]
        [InlineData(0.85, 0.50)]
        public void Clamp_DemandFloor_ClampsBetween001And05(double input, double expected)
        {
            string json = $"{{\"demand\": {{\"floor\": {input.ToString(System.Globalization.CultureInfo.InvariantCulture)}}}}}";
            var config = MarketConfig.Load(json);
            Assert.Equal(expected, config.DemandFloor, 3);
        }

        [Theory]
        [InlineData(0.001, 0.01)]
        [InlineData(0.01, 0.01)]
        [InlineData(0.30, 0.30)]
        [InlineData(0.50, 0.50)]
        [InlineData(0.95, 0.50)]
        public void Clamp_DropPerUnit_ClampsBetween001And05(double input, double expected)
        {
            string json = $"{{\"demand\": {{\"drop_per_unit\": {input.ToString(System.Globalization.CultureInfo.InvariantCulture)}}}}}";
            var config = MarketConfig.Load(json);
            Assert.Equal(expected, config.DemandDropPerUnit, 3);
        }

        [Theory]
        [InlineData(-0.1, 0.01)]
        [InlineData(0.01, 0.01)]
        [InlineData(0.20, 0.20)]
        [InlineData(0.50, 0.50)]
        [InlineData(1.50, 0.50)]
        public void Clamp_RecoverPerDay_ClampsBetween001And05(double input, double expected)
        {
            string json = $"{{\"demand\": {{\"recover_per_day\": {input.ToString(System.Globalization.CultureInfo.InvariantCulture)}}}}}";
            var config = MarketConfig.Load(json);
            Assert.Equal(expected, config.DemandRecoverPerDay, 3);
        }

        [Theory]
        [InlineData(-5, 0)]
        [InlineData(0, 0)]
        [InlineData(15, 15)]
        [InlineData(20, 20)]
        [InlineData(30, 20)]
        public void Clamp_PriceWigglePercent_ClampsBetween0And20(int input, int expected)
        {
            string json = $"{{\"price_wiggle_percent\": {input}}}";
            var config = MarketConfig.Load(json);
            Assert.Equal(expected, config.PriceWigglePercent);
        }

        [Theory]
        [InlineData(2, 5)]
        [InlineData(5, 5)]
        [InlineData(50, 50)]
        [InlineData(200, 200)]
        [InlineData(350, 200)]
        public void Clamp_DailySalesCap_ClampsBetween5And200(int input, int expected)
        {
            string json = $"{{\"daily_sales_cap_clovers\": {input}}}";
            var config = MarketConfig.Load(json);
            Assert.Equal(expected, config.DailySalesCapClovers);
        }

        [Theory]
        [InlineData(-1, 0)]
        [InlineData(0, 0)]
        [InlineData(6, 6)]
        [InlineData(23, 23)]
        [InlineData(24, 23)]
        public void Clamp_RestockHourLocal_ClampsBetween0And23(int input, int expected)
        {
            string json = $"{{\"restock_hour_local\": {input}}}";
            var config = MarketConfig.Load(json);
            Assert.Equal(expected, config.RestockHourLocal);
        }

        [Fact]
        public void UnknownFields_AreIgnored()
        {
            string json = @"
            {
                ""unlocked_at_start"": true,
                ""daily_sales_cap_clovers"": 45,
                ""unknown_number"": 999,
                ""unknown_object"": {
                    ""nested"": ""value""
                },
                ""unknown_array"": [1, 2, 3],
                ""orders"": {
                    ""per_day"": 3,
                    ""extra_order_field"": ""ignored""
                }
            }";

            var config = MarketConfig.Load(json);
            Assert.Equal(45, config.DailySalesCapClovers);
            Assert.Equal(3, config.OrdersPerDay);
        }

        [Fact]
        public void RealFile_RecoverDropRatio_Between05And4()
        {
            string filePath = RepoFile("assets/data/market.json");
            var config = MarketConfig.LoadFromFile(filePath);

            double ratio = config.DemandRecoverPerDay / config.DemandDropPerUnit;
            Assert.InRange(ratio, 0.5, 4.0);
        }

        [Theory]
        [InlineData(null)]
        [InlineData("")]
        [InlineData("   ")]
        [InlineData("{ invalid json string }")]
        public void BadJson_GivesCodeDefaults(string? invalidJson)
        {
            var config = MarketConfig.Load(invalidJson);
            var expectedDefaults = MarketConfig.CreateDefault();

            Assert.Equal(expectedDefaults.DailySalesCapClovers, config.DailySalesCapClovers);
            Assert.Equal(expectedDefaults.PriceWigglePercent, config.PriceWigglePercent);
            Assert.Equal(expectedDefaults.DemandFloor, config.DemandFloor, 3);
            Assert.Equal(expectedDefaults.SpecialPool, config.SpecialPool);
        }
    }
}
