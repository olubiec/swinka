using System;
using System.IO;
using Cuy.Core.World;
using Newtonsoft.Json;
using Xunit;

namespace Cuy.Core.Tests
{
    public class FarmEngineTests
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

        private static FarmState CreateFarmState(int plotsOwned = 4, int orchardSlots = 2)
        {
            return new FarmState
            {
                PlotsOwned = plotsOwned,
                OrchardSlots = orchardSlots
            };
        }

        [Fact]
        public void Plant_UnlockedAndLockedCrops()
        {
            var cfg = LoadFarmConfig();
            var state = CreateFarmState();
            var now = new DateTime(2026, 5, 1, 10, 0, 0, DateTimeKind.Utc);

            // dandelion has unlock_harvests = 0
            Assert.Equal(PlantResult.Ok, FarmEngine.Plant(cfg, state, now, 0, "dandelion", harvestsDone: 0));

            // basil has unlock_harvests = 8
            Assert.Equal(PlantResult.Locked, FarmEngine.Plant(cfg, state, now, 1, "basil", harvestsDone: 7));
            Assert.Equal(PlantResult.Ok, FarmEngine.Plant(cfg, state, now, 1, "basil", harvestsDone: 8));
        }

        [Fact]
        public void Plant_OccupiedPlotAndBeyondPlotsOwned_AreRefused()
        {
            var cfg = LoadFarmConfig();
            var state = CreateFarmState(plotsOwned: 4);
            var now = new DateTime(2026, 5, 1, 10, 0, 0, DateTimeKind.Utc);

            Assert.Equal(PlantResult.Ok, FarmEngine.Plant(cfg, state, now, 0, "dandelion", 0));
            Assert.Equal(PlantResult.Occupied, FarmEngine.Plant(cfg, state, now, 0, "cilantro", 0));

            Assert.Equal(PlantResult.NoSuchPlot, FarmEngine.Plant(cfg, state, now, -1, "dandelion", 0));
            Assert.Equal(PlantResult.NoSuchPlot, FarmEngine.Plant(cfg, state, now, 4, "dandelion", 0));
            Assert.Equal(PlantResult.NoSuchPlot, FarmEngine.Plant(cfg, state, now, 10, "dandelion", 0));

            Assert.Equal(PlantResult.UnknownCrop, FarmEngine.Plant(cfg, state, now, 1, "unknown_crop", 0));
            Assert.Equal(PlantResult.NotAnnual, FarmEngine.Plant(cfg, state, now, 1, "strawberry", 100));
        }

        [Fact]
        public void IsRipe_ExactTiming_Dandelion59MinNo_60MinYes()
        {
            var cfg = LoadFarmConfig();
            var state = CreateFarmState();
            var t0 = new DateTime(2026, 5, 1, 10, 0, 0, DateTimeKind.Utc);

            Assert.Equal(PlantResult.Ok, FarmEngine.Plant(cfg, state, t0, 0, "dandelion", 0));

            Assert.False(FarmEngine.IsRipe(cfg, state, t0.AddMinutes(59), 0));
            Assert.Equal(TimeSpan.FromMinutes(1), FarmEngine.TimeLeft(cfg, state, t0.AddMinutes(59), 0));

            Assert.True(FarmEngine.IsRipe(cfg, state, t0.AddMinutes(60), 0));
            Assert.Equal(TimeSpan.Zero, FarmEngine.TimeLeft(cfg, state, t0.AddMinutes(60), 0));
        }

        [Fact]
        public void Water_Cuts20Percent_AndCannotBeRepeatedInOneCycle()
        {
            var cfg = LoadFarmConfig();
            var state = CreateFarmState();
            var t0 = new DateTime(2026, 5, 1, 10, 0, 0, DateTimeKind.Utc);

            // Unplanted plot cannot be watered
            Assert.False(FarmEngine.Water(cfg, state, t0, 0));

            Assert.Equal(PlantResult.Ok, FarmEngine.Plant(cfg, state, t0, 0, "dandelion", 0));

            // First watering succeeds
            Assert.True(FarmEngine.Water(cfg, state, t0.AddMinutes(5), 0));
            // Second watering in the same cycle fails
            Assert.False(FarmEngine.Water(cfg, state, t0.AddMinutes(10), 0));

            // 60 min * 0.8 = 48 min
            Assert.False(FarmEngine.IsRipe(cfg, state, t0.AddMinutes(47), 0));
            Assert.True(FarmEngine.IsRipe(cfg, state, t0.AddMinutes(48), 0));

            // Ripe plot cannot be watered either
            Assert.Equal(PlantResult.Ok, FarmEngine.Plant(cfg, state, t0, 1, "dandelion", 0));
            Assert.False(FarmEngine.Water(cfg, state, t0.AddMinutes(60), 1));
        }

        [Fact]
        public void Harvest_NotRipePlot_GivesZeroAndDoesNotEmptyPlot()
        {
            var cfg = LoadFarmConfig();
            var state = CreateFarmState();
            var t0 = new DateTime(2026, 5, 1, 10, 0, 0, DateTimeKind.Utc);

            Assert.Equal(PlantResult.Ok, FarmEngine.Plant(cfg, state, t0, 0, "dandelion", 0));

            int harvestsDone = 0;
            var res = FarmEngine.Harvest(cfg, state, t0.AddMinutes(30), 0, ref harvestsDone);
            Assert.Equal(0, res.Count);
            Assert.NotNull(state.Plots[0]);
            Assert.Equal(0, harvestsDone);
        }

        [Fact]
        public void Harvest_DeterministicGreatHarvest_SameCallTwiceGivesSameOutcome()
        {
            var cfg = LoadFarmConfig();
            var t0 = new DateTime(2026, 5, 1, 10, 0, 0, DateTimeKind.Utc);

            bool sawNormal = false;
            bool sawGreat = false;

            for (int i = 0; i < 100; i++)
            {
                var plantedAt = t0.AddSeconds(i * 37);
                var state1 = CreateFarmState();
                var state2 = CreateFarmState();

                FarmEngine.Plant(cfg, state1, plantedAt, 0, "dandelion", 0);
                FarmEngine.Plant(cfg, state2, plantedAt, 0, "dandelion", 0);

                var res1 = FarmEngine.Harvest(cfg, state1, plantedAt.AddMinutes(60), 0);
                var res2 = FarmEngine.Harvest(cfg, state2, plantedAt.AddMinutes(60), 0);

                Assert.Equal(res1.Count, res2.Count);
                Assert.Equal(res1.GreatHarvest, res2.GreatHarvest);
                Assert.Equal("dandelion", res1.ItemId);

                if (res1.GreatHarvest)
                {
                    sawGreat = true;
                    Assert.Equal(3, res1.Count);
                }
                else
                {
                    sawNormal = true;
                    Assert.Equal(2, res1.Count);
                }
            }

            Assert.True(sawNormal);
            Assert.True(sawGreat);
        }

        [Fact]
        public void Jump400Days_SingleHarvestPerAnnualPlot_AndMaxStockForOrchard()
        {
            var cfg = LoadFarmConfig();
            var state = CreateFarmState(plotsOwned: 4, orchardSlots: 2);
            var t0 = new DateTime(2026, 5, 1, 10, 0, 0, DateTimeKind.Utc);

            Assert.Equal(PlantResult.Ok, FarmEngine.Plant(cfg, state, t0, 0, "dandelion", 0));
            Assert.Equal(PlantResult.Ok, FarmEngine.PlantOrchard(cfg, state, t0, 0, "strawberry", 100));

            var t400 = t0.AddDays(400);

            // Annual plot gives only 1 harvest (yield 2 or 3) and becomes empty
            var annualHarvest = FarmEngine.Harvest(cfg, state, t400, 0);
            Assert.InRange(annualHarvest.Count, 2, 3);
            Assert.Null(state.Plots[0]);
            Assert.Equal(0, FarmEngine.Harvest(cfg, state, t400, 0).Count);

            // Orchard strawberry has yield 2, max_stock 4
            FarmEngine.Tick(cfg, state, t400);
            Assert.Equal(4, state.Orchard[0].Stock);

            var orchardHarvest = FarmEngine.HarvestOrchard(cfg, state, t400, 0);
            Assert.Equal("strawberry", orchardHarvest.ItemId);
            Assert.Equal(4, orchardHarvest.Count);
            Assert.Equal(0, state.Orchard[0].Stock);

            // Next cycle starts from harvest when capped
            FarmEngine.Tick(cfg, state, t400.AddMinutes(479));
            Assert.Equal(0, state.Orchard[0].Stock);
            FarmEngine.Tick(cfg, state, t400.AddMinutes(480));
            Assert.Equal(2, state.Orchard[0].Stock);
        }

        [Fact]
        public void HarvestAll_CollectsEveryRipePlot_AndLeavesGrowingOnes()
        {
            var cfg = LoadFarmConfig();
            var state = CreateFarmState(plotsOwned: 4);
            var t0 = new DateTime(2026, 5, 1, 10, 0, 0, DateTimeKind.Utc);

            // dandelion: 60m, cilantro: 90m, parsley: 150m
            FarmEngine.Plant(cfg, state, t0, 0, "dandelion", 0);
            FarmEngine.Plant(cfg, state, t0, 1, "cilantro", 0);
            FarmEngine.Plant(cfg, state, t0, 2, "parsley", 0);

            var harvested = FarmEngine.HarvestAll(cfg, state, t0.AddMinutes(100));
            Assert.Equal(2, harvested.Count);
            Assert.Equal("dandelion", harvested[0].ItemId);
            Assert.Equal("cilantro", harvested[1].ItemId);

            Assert.Null(state.Plots[0]);
            Assert.Null(state.Plots[1]);
            Assert.NotNull(state.Plots[2]);
        }
    }
}
