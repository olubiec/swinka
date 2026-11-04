using System;
using System.Collections.Generic;
using System.IO;
using Cuy.Core.Time;
using Cuy.Core.World;
using Xunit;

namespace Cuy.Core.Tests
{
    public class PetWalkTests
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

        private Pet CreatePet(int initialClovers = 1000, bool placesActive = true)
        {
            var state = new GameState();
            state.Clovers = initialClovers;
            state.Needs.Mood = 50;

            var clock = new ManualClock(new DateTime(2026, 6, 1, 10, 0, 0, DateTimeKind.Utc));
            var balance = Balance.CreateDefault();
            balance.PlacesActive = placesActive;
            var pet = new Pet(state, clock, balance);

            string placesPath = RepoFile("assets/data/places.json");
            if (File.Exists(placesPath))
            {
                pet.PlaceCatalog = PlaceCatalog.LoadFromFile(placesPath);
            }

            string itemsPath = RepoFile("assets/data/items.json");
            if (File.Exists(itemsPath))
            {
                pet.ItemCatalog = ItemCatalog.LoadFromFile(itemsPath);
            }

            pet.WorldItemCatalog = new WorldItemCatalog(new[]
            {
                new WorldItemDefinition("bench", "Bench", new[] { "garden" }, 1, 1, price: 10, comfort: 9, layer: "floor", icon: "bench", repeatable: false),
                new WorldItemDefinition("flower", "Flower", new[] { "garden" }, 1, 1, price: 5, comfort: 1, layer: "floor", icon: "flower", repeatable: false),
                new WorldItemDefinition("gazebo", "Gazebo", new[] { "garden" }, 2, 2, price: 50, comfort: 10, layer: "floor", icon: "gazebo", repeatable: false)
            });

            pet.EnsureWorld();
            return pet;
        }

        [Fact]
        public void ThreeWalksThenTooManyToday_AndNewDayResets()
        {
            var pet = CreatePet();
            var clock = (ManualClock)pet.Clock;

            // Unlock garden and give it comfort >= 10
            PlaceUnlock.Unlock(pet.State.World, pet.PlaceCatalog, "garden");
            pet.State.World.Rooms["garden"] = new RoomLayout
            {
                Items = new List<PlacedItem>
                {
                    new PlacedItem { ItemId = "gazebo", X = 0, Y = 0 }
                }
            };

            Assert.Equal(3, pet.WalksLeftToday());

            // 1st walk
            Assert.Equal(WalkResult.Ok, pet.Walk("garden"));
            Assert.Equal(2, pet.WalksLeftToday());

            // 2nd walk
            Assert.Equal(WalkResult.Ok, pet.Walk("garden"));
            Assert.Equal(1, pet.WalksLeftToday());

            // 3rd walk
            Assert.Equal(WalkResult.Ok, pet.Walk("garden"));
            Assert.Equal(0, pet.WalksLeftToday());

            // 4th walk is refused
            Assert.Equal(WalkResult.TooManyToday, pet.Walk("garden"));

            // Advance to next local day
            clock.Advance(TimeSpan.FromHours(25));
            Assert.Equal(3, pet.WalksLeftToday());
            Assert.Equal(WalkResult.Ok, pet.Walk("garden"));
        }

        [Fact]
        public void LockedGardenRefuses()
        {
            var pet = CreatePet();
            // Garden is locked by default
            Assert.False(PlaceUnlock.IsUnlocked(pet.State.World, pet.PlaceCatalog, "garden"));

            var result = pet.Walk("garden");
            Assert.Equal(WalkResult.PlaceLocked, result);
        }

        [Fact]
        public void Comfort9Refuses_And10Allows()
        {
            var pet = CreatePet();
            PlaceUnlock.Unlock(pet.State.World, pet.PlaceCatalog, "garden");

            // Setup garden room with comfort 9 (bench comfort 9)
            pet.State.World.Rooms["garden"] = new RoomLayout
            {
                Items = new List<PlacedItem>
                {
                    new PlacedItem { ItemId = "bench", X = 0, Y = 0 }
                }
            };

            Assert.Equal(9, pet.ComfortScore("garden"));
            Assert.Equal(WalkResult.NeedsComfort, pet.Walk("garden"));

            // Add flower with comfort 1 => total comfort 10
            pet.State.World.Rooms["garden"].Items.Add(new PlacedItem { ItemId = "flower", X = 1, Y = 0 });
            Assert.Equal(10, pet.ComfortScore("garden"));

            Assert.Equal(WalkResult.Ok, pet.Walk("garden"));
        }

        [Fact]
        public void MoodRisesBy6_CappedAt100()
        {
            var pet = CreatePet();
            PlaceUnlock.Unlock(pet.State.World, pet.PlaceCatalog, "garden");
            pet.State.World.Rooms["garden"] = new RoomLayout
            {
                Items = new List<PlacedItem>
                {
                    new PlacedItem { ItemId = "gazebo", X = 0, Y = 0 }
                }
            };

            pet.State.Needs.Mood = 50;
            Assert.Equal(WalkResult.Ok, pet.Walk("garden"));
            Assert.Equal(56, pet.State.Needs.Mood);

            // Test cap at 100
            var clock = (ManualClock)pet.Clock;
            clock.Advance(TimeSpan.FromHours(25));
            pet.State.Needs.Mood = 98;
            Assert.Equal(WalkResult.Ok, pet.Walk("garden"));
            Assert.Equal(100, pet.State.Needs.Mood);
        }

        [Fact]
        public void VariedDiet_ThreeVegetablesGive5MoodOnce_FourthDoesNothing_TreatDoesNotCount()
        {
            var pet = CreatePet();
            pet.State.Needs.Mood = 50;

            // Treat does not count (carrot and cake are category: "treat")
            pet.OnFed("carrot");
            Assert.Equal(50, pet.State.Needs.Mood);

            // 1st vegetable
            pet.OnFed("bell_pepper");
            Assert.Equal(50, pet.State.Needs.Mood);

            // Repeat 1st vegetable does not increment distinct count
            pet.OnFed("bell_pepper");
            Assert.Equal(50, pet.State.Needs.Mood);

            // 2nd vegetable
            pet.OnFed("cucumber");
            Assert.Equal(50, pet.State.Needs.Mood);

            // 3rd distinct vegetable grants +5 mood once
            pet.OnFed("parsley");
            Assert.Equal(55, pet.State.Needs.Mood);

            // 4th distinct vegetable does nothing
            pet.OnFed("kale");
            Assert.Equal(55, pet.State.Needs.Mood);
        }

        [Fact]
        public void DisabledWhenPlacesInactive()
        {
            var pet = CreatePet(placesActive: false);
            Assert.Equal(0, pet.WalksLeftToday());
            Assert.Equal(WalkResult.Disabled, pet.Walk("garden"));
        }
    }
}
