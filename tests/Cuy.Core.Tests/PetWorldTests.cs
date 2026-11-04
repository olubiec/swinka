using System;
using System.IO;
using Cuy.Core.Time;
using Cuy.Core.World;
using Xunit;

namespace Cuy.Core.Tests
{
    public class PetWorldTests
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

        private Pet CreatePet(int initialClovers = 0, bool placesActive = true)
        {
            var state = new GameState();
            state.Clovers = initialClovers;
            var clock = new ManualClock(new DateTime(2026, 1, 1, 12, 0, 0, DateTimeKind.Utc));
            var balance = Balance.CreateDefault();
            balance.PlacesActive = placesActive;
            var pet = new Pet(state, clock, balance);

            string placesPath = RepoFile("assets/data/places.json");
            if (File.Exists(placesPath))
            {
                pet.PlaceCatalog = PlaceCatalog.LoadFromFile(placesPath);
            }

            string farmPath = RepoFile("assets/data/farm.json");
            if (File.Exists(farmPath))
            {
                pet.FarmConfig = FarmConfig.LoadFromFile(farmPath);
            }

            return pet;
        }

        [Fact]
        public void UnlockGarden_With399Clovers_Fails_AndWith400_Succeeds()
        {
            var pet = CreatePet(initialClovers: 399, placesActive: true);

            string unlockedId = null;
            pet.PlaceUnlocked += (s, e) => unlockedId = e.Id;

            var failResult = pet.UnlockPlace("garden");
            Assert.Equal(WorldResult.NotEnoughClovers, failResult);
            Assert.Equal(399, pet.State.Clovers);
            Assert.Null(unlockedId);

            pet.AddClovers(1);
            Assert.Equal(400, pet.State.Clovers);

            var okResult = pet.UnlockPlace("garden");
            Assert.Equal(WorldResult.Ok, okResult);
            Assert.Equal(0, pet.State.Clovers);
            Assert.Equal("garden", unlockedId);
            Assert.Equal(1, pet.State.Stats.Counters["places_unlocked"]);
        }

        [Fact]
        public void UnlockFarm_WithoutGarden_IsLocked()
        {
            var pet = CreatePet(initialClovers: 1000, placesActive: true);

            var result = pet.UnlockPlace("farm");
            Assert.Equal(WorldResult.Locked, result);
            Assert.Equal(1000, pet.State.Clovers);
        }

        [Fact]
        public void UnlockFarm_AfterGarden_GrantsPlotsAndStarterSeeds()
        {
            var pet = CreatePet(initialClovers: 1500, placesActive: true);

            var gardenRes = pet.UnlockPlace("garden");
            Assert.Equal(WorldResult.Ok, gardenRes);

            var farmRes = pet.UnlockPlace("farm");
            Assert.Equal(WorldResult.Ok, farmRes);

            var world = pet.EnsureWorld();
            Assert.Equal(4, world.Farm.PlotsOwned);
            Assert.NotNull(world.Farm.Plots);
            Assert.Equal(4, world.Farm.Plots.Count);

            Assert.Equal(2, pet.GetItemCount("seed_dandelion"));
            Assert.Equal(2, pet.GetItemCount("seed_cilantro"));
            Assert.Equal(2, pet.GetItemCount("seed_parsley"));
        }

        [Fact]
        public void UpgradeSalon_TwiceCosts530And1200_ThenRefusesMaxLevel()
        {
            var pet = CreatePet(initialClovers: 530 + 1200, placesActive: true);

            int lastUpgradedLevel = 0;
            string lastUpgradedId = null;
            pet.PlaceUpgraded += (s, e) =>
            {
                lastUpgradedId = e.Id;
                lastUpgradedLevel = e.Level;
            };

            var first = pet.UpgradePlace("salon");
            Assert.Equal(WorldResult.Ok, first);
            Assert.Equal("salon", lastUpgradedId);
            Assert.Equal(2, lastUpgradedLevel);
            Assert.Equal(1200, pet.State.Clovers);

            var second = pet.UpgradePlace("salon");
            Assert.Equal(WorldResult.Ok, second);
            Assert.Equal("salon", lastUpgradedId);
            Assert.Equal(3, lastUpgradedLevel);
            Assert.Equal(0, pet.State.Clovers);

            var third = pet.UpgradePlace("salon");
            Assert.Equal(WorldResult.MaxLevel, third);
            Assert.Equal(0, pet.State.Clovers);
        }

        [Fact]
        public void PlacesActiveOff_ReturnsDisabled_AndChangesNothing()
        {
            var pet = CreatePet(initialClovers: 1000, placesActive: false);

            Assert.Equal(WorldResult.Disabled, pet.UnlockPlace("garden"));
            Assert.Equal(WorldResult.Disabled, pet.UnlockRoom("bedroom"));
            Assert.Equal(WorldResult.Disabled, pet.UpgradePlace("salon"));

            Assert.Equal(1000, pet.State.Clovers);
            Assert.False(pet.State.Stats.Counters.ContainsKey("places_unlocked"));
        }
    }
}
