using System;
using System.IO;
using Cuy.Core.World;
using Xunit;

namespace Cuy.Core.Tests
{
    public class FarmExpansionTests
    {
        private static string RepoFile(string relativePath)
        {
            var dir = AppDomain.CurrentDomain.BaseDirectory;
            while (dir != null && !File.Exists(Path.Combine(dir, "Cuy.sln")))
            {
                dir = Path.GetDirectoryName(dir);
            }
            if (dir == null) throw new Exception("Could not find Cuy.sln to determine repo root.");
            return Path.Combine(dir, relativePath);
        }

        private static FarmConfig LoadFarmConfig()
        {
            return FarmConfig.LoadFromFile(RepoFile("assets/data/farm.json"));
        }

        [Fact]
        public void PlotPacks_CostsFollowFileOrder_AndReach24PlotsThenMinusOne()
        {
            var cfg = LoadFarmConfig();
            var state = new FarmState { PlotsOwned = cfg.StartPlots };

            int[] expectedCosts = { 200, 400, 660, 1060, 1600 };

            for (int i = 0; i < expectedCosts.Length; i++)
            {
                Assert.Equal(expectedCosts[i], FarmExpansion.NextPackCost(cfg, state));
                Assert.True(FarmExpansion.ApplyPack(cfg, state));
                Assert.Equal(4 + (i + 1) * 4, state.PlotsOwned);
            }

            Assert.Equal(24, state.PlotsOwned);
            Assert.Equal(-1, FarmExpansion.NextPackCost(cfg, state));
            Assert.False(FarmExpansion.ApplyPack(cfg, state));
            Assert.Equal(24, state.PlotsOwned);
        }

        [Fact]
        public void OrchardSlots_FourSlotsFollowFileOrder_ThenMinusOne()
        {
            var cfg = LoadFarmConfig();
            var state = new FarmState { OrchardSlots = 0 };

            int[] expectedCosts = { 130, 200, 270, 400 };

            for (int i = 0; i < expectedCosts.Length; i++)
            {
                Assert.Equal(expectedCosts[i], FarmExpansion.NextOrchardCost(cfg, state));
                Assert.True(FarmExpansion.ApplyOrchardSlot(cfg, state));
                Assert.Equal(i + 1, state.OrchardSlots);
            }

            Assert.Equal(4, state.OrchardSlots);
            Assert.Equal(-1, FarmExpansion.NextOrchardCost(cfg, state));
            Assert.False(FarmExpansion.ApplyOrchardSlot(cfg, state));
            Assert.Equal(4, state.OrchardSlots);
        }

        [Fact]
        public void Cans_DefaultCan1_Can2RequiresCan1_PlotsPerWaterUseUpdatesFrom1To4()
        {
            var cfg = LoadFarmConfig();
            var state = new FarmState { PlotsOwned = 4 };

            // Default can is can_1 -> 1 plot per water use
            Assert.Equal(1, FarmExpansion.PlotsPerWaterUse(state, cfg));
            Assert.False(FarmExpansion.CanBuyCan(cfg, state, "can_1"));
            Assert.True(FarmExpansion.CanBuyCan(cfg, state, "can_2"));
            Assert.Equal(150, FarmExpansion.NextCanCost(cfg, state));

            // If state has an unknown/unowned previous can, can_2 cannot be bought before can_1
            var noCanState = new FarmState { CanId = "none" };
            Assert.False(FarmExpansion.CanBuyCan(cfg, noCanState, "can_2"));
            Assert.True(FarmExpansion.CanBuyCan(cfg, noCanState, "can_1"));
            Assert.True(FarmExpansion.ApplyCan(cfg, noCanState, "can_1"));
            Assert.True(FarmExpansion.CanBuyCan(cfg, noCanState, "can_2"));

            // Applying can_2 upgrades plots per water use to 4 and prevents re-buying
            Assert.True(FarmExpansion.ApplyCan(cfg, state, "can_2"));
            Assert.Equal("can_2", state.CanId);
            Assert.Equal(4, FarmExpansion.PlotsPerWaterUse(state, cfg));
            Assert.False(FarmExpansion.CanBuyCan(cfg, state, "can_2"));
            Assert.False(FarmExpansion.ApplyCan(cfg, state, "can_2"));
            Assert.Equal(-1, FarmExpansion.NextCanCost(cfg, state));
        }

        [Fact]
        public void Sprinkler_NeedsNothing_AppliedOnce()
        {
            var cfg = LoadFarmConfig();
            var state = new FarmState { PlotsOwned = 4 };

            Assert.False(state.Sprinkler);
            Assert.Equal(650, FarmExpansion.SprinklerCost(cfg, state));
            Assert.True(FarmExpansion.CanBuySprinkler(cfg, state));

            Assert.True(FarmExpansion.ApplySprinkler(cfg, state));
            Assert.True(state.Sprinkler);

            // Second application is refused
            Assert.False(FarmExpansion.CanBuySprinkler(cfg, state));
            Assert.False(FarmExpansion.ApplySprinkler(cfg, state));
            Assert.Equal(-1, FarmExpansion.SprinklerCost(cfg, state));
        }
    }
}
