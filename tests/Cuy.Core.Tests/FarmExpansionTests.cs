using Cuy.Core.World;
using Xunit;

namespace Cuy.Core.Tests
{
    public class FarmExpansionTests
    {
        [Fact]
        public void CostsFollowFileInOrder_AfterFivePacksNextPackCostIsMinusOneAndPlotsTotal24()
        {
            var cfg = FarmConfig.LoadDefault();
            var state = new FarmState { PlotsOwned = cfg.StartPlots };

            var expectedCosts = new[] { 200, 400, 660, 1060, 1600 };
            var expectedPlots = new[] { 8, 12, 16, 20, 24 };

            for (int i = 0; i < expectedCosts.Length; i++)
            {
                int cost = FarmExpansion.NextPackCost(cfg, state);
                Assert.Equal(expectedCosts[i], cost);

                bool applied = FarmExpansion.ApplyPack(cfg, state);
                Assert.True(applied);
                Assert.Equal(expectedPlots[i], state.PlotsOwned);
                Assert.Equal(expectedPlots[i], state.Plots.Count);
            }

            // After five packs: NextPackCost is -1 and plots total 24
            Assert.Equal(24, state.PlotsOwned);
            Assert.Equal(-1, FarmExpansion.NextPackCost(cfg, state));
            Assert.False(FarmExpansion.ApplyPack(cfg, state));
            Assert.Equal(24, state.PlotsOwned);
        }

        [Fact]
        public void FourOrchardSlotsThenMinusOne()
        {
            var cfg = FarmConfig.LoadDefault();
            var state = new FarmState { OrchardSlots = 0 };

            var expectedCosts = new[] { 130, 200, 270, 400 };

            for (int i = 0; i < expectedCosts.Length; i++)
            {
                int cost = FarmExpansion.NextOrchardCost(cfg, state);
                Assert.Equal(expectedCosts[i], cost);

                bool applied = FarmExpansion.ApplyOrchardSlot(cfg, state);
                Assert.True(applied);
                Assert.Equal(i + 1, state.OrchardSlots);
                Assert.Equal(i + 1, state.Orchard.Count);
            }

            // Four slots bought, next cost is -1
            Assert.Equal(4, state.OrchardSlots);
            Assert.Equal(-1, FarmExpansion.NextOrchardCost(cfg, state));
            Assert.False(FarmExpansion.ApplyOrchardSlot(cfg, state));
            Assert.Equal(4, state.OrchardSlots);
        }

        [Fact]
        public void CanProgression_Can2NotAvailableBeforeCan1_Can1IsDefault()
        {
            var cfg = FarmConfig.LoadDefault();
            var state = new FarmState(); // CanId is null, can_1 is default

            // can_1 cannot be bought because it is already default
            Assert.False(FarmExpansion.CanBuyCan(cfg, state, "can_1"));

            // can_2 is available when can_1 is active
            Assert.True(FarmExpansion.CanBuyCan(cfg, state, "can_2"));

            // If an invalid/empty/no can was somehow set to "none", can_2 is not available before can_1
            var stateWithoutCan1 = new FarmState { CanId = "none" };
            Assert.False(FarmExpansion.CanBuyCan(cfg, stateWithoutCan1, "can_2"));

            // Buy can_2
            bool applied = FarmExpansion.ApplyCan(cfg, state, "can_2");
            Assert.True(applied);
            Assert.Equal("can_2", state.CanId);

            // Once bought, cannot buy can_2 again
            Assert.False(FarmExpansion.CanBuyCan(cfg, state, "can_2"));
            Assert.False(FarmExpansion.ApplyCan(cfg, state, "can_2"));
        }

        [Fact]
        public void SprinklerNeedsNothingButIsAppliedOnce()
        {
            var cfg = FarmConfig.LoadDefault();
            var state = new FarmState { Sprinkler = false };

            Assert.True(FarmExpansion.CanBuySprinkler(cfg, state));
            bool applied = FarmExpansion.ApplySprinkler(cfg, state);
            Assert.True(applied);
            Assert.True(state.Sprinkler);

            // Cannot apply again
            Assert.False(FarmExpansion.CanBuySprinkler(cfg, state));
            Assert.False(FarmExpansion.ApplySprinkler(cfg, state));
        }

        [Fact]
        public void PlotsPerWaterUseIs1And4AfterCan2()
        {
            var cfg = FarmConfig.LoadDefault();
            var state = new FarmState(); // default can_1

            Assert.Equal(1, FarmExpansion.PlotsPerWaterUse(state, cfg));

            state.CanId = "can_1";
            Assert.Equal(1, FarmExpansion.PlotsPerWaterUse(state, cfg));

            FarmExpansion.ApplyCan(cfg, state, "can_2");
            Assert.Equal(4, FarmExpansion.PlotsPerWaterUse(state, cfg));
        }
    }
}
