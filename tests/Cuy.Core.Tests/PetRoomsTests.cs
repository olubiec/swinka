using System;
using System.Collections.Generic;
using System.IO;
using System.Linq;
using Cuy.Core.Pigs;
using Cuy.Core.Time;
using Cuy.Core.World;
using Xunit;

namespace Cuy.Core.Tests
{
    public class PetRoomsTests
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

        private Pet CreatePet(int initialClovers = 1000, bool decorActive = true)
        {
            var state = new GameState();
            state.Clovers = initialClovers;
            var clock = new ManualClock(new DateTime(2026, 1, 1, 12, 0, 0, DateTimeKind.Utc));
            var balance = Balance.CreateDefault();
            balance.WorldDecorActive = decorActive;
            balance.PlacesActive = true;
            var pet = new Pet(state, clock, balance);

            string placesPath = RepoFile("assets/data/places.json");
            if (File.Exists(placesPath))
            {
                pet.PlaceCatalog = PlaceCatalog.LoadFromFile(placesPath);
            }

            var items = new[]
            {
                new WorldItemDefinition("cushion", "Cushion", new[] { "salon" }, 1, 1, price: 20, comfort: 5, layer: "floor", icon: "cushion", repeatable: false),
                new WorldItemDefinition("fence_wood", "Wooden fence", new[] { "salon" }, 1, 1, price: 15, comfort: 0, layer: "floor", icon: "fence_wood", repeatable: true),
                new WorldItemDefinition("memory_corner", "Memory corner", new[] { "salon" }, 2, 2, price: 0, comfort: 0, layer: "floor", icon: "memory_corner", free: true, requires: "memorial_pig", repeatable: false),
                new WorldItemDefinition("sofa", "Comfortable sofa", new[] { "salon" }, 2, 1, price: 50, comfort: 100, layer: "floor", icon: "sofa", repeatable: false)
            };
            pet.WorldItemCatalog = new WorldItemCatalog(items);

            return pet;
        }

        [Fact]
        public void BuyTwice_1PerItem_AndPlaceBoth()
        {
            var pet = CreatePet(initialClovers: 100);

            Assert.Equal(BuyResult.Ok, pet.BuyItem("cushion"));
            Assert.Equal(BuyResult.Ok, pet.BuyItem("cushion"));
            Assert.Equal(60, pet.State.Clovers);

            Assert.Equal(PlaceResult.Ok, pet.PlaceItem("salon", "cushion", 0, 2, false));
            Assert.Equal(PlaceResult.Ok, pet.PlaceItem("salon", "cushion", 1, 2, false));

            // Placing a third time is refused because owned - placed == 0
            Assert.Equal(PlaceResult.NotAllowedHere, pet.PlaceItem("salon", "cushion", 2, 2, false));
        }

        [Fact]
        public void PlacingWithoutOwning_IsRefused()
        {
            var pet = CreatePet(initialClovers: 100);

            var result = pet.PlaceItem("salon", "cushion", 0, 2, false);
            Assert.Equal(PlaceResult.NotAllowedHere, result);
        }

        [Fact]
        public void RepeatableFence_CanBePlaced10Times_AfterOnePurchase()
        {
            var pet = CreatePet(initialClovers: 100);

            Assert.Equal(BuyResult.Ok, pet.BuyItem("fence_wood"));
            Assert.Equal(85, pet.State.Clovers);

            int placed = 0;
            for (int x = 0; x < 6; x++)
            {
                Assert.Equal(PlaceResult.Ok, pet.PlaceItem("salon", "fence_wood", x, 2, false));
                placed++;
            }
            for (int x = 0; x < 4; x++)
            {
                Assert.Equal(PlaceResult.Ok, pet.PlaceItem("salon", "fence_wood", x, 3, false));
                placed++;
            }

            Assert.Equal(10, placed);
            Assert.Equal(10, pet.State.Stats.Counters["items_placed"]);
        }

        [Fact]
        public void MemoryCorner_RefusedWithoutMemorialPig_AndFreeWithOne()
        {
            var pet = CreatePet(initialClovers: 100);

            Assert.Equal(BuyResult.Locked, pet.BuyItem("memory_corner"));
            Assert.Equal(100, pet.State.Clovers);

            pet.State.Roster.Add(new PigProfile { Id = "angel", Memorial = true });

            Assert.Equal(BuyResult.Ok, pet.BuyItem("memory_corner"));
            Assert.Equal(100, pet.State.Clovers); // Free of charge
        }

        [Fact]
        public void ItemsPlaced_CounterIncrementsOnSuccess()
        {
            var pet = CreatePet(initialClovers: 100);

            pet.BuyItem("fence_wood");
            Assert.Equal(PlaceResult.Ok, pet.PlaceItem("salon", "fence_wood", 0, 2, false));
            Assert.Equal(PlaceResult.Ok, pet.PlaceItem("salon", "fence_wood", 1, 2, true));

            Assert.Equal(2, pet.State.Stats.Counters["items_placed"]);
        }

        [Fact]
        public void Removing_ReturnsItemToFreePool()
        {
            var pet = CreatePet(initialClovers: 100);

            pet.BuyItem("cushion");
            Assert.Equal(PlaceResult.Ok, pet.PlaceItem("salon", "cushion", 0, 2, false));

            // Cannot place another cushion
            Assert.Equal(PlaceResult.NotAllowedHere, pet.PlaceItem("salon", "cushion", 1, 2, false));

            var uid = pet.EnsureWorld().Rooms["salon"].Items[0].Uid;
            Assert.True(pet.RemoveItem("salon", uid));

            // Now placing cushion again succeeds
            Assert.Equal(PlaceResult.Ok, pet.PlaceItem("salon", "cushion", 1, 2, false));
        }

        [Fact]
        public void MoodDecay_Is15PercentSlower_AtComfortCap_AndUnchangedWithFlagOff()
        {
            // Case 1: Flag off
            var petOff = CreatePet(initialClovers: 100, decorActive: false);
            petOff.Balance.MaxOnlineGap = TimeSpan.FromHours(2);
            petOff.State.LastActiveUtc = petOff.Clock.UtcNow;
            petOff.Start();
            petOff.BuyItem("sofa");
            petOff.PlaceItem("salon", "sofa", 0, 2, false);
            petOff.State.Needs.Mood = 100.0;

            var clockOff = (ManualClock)petOff.Clock;
            for (int i = 0; i < 10; i++)
            {
                clockOff.Advance(TimeSpan.FromHours(1));
                petOff.Update();
            }
            double decayOff = 100.0 - petOff.State.Needs.Mood;
            Assert.Equal(50.0, decayOff, precision: 2);

            // Case 2: Flag on
            var petOn = CreatePet(initialClovers: 100, decorActive: true);
            petOn.Balance.MaxOnlineGap = TimeSpan.FromHours(2);
            petOn.State.LastActiveUtc = petOn.Clock.UtcNow;
            petOn.Start();
            petOn.BuyItem("sofa");
            petOn.PlaceItem("salon", "sofa", 0, 2, false);
            Assert.True(petOn.ComfortScore() >= 100);

            petOn.State.Needs.Mood = 100.0;

            var clockOn = (ManualClock)petOn.Clock;
            for (int i = 0; i < 10; i++)
            {
                clockOn.Advance(TimeSpan.FromHours(1));
                petOn.Update();
            }
            double decayOn = 100.0 - petOn.State.Needs.Mood;
            Assert.Equal(decayOff * 0.85, decayOn, precision: 2);
        }

        [Fact]
        public void PlaceItem_InPigRoom_AllowsHouseItemLikeGramophone()
        {
            var pet = CreatePet(initialClovers: 1000, decorActive: true);
            pet.Balance.PigRoomsActive = true;
            pet.State.Roster.Add(new PigProfile("Gryzli", "peruvian", "pal_01") { Id = "cuy", NamedId = "cuy" });
            pet.EnsurePigRooms();

            var catalogItems = new List<WorldItemDefinition>(pet.WorldItemCatalog.All)
            {
                new WorldItemDefinition("gramophone", "Gramophone", new[] { "house" }, 1, 1, price: 0, comfort: 0, layer: "floor", icon: "gramophone", repeatable: false)
            };
            pet.WorldItemCatalog = new WorldItemCatalog(catalogItems);

            var world = pet.EnsureWorld();
            world.OwnedItems["gramophone"] = 1;

            var result = pet.PlaceItem("pig:cuy", "gramophone", 4, 3, false);
            Assert.Equal(PlaceResult.Ok, result);
        }

        [Fact]
        public void MoveItem_InPigRoom_MovesHouseItem()
        {
            var pet = CreatePet(initialClovers: 1000, decorActive: true);
            pet.Balance.PigRoomsActive = true;
            pet.State.Roster.Add(new PigProfile("Gryzli", "peruvian", "pal_01") { Id = "cuy", NamedId = "cuy" });
            pet.EnsurePigRooms();

            var catalogItems = new List<WorldItemDefinition>(pet.WorldItemCatalog.All)
            {
                new WorldItemDefinition("gramophone", "Gramophone", new[] { "house" }, 1, 1, price: 0, comfort: 0, layer: "floor", icon: "gramophone", repeatable: false)
            };
            pet.WorldItemCatalog = new WorldItemCatalog(catalogItems);

            var world = pet.EnsureWorld();
            world.OwnedItems["gramophone"] = 1;

            var placeRes = pet.PlaceItem("pig:cuy", "gramophone", 4, 3, false);
            Assert.Equal(PlaceResult.Ok, placeRes);

            var uid = world.Rooms["pig:cuy"].Items.First(i => i.ItemId == "gramophone").Uid;
            var moveRes = pet.MoveItem("pig:cuy", uid, 5, 3);
            Assert.Equal(PlaceResult.Ok, moveRes);
        }

        [Fact]
        public void GetRoomGridSize_ReturnsPigRoomAndDormDimensions()
        {
            var pet = CreatePet(initialClovers: 1000, decorActive: true);
            pet.Balance.PigRoomsActive = true;
            pet.Balance.PlacesActive = true;
            pet.State.Roster.Add(new PigProfile("Gryzli", "peruvian", "pal_01") { Id = "cuy", NamedId = "cuy" });
            pet.EnsurePigRooms();

            var sizeLevel1 = pet.GetRoomGridSize("pig:cuy");
            Assert.Equal((10, 6), sizeLevel1);

            var upgradeRes = pet.UpgradePlace("pig:cuy");
            Assert.Equal(WorldResult.Ok, upgradeRes);

            var sizeLevel2 = pet.GetRoomGridSize("pig:cuy");
            Assert.Equal((12, 7), sizeLevel2);

            var dormSize = pet.GetRoomGridSize("dorm");
            Assert.Equal((16, 8), dormSize);
        }
    }
}
