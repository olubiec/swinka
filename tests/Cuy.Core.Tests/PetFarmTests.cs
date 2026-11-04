using System;
using System.Collections.Generic;
using System.IO;
using Cuy.Core.Achievements;
using Cuy.Core.Time;
using Cuy.Core.World;
using Xunit;

namespace Cuy.Core.Tests
{
    public class PetFarmTests
    {
        private static string RepoFile(string relativePath)
        {
            string dir = AppContext.BaseDirectory;
            while (dir != null && !File.Exists(Path.Combine(dir, "Cuy.sln")))
            {
                dir = Path.GetDirectoryName(dir);
            }
            return Path.Combine(dir ?? "", relativePath);
        }

        private Pet CreatePet(int initialClovers = 1000, bool farmActive = true)
        {
            var state = new GameState();
            state.Clovers = initialClovers;
            var clock = new ManualClock(new DateTime(2026, 6, 1, 10, 0, 0, DateTimeKind.Utc));
            var balance = Balance.CreateDefault();
            balance.FarmActive = farmActive;
            balance.PlacesActive = true;
            var pet = new Pet(state, clock, balance);

            string farmPath = RepoFile("assets/data/farm.json");
            if (File.Exists(farmPath))
            {
                pet.FarmConfig = FarmConfig.LoadFromFile(farmPath);
            }

            string achPath = RepoFile("assets/data/achievements.json");
            if (File.Exists(achPath))
            {
                pet.AchievementsTable = AchievementCatalog.Load(File.ReadAllText(achPath));
            }

            pet.EnsureWorld();
            pet.State.World.Farm.PlotsOwned = pet.FarmConfig.StartPlots;
            pet.State.World.Farm.Plots = new List<PlotState>();
            for (int i = 0; i < pet.State.World.Farm.PlotsOwned; i++)
            {
                pet.State.World.Farm.Plots.Add(new PlotState());
            }

            return pet;
        }

        [Fact]
        public void PlantingWithoutSeed_Refused_WithSeedConsumesOne()
        {
            var pet = CreatePet();

            // Planting without seed in inventory is refused
            Assert.Equal(0, pet.GetItemCount("seed_dandelion"));
            var res = pet.Plant(0, "dandelion");
            Assert.Equal(FarmResult.NoSeed, res);

            // Add seeds and plant
            pet.AddItem("seed_dandelion", 2);
            res = pet.Plant(0, "dandelion");
            Assert.Equal(FarmResult.Ok, res);
            Assert.Equal(1, pet.GetItemCount("seed_dandelion"));
            Assert.Equal("dandelion", pet.State.World.Farm.Plots[0].CropId);
        }

        [Fact]
        public void HarvestAfterGrowTime_GivesItems_AndCountsHarvests()
        {
            var pet = CreatePet();
            var clock = (ManualClock)pet.Clock;

            pet.AddItem("seed_dandelion", 1);
            Assert.Equal(FarmResult.Ok, pet.Plant(0, "dandelion"));

            // Too early to harvest
            var early = pet.Harvest(0);
            Assert.Equal(0, early.Count);

            // Advance clock past grow time (dandelion is 60 min)
            clock.Advance(TimeSpan.FromMinutes(65));

            var harvest = pet.Harvest(0);
            Assert.True(harvest.Count > 0);
            Assert.Equal("dandelion", harvest.ItemId);
            Assert.True(pet.GetItemCount("dandelion") >= harvest.Count);

            int harvests = 0;
            pet.State.Stats.Counters.TryGetValue("harvests", out harvests);
            Assert.Equal(1, harvests);
        }

        [Fact]
        public void AchievementFirstHarvest_Pays25Once()
        {
            var pet = CreatePet(initialClovers: 0);
            var clock = (ManualClock)pet.Clock;

            pet.AchievementsTable = AchievementCatalog.Load(
                @"{ ""achievements"": [ { ""id"": ""first_harvest"", ""title"": ""First Harvest"", ""rule"": { ""kind"": ""counter"", ""name"": ""harvests"", ""atLeast"": 1 }, ""reward"": 25 } ] }"
            );

            pet.AddItem("seed_dandelion", 2);
            pet.Plant(0, "dandelion");
            clock.Advance(TimeSpan.FromMinutes(65));

            pet.Harvest(0);
            // first_harvest achievement pays 25 clovers
            Assert.Equal(25, pet.State.Clovers);

            // Second harvest does not grant first_harvest again
            pet.Plant(0, "dandelion");
            clock.Advance(TimeSpan.FromMinutes(65));
            pet.Harvest(0);
            Assert.Equal(25, pet.State.Clovers);
        }

        [Fact]
        public void PlotPack_Costs200_Adds4Plots()
        {
            var pet = CreatePet(initialClovers: 300);
            Assert.Equal(4, pet.State.World.Farm.PlotsOwned);

            int cost = pet.BuyPlotPack();
            Assert.Equal(200, cost);
            Assert.Equal(100, pet.State.Clovers);
            Assert.Equal(8, pet.State.World.Farm.PlotsOwned);
        }

        [Fact]
        public void WateringWithCan2_Waters4Plots()
        {
            var pet = CreatePet(initialClovers: 500);

            // Buy can_2
            int canCost = pet.BuyCan("can_2");
            Assert.Equal(150, canCost);
            Assert.Equal("can_2", pet.State.World.Farm.CanId);

            // Plant crops on plots 0..3
            pet.AddItem("seed_dandelion", 4);
            for (int i = 0; i < 4; i++)
            {
                Assert.Equal(FarmResult.Ok, pet.Plant(i, "dandelion"));
                Assert.False(pet.State.World.Farm.Plots[i].Watered);
            }

            // Water plot 0 with can_2 (waters 4 plots)
            bool watered = pet.Water(0);
            Assert.True(watered);

            for (int i = 0; i < 4; i++)
            {
                Assert.True(pet.State.World.Farm.Plots[i].Watered);
            }
        }

        [Fact]
        public void Sprinkler_WatersAllPlots_OncePerDay()
        {
            // Start at 23:50 on 2026-06-01
            var state = new GameState();
            state.Clovers = 1000;
            var clock = new ManualClock(new DateTime(2026, 6, 1, 23, 50, 0, DateTimeKind.Utc));
            var balance = Balance.CreateDefault();
            balance.FarmActive = true;
            balance.PlacesActive = true;
            var pet = new Pet(state, clock, balance);

            string farmPath = RepoFile("assets/data/farm.json");
            if (File.Exists(farmPath))
            {
                pet.FarmConfig = FarmConfig.LoadFromFile(farmPath);
            }

            pet.EnsureWorld();
            pet.State.World.Farm.PlotsOwned = pet.FarmConfig.StartPlots;
            pet.State.World.Farm.Plots = new List<PlotState>();
            for (int i = 0; i < pet.State.World.Farm.PlotsOwned; i++)
            {
                pet.State.World.Farm.Plots.Add(new PlotState());
            }

            int spCost = pet.BuySprinkler();
            Assert.True(spCost > 0);
            Assert.True(pet.State.World.Farm.Sprinkler);

            // Plant 4 crops
            pet.AddItem("seed_dandelion", 4);
            for (int i = 0; i < 4; i++)
            {
                pet.Plant(i, "dandelion");
                Assert.False(pet.State.World.Farm.Plots[i].Watered);
            }

            // FarmTick waters all plots on 2026-06-01
            pet.FarmTick();
            for (int i = 0; i < 4; i++)
            {
                Assert.True(pet.State.World.Farm.Plots[i].Watered);
            }

            // Unwater plot 0; second tick on same day should NOT re-water
            pet.State.World.Farm.Plots[0].Watered = false;
            pet.FarmTick();
            Assert.False(pet.State.World.Farm.Plots[0].Watered);

            // Advance by 15 minutes to 00:05 on next day 2026-06-02 (crop has only grown 15 min < 60 min, not ripe)
            clock.Advance(TimeSpan.FromMinutes(15));
            pet.FarmTick();
            Assert.True(pet.State.World.Farm.Plots[0].Watered);
        }

        [Fact]
        public void FlagOff_DisablesEverything()
        {
            var pet = CreatePet(initialClovers: 1000, farmActive: false);

            pet.AddItem("seed_dandelion", 5);
            Assert.Equal(FarmResult.Disabled, pet.Plant(0, "dandelion"));
            Assert.False(pet.Water(0));
            Assert.Equal(0, pet.Harvest(0).Count);
            Assert.Equal(0, pet.HarvestAll().Count);
            Assert.False(pet.PlantOrchard(0, "apple_tree"));
            Assert.Equal(0, pet.HarvestOrchard(0).Count);
            Assert.Equal(-1, pet.BuyPlotPack());
            Assert.Equal(-1, pet.BuyCan("can_2"));
            Assert.Equal(-1, pet.BuySprinkler());
        }
    }
}
