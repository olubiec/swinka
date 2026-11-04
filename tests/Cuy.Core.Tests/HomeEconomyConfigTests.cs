using System;
using System.IO;
using System.Linq;
using Cuy.Core.World;
using Xunit;

namespace Cuy.Core.Tests
{
    public class HomeEconomyConfigTests
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

        private static HomeEconomyConfig RealConfig()
        {
            return HomeEconomyConfig.Load(File.ReadAllText(RepoFile("assets/data/home_economy.json")));
        }

        [Fact]
        public void RealFile_HasTheTunedValues()
        {
            var cfg = RealConfig();

            Assert.Equal(15, cfg.VariantUnlockPercent);
            Assert.Equal(5, cfg.VariantMinPrice);
            Assert.Equal(180, cfg.PigSkinPrice);
            Assert.False(cfg.ResaleAllowed);

            Assert.Equal(20, cfg.RoamSlotMinutes);
            Assert.Equal(22, cfg.RoamNightFromHour);
            Assert.Equal(7, cfg.RoamNightToHour);
            Assert.Equal("free", cfg.RoamDefaultMode);

            Assert.Equal(12, cfg.RunMinCells);
            Assert.Equal(6, cfg.RunCellsPerPig);
            Assert.Equal("gate_garden", cfg.RunGateItem);
            Assert.Equal(new[] { "fence_wood", "hedge", "gate_garden" }, cfg.RunBlockers.ToArray());
            Assert.Equal(6, cfg.RunMaxHoursPerDay);
            Assert.Equal(8, cfg.RunDayFromHour);
            Assert.Equal(19, cfg.RunDayToHour);
            Assert.Equal(10, cfg.RunMinTempC);
            Assert.Equal(28, cfg.RunMaxTempC);
            Assert.Equal(new[] { "Clear", "Cloudy" }, cfg.RunAllowedConditions.ToArray());
            Assert.Equal(1.0, cfg.RunMoodPerHour, 6);
            Assert.Equal(6, cfg.RunMoodCapPerDay);

            Assert.Equal(6, cfg.MaxPropsOnDesktop);
        }

        [Fact]
        public void VariantPrice_UsesPercentWithMinimumAndZeroForFree()
        {
            var cfg = RealConfig();

            Assert.Equal(48, cfg.VariantPrice(320));
            Assert.Equal(0, cfg.VariantPrice(0));
            Assert.Equal(5, cfg.VariantPrice(10));
        }

        [Fact]
        public void BrokenJson_GivesCodeDefaultsEqualToTheFile()
        {
            var cfg = HomeEconomyConfig.Load("[ not an object");
            var real = RealConfig();

            Assert.Equal(real.VariantUnlockPercent, cfg.VariantUnlockPercent);
            Assert.Equal(real.VariantMinPrice, cfg.VariantMinPrice);
            Assert.Equal(real.PigSkinPrice, cfg.PigSkinPrice);
            Assert.Equal(real.RoamNightFromHour, cfg.RoamNightFromHour);
            Assert.Equal(real.RunBlockers, cfg.RunBlockers);
            Assert.Equal(real.RunAllowedConditions, cfg.RunAllowedConditions);
            Assert.Equal(real.RunMoodPerHour, cfg.RunMoodPerHour, 6);
            Assert.Equal(real.MaxPropsOnDesktop, cfg.MaxPropsOnDesktop);
            Assert.False(cfg.ResaleAllowed);
        }

        [Fact]
        public void VariantUnlockPercent_IsClampedToOneToFifty()
        {
            Assert.Equal(1, HomeEconomyConfig.Load(@"{ ""variants"": { ""unlock_percent"": 0 } }").VariantUnlockPercent);
            Assert.Equal(50, HomeEconomyConfig.Load(@"{ ""variants"": { ""unlock_percent"": 99 } }").VariantUnlockPercent);
        }

        [Fact]
        public void CellsPerPig_IsClampedToThreeToTwenty()
        {
            Assert.Equal(3, HomeEconomyConfig.Load(@"{ ""run"": { ""cells_per_pig"": 1, ""min_cells"": 30 } }").RunCellsPerPig);
            Assert.Equal(20, HomeEconomyConfig.Load(@"{ ""run"": { ""cells_per_pig"": 50, ""min_cells"": 100 } }").RunCellsPerPig);
        }

        [Fact]
        public void MinCells_IsAtLeastTwiceCellsPerPig()
        {
            var cfg = HomeEconomyConfig.Load(@"{ ""run"": { ""cells_per_pig"": 6, ""min_cells"": 5 } }");

            Assert.Equal(12, cfg.RunMinCells);
            Assert.Equal(6, cfg.RunCellsPerPig);
        }

        [Fact]
        public void Hours_AreClampedToZeroToTwentyThree()
        {
            var cfg = HomeEconomyConfig.Load(@"{
                ""roam"": { ""night_from_hour"": 30, ""night_to_hour"": -2 },
                ""run"": { ""day_from_hour"": 99, ""day_to_hour"": -1 } }");

            Assert.Equal(23, cfg.RoamNightFromHour);
            Assert.Equal(0, cfg.RoamNightToHour);
            Assert.Equal(23, cfg.RunDayFromHour);
            Assert.Equal(0, cfg.RunDayToHour);
        }

        [Fact]
        public void Temperatures_AreOrdered()
        {
            var cfg = HomeEconomyConfig.Load(@"{ ""run"": { ""min_temp_c"": 20, ""max_temp_c"": 10 } }");

            Assert.Equal(20, cfg.RunMinTempC);
            Assert.Equal(20, cfg.RunMaxTempC);
        }

        [Fact]
        public void Mood_IsClamped()
        {
            var high = HomeEconomyConfig.Load(@"{ ""run"": { ""mood_per_hour"": 9, ""mood_cap_per_day"": 99 } }");
            Assert.Equal(3.0, high.RunMoodPerHour, 6);
            Assert.Equal(10, high.RunMoodCapPerDay);

            var low = HomeEconomyConfig.Load(@"{ ""run"": { ""mood_per_hour"": -1, ""mood_cap_per_day"": -4 } }");
            Assert.Equal(0.0, low.RunMoodPerHour, 6);
            Assert.Equal(0, low.RunMoodCapPerDay);
        }

        [Fact]
        public void BlockersAlwaysContainTheGateItem()
        {
            var cfg = HomeEconomyConfig.Load(@"{ ""run"": { ""gate_item"": ""gate_garden"", ""blockers"": [ ""hedge"" ] } }");

            Assert.Contains("gate_garden", cfg.RunBlockers);
            Assert.Contains("hedge", cfg.RunBlockers);
        }

        [Fact]
        public void DesktopProps_AreClampedToOneToTwelve()
        {
            Assert.Equal(1, HomeEconomyConfig.Load(@"{ ""props"": { ""max_on_desktop"": 0 } }").MaxPropsOnDesktop);
            Assert.Equal(12, HomeEconomyConfig.Load(@"{ ""props"": { ""max_on_desktop"": 40 } }").MaxPropsOnDesktop);
        }

        [Fact]
        public void ResaleIsForcedOff()
        {
            var cfg = HomeEconomyConfig.Load(@"{ ""resale"": { ""allowed"": true } }");

            Assert.False(cfg.ResaleAllowed);
        }

        [Fact]
        public void UnknownFields_AreIgnored()
        {
            var cfg = HomeEconomyConfig.Load(@"{
                ""note"": ""x"",
                ""unknown_section"": { ""a"": 1 },
                ""variants"": { ""unlock_percent"": 20, ""extra"": true } }");

            Assert.Equal(20, cfg.VariantUnlockPercent);
            Assert.Equal(5, cfg.VariantMinPrice);
        }
    }
}
