using System;
using System.Collections.Generic;
using Cuy.Core.World;
using Xunit;

namespace Cuy.Core.Tests
{
    public class FarmEngineTests
    {
        private FarmConfig CreateTestConfig()
        {
            var crops = new List<CropDefinition>
            {
                new CropDefinition("dandelion", "dandelion", CropKind.Annual, "seed_dandelion", 10, 60, 2, 5, 0, 0),
                new CropDefinition("cilantro", "cilantro", CropKind.Annual, "seed_cilantro", 15, 90, 2, 8, 0, 0),
                new CropDefinition("locked_herb", "locked_herb", CropKind.Annual, "seed_herb", 20, 100, 3, 10, 10, 0),
                new CropDefinition("apple_tree", "apple", CropKind.Perennial, "seed_apple", 50, 120, 1, 15, 0, 4)
            };

            return new FarmConfig(
                startPlots: 4,
                plotPacks: new List<PlotPack> { new PlotPack(4, 200) },
                orchardSlots: new List<int> { 130, 200 },
                waterTimeCutPercent: 20,
                cans: new List<WaterCan> { new WaterCan("can_1", 1, 0, false), new WaterCan("can_2", 4, 150, false) },
                greatHarvestChancePercent: 30,
                greatHarvestExtraYield: 2,
                overripeNeverSpoils: true,
                starterSeeds: new Dictionary<string, int> { ["dandelion"] = 3 },
                forbiddenFoods: new List<string> { "onion" },
                crops: crops
            );
        }

        [Fact]
        public void PlantingUnlockedAndLockedCrops()
        {
            var cfg = CreateTestConfig();
            var state = new FarmState { PlotsOwned = 4 };
            var now = new DateTime(2026, 1, 1, 12, 0, 0, DateTimeKind.Utc);

            // dandelion requires 0 harvests
            var r1 = FarmEngine.Plant(cfg, state, now, 0, "dandelion", harvestsDone: 0);
            Assert.Equal(PlantResult.Ok, r1);

            // locked_herb requires 10 harvests
            var r2 = FarmEngine.Plant(cfg, state, now, 1, "locked_herb", harvestsDone: 5);
            Assert.Equal(PlantResult.Locked, r2);

            var r3 = FarmEngine.Plant(cfg, state, now, 1, "locked_herb", harvestsDone: 10);
            Assert.Equal(PlantResult.Ok, r3);

            // Unknown crop
            var r4 = FarmEngine.Plant(cfg, state, now, 2, "magic_beans", harvestsDone: 100);
            Assert.Equal(PlantResult.UnknownCrop, r4);

            // Perennial in annual plot
            var r5 = FarmEngine.Plant(cfg, state, now, 2, "apple_tree", harvestsDone: 100);
            Assert.Equal(PlantResult.NotAnnual, r5);
        }

        [Fact]
        public void RipeAfterExactTime()
        {
            var cfg = CreateTestConfig();
            var state = new FarmState { PlotsOwned = 4 };
            var plantTime = new DateTime(2026, 1, 1, 12, 0, 0, DateTimeKind.Utc);

            FarmEngine.Plant(cfg, state, plantTime, 0, "dandelion", harvestsDone: 0);

            // 59 minutes: not ripe
            var at59 = plantTime.AddMinutes(59);
            Assert.False(FarmEngine.IsRipe(cfg, state, at59, 0));
            var left59 = FarmEngine.TimeLeft(cfg, state, at59, 0);
            Assert.NotNull(left59);
            Assert.Equal(TimeSpan.FromMinutes(1), left59.Value);

            // 60 minutes: ripe!
            var at60 = plantTime.AddMinutes(60);
            Assert.True(FarmEngine.IsRipe(cfg, state, at60, 0));
            var left60 = FarmEngine.TimeLeft(cfg, state, at60, 0);
            Assert.NotNull(left60);
            Assert.Equal(TimeSpan.Zero, left60.Value);
        }

        [Fact]
        public void WateringCuts20PercentAndCannotBeRepeatedInOneCycle()
        {
            var cfg = CreateTestConfig();
            var state = new FarmState { PlotsOwned = 4 };
            var plantTime = new DateTime(2026, 1, 1, 12, 0, 0, DateTimeKind.Utc);

            FarmEngine.Plant(cfg, state, plantTime, 0, "dandelion", harvestsDone: 0);

            // Water the plot
            bool wateredFirst = FarmEngine.Water(cfg, state, plantTime.AddMinutes(10), 0);
            Assert.True(wateredFirst);

            // Cannot water again in the same cycle
            bool wateredSecond = FarmEngine.Water(cfg, state, plantTime.AddMinutes(20), 0);
            Assert.False(wateredSecond);

            // Dandelion is 60 min. With 20% cut: 60 * 0.8 = 48 minutes needed
            var at47 = plantTime.AddMinutes(47);
            Assert.False(FarmEngine.IsRipe(cfg, state, at47, 0));

            var at48 = plantTime.AddMinutes(48);
            Assert.True(FarmEngine.IsRipe(cfg, state, at48, 0));

            // Cannot water once already ripe
            var stateRipe = new FarmState { PlotsOwned = 4 };
            FarmEngine.Plant(cfg, stateRipe, plantTime, 0, "dandelion", harvestsDone: 0);
            bool wateredWhenRipe = FarmEngine.Water(cfg, stateRipe, plantTime.AddMinutes(65), 0);
            Assert.False(wateredWhenRipe);
        }

        [Fact]
        public void HarvestingNotRipePlotGivesZero()
        {
            var cfg = CreateTestConfig();
            var state = new FarmState { PlotsOwned = 4 };
            var plantTime = new DateTime(2026, 1, 1, 12, 0, 0, DateTimeKind.Utc);

            FarmEngine.Plant(cfg, state, plantTime, 0, "dandelion", harvestsDone: 0);

            var result = FarmEngine.Harvest(cfg, state, plantTime.AddMinutes(30), 0);
            Assert.Equal(0, result.Count);
            Assert.Equal("dandelion", result.ItemId);

            // Plot must still be occupied
            Assert.Equal("dandelion", state.Plots[0].CropId);
        }

        [Fact]
        public void SameCallTwiceGivesSameGreatHarvestOutcome()
        {
            var cfg = CreateTestConfig();
            var plantTime = new DateTime(2026, 1, 1, 12, 0, 0, DateTimeKind.Utc);
            var harvestTime = plantTime.AddMinutes(100);

            var stateA = new FarmState { PlotsOwned = 4 };
            FarmEngine.Plant(cfg, stateA, plantTime, 0, "dandelion", 0);

            var stateB = new FarmState { PlotsOwned = 4 };
            FarmEngine.Plant(cfg, stateB, plantTime, 0, "dandelion", 0);

            var resA = FarmEngine.Harvest(cfg, stateA, harvestTime, 0);
            var resB = FarmEngine.Harvest(cfg, stateB, harvestTime, 0);

            Assert.Equal(resA.Count, resB.Count);
            Assert.Equal(resA.GreatHarvest, resB.GreatHarvest);
        }

        [Fact]
        public void Jump400DaysDoesNotGiveMoreThanOneHarvestForAnnualAndNoMoreThanMaxStockForOrchard()
        {
            var cfg = CreateTestConfig();
            var state = new FarmState { PlotsOwned = 4, OrchardSlots = 2 };
            var plantTime = new DateTime(2026, 1, 1, 12, 0, 0, DateTimeKind.Utc);

            FarmEngine.Plant(cfg, state, plantTime, 0, "dandelion", 0);
            FarmEngine.PlantOrchard(cfg, state, plantTime, 0, "apple_tree", 0);

            var jumpTime = plantTime.AddDays(400);

            // Annual crop gives exactly 1 harvest and empties the plot
            var annualRes = FarmEngine.Harvest(cfg, state, jumpTime, 0);
            Assert.True(annualRes.Count >= 2); // yield is 2 (+2 if great)
            Assert.Null(state.Plots[0].CropId);

            // Subsequent harvest gives 0
            var annualRes2 = FarmEngine.Harvest(cfg, state, jumpTime, 0);
            Assert.Equal(0, annualRes2.Count);

            // Orchard stock is capped at MaxStock (4)
            FarmEngine.Tick(cfg, state, jumpTime);
            var orchardRes = FarmEngine.HarvestOrchard(cfg, state, jumpTime, 0);
            Assert.Equal(4, orchardRes.Count); // MaxStock is 4
            Assert.Equal("apple", orchardRes.ItemId);

            // After harvest, stock is 0
            Assert.Equal(0, state.Orchard[0].Stock);
        }

        [Fact]
        public void HarvestAllCollectsEveryRipePlot()
        {
            var cfg = CreateTestConfig();
            var state = new FarmState { PlotsOwned = 4 };
            var plantTime = new DateTime(2026, 1, 1, 12, 0, 0, DateTimeKind.Utc);

            FarmEngine.Plant(cfg, state, plantTime, 0, "dandelion", 0); // 60 min -> ripe at 70 min
            FarmEngine.Plant(cfg, state, plantTime, 1, "cilantro", 0);  // 90 min -> not ripe at 70 min
            FarmEngine.Plant(cfg, state, plantTime, 2, "dandelion", 0); // 60 min -> ripe at 70 min
            // Plot 3 is empty

            var checkTime = plantTime.AddMinutes(70);
            var harvested = FarmEngine.HarvestAll(cfg, state, checkTime);

            Assert.Equal(2, harvested.Count);
            Assert.Null(state.Plots[0].CropId);
            Assert.Equal("cilantro", state.Plots[1].CropId);
            Assert.Null(state.Plots[2].CropId);
        }

        [Fact]
        public void PlantingOnOccupiedPlotIsRefused()
        {
            var cfg = CreateTestConfig();
            var state = new FarmState { PlotsOwned = 4 };
            var now = DateTime.UtcNow;

            var r1 = FarmEngine.Plant(cfg, state, now, 0, "dandelion", 0);
            Assert.Equal(PlantResult.Ok, r1);

            var r2 = FarmEngine.Plant(cfg, state, now, 0, "dandelion", 0);
            Assert.Equal(PlantResult.Occupied, r2);
        }

        [Fact]
        public void PlotIndexBeyondPlotsOwnedIsNoSuchPlot()
        {
            var cfg = CreateTestConfig();
            var state = new FarmState { PlotsOwned = 4 };
            var now = DateTime.UtcNow;

            Assert.Equal(PlantResult.NoSuchPlot, FarmEngine.Plant(cfg, state, now, -1, "dandelion", 0));
            Assert.Equal(PlantResult.NoSuchPlot, FarmEngine.Plant(cfg, state, now, 4, "dandelion", 0));
            Assert.Equal(PlantResult.NoSuchPlot, FarmEngine.Plant(cfg, state, now, 10, "dandelion", 0));
            Assert.Equal(PlantResult.Ok, FarmEngine.Plant(cfg, state, now, 3, "dandelion", 0));
        }

        [Fact]
        public void WaterManyWatersPlotsWithinBounds()
        {
            var cfg = CreateTestConfig();
            var state = new FarmState { PlotsOwned = 4 };
            var now = DateTime.UtcNow;

            FarmEngine.Plant(cfg, state, now, 0, "dandelion", 0);
            FarmEngine.Plant(cfg, state, now, 1, "dandelion", 0);
            FarmEngine.Plant(cfg, state, now, 2, "dandelion", 0);
            // plot 3 is empty

            int watered = FarmEngine.WaterMany(cfg, state, now, 0, 4);
            Assert.Equal(3, watered); // plot 0, 1, 2 watered; plot 3 empty
            Assert.True(state.Plots[0].Watered);
            Assert.True(state.Plots[1].Watered);
            Assert.True(state.Plots[2].Watered);
        }
    }
}
