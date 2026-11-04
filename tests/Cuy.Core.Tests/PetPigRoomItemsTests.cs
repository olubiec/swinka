using System;
using Cuy.Core.Pigs;
using Cuy.Core.Time;
using Cuy.Core.World;
using Xunit;

namespace Cuy.Core.Tests
{
    public class PetPigRoomItemsTests
    {
        private static Pet CreatePet(bool active = true, int clovers = 1000)
        {
            var clock = new ManualClock(new DateTime(2026, 1, 1, 12, 0, 0, DateTimeKind.Utc));
            var state = GameState.CreateNew("test", clock.UtcNow);
            state.Roster.Clear();
            state.Roster.Add(new PigProfile { Id = "a", Name = "A" });
            state.Roster.Add(new PigProfile { Id = "b", Name = "B" });
            state.Clovers = clovers;
            var balance = Balance.CreateDefault();
            balance.PigRoomsActive = active;
            var pet = new Pet(state, clock, balance);
            pet.PigRooms = PigRoomConfig.CreateDefault();
            pet.HomeEconomy = HomeEconomyConfig.CreateDefault();
            pet.WorldItemCatalog = new WorldItemCatalog(new[]
            {
                new WorldItemDefinition("sofa", "Sofa", new string[0], 1, 1, price: 320, comfort: 5, layer: "floor", icon: "sofa", recolor: true),
                new WorldItemDefinition("rug", "Rug", new string[0], 1, 1, price: 0, comfort: 1, layer: "floor", icon: "rug", free: true, recolor: true),
                new WorldItemDefinition("lamp", "Lamp", new string[0], 1, 1, price: 40, comfort: 1, layer: "floor", icon: "lamp"),
                new WorldItemDefinition("pot", "Pot", new string[0], 1, 1, price: 10, comfort: 1, layer: "floor", icon: "pot", repeatable: true)
            });
            pet.EnsurePigRooms();
            return pet;
        }

        private static string AddItem(Pet pet, string roomId, string itemId, int x, int y)
        {
            var room = pet.EnsureWorld().Rooms[roomId];
            string uid = "u_" + itemId + x + y;
            room.Items.Add(new PlacedItem { Uid = uid, ItemId = itemId, X = x, Y = y });
            return uid;
        }

        [Fact]
        public void Variants_ZeroAlwaysAllowed_OthersNeedUnlock()
        {
            var pet = CreatePet();
            string uid = AddItem(pet, "pig:a", "sofa", 0, 3);

            Assert.True(pet.SetVariant("pig:a", uid, 0));
            Assert.False(pet.SetVariant("pig:a", uid, 2));
            Assert.Equal(48, pet.VariantPrice("sofa"));

            Assert.Equal(WorldResult.Ok, pet.UnlockVariant("sofa", 2));
            Assert.Equal(952, pet.State.Clovers);
            Assert.True(pet.SetVariant("pig:a", uid, 2));
            Assert.Equal(2, pet.EnsureWorld().Rooms["pig:a"].Items[0].Variant);

            Assert.Equal(WorldResult.Ok, pet.UnlockVariant("sofa", 2));
            Assert.Equal(952, pet.State.Clovers);
        }

        [Fact]
        public void Variants_FreeItemCostsNothing_NoRecolorOrBadRangeRefused()
        {
            var pet = CreatePet();
            string uid = AddItem(pet, "pig:a", "lamp", 0, 3);

            Assert.Equal(0, pet.VariantPrice("rug"));
            Assert.Equal(WorldResult.Ok, pet.UnlockVariant("rug", 1));
            Assert.Equal(1000, pet.State.Clovers);
            Assert.Equal(WorldResult.Unknown, pet.UnlockVariant("lamp", 1));
            Assert.Equal(WorldResult.Unknown, pet.UnlockVariant("rug", 0));
            Assert.Equal(WorldResult.Unknown, pet.UnlockVariant("rug", pet.PigRooms.VariantCount));
            Assert.False(pet.SetVariant("pig:a", uid, 1));
            Assert.False(pet.SetVariant("pig:a", uid, -1));
            Assert.False(pet.SetVariant("pig:a", uid, pet.PigRooms.VariantCount));
            Assert.False(pet.SetVariant("pig:a", "nope", 0));
        }

        [Fact]
        public void UnlockVariant_NotEnoughClovers_Refused()
        {
            var pet = CreatePet(clovers: 47);

            Assert.Equal(WorldResult.NotEnoughClovers, pet.UnlockVariant("sofa", 1));
            Assert.Equal(47, pet.State.Clovers);
            Assert.Empty(pet.EnsureWorld().UnlockedVariants);
        }

        [Fact]
        public void RenameRoom_TrimsCapsResetsAndRejectsControlCharacters()
        {
            var pet = CreatePet();
            var room = pet.EnsureWorld().Rooms["pig:a"];

            Assert.True(pet.RenameRoom("pig:a", "  Sunny  "));
            Assert.Equal("Sunny", room.Name);

            Assert.True(pet.RenameRoom("pig:a", new string('x', 40)));
            Assert.Equal(24, room.Name!.Length);

            Assert.False(pet.RenameRoom("pig:a", "bad\nname"));
            Assert.Equal(24, room.Name.Length);

            Assert.True(pet.RenameRoom("pig:a", "   "));
            Assert.Null(room.Name);
            Assert.False(pet.RenameRoom("pig:zzz", "x"));
        }

        [Fact]
        public void Storage_CountsFreeItems_AfterPlacingAndRemoving()
        {
            var pet = CreatePet();
            var world = pet.EnsureWorld();
            world.OwnedItems["sofa"] = 2;
            world.OwnedItems["pot"] = 5;

            Assert.Equal(("sofa", 2), Assert.Single(pet.StorageList()));

            string uid = AddItem(pet, "pig:a", "sofa", 0, 3);
            Assert.Equal(("sofa", 1), Assert.Single(pet.StorageList()));

            Assert.True(RoomLayoutOps.Remove(world.Rooms["pig:a"], uid));
            Assert.Equal(("sofa", 2), Assert.Single(pet.StorageList()));
        }

        [Fact]
        public void Transfer_MovesItemWithVariant_AndRefusalChangesNothing()
        {
            var pet = CreatePet();
            var world = pet.EnsureWorld();
            string uid = AddItem(pet, "pig:a", "sofa", 0, 3);
            world.Rooms["pig:a"].Items[0].Variant = 2;
            string blocker = AddItem(pet, "pig:b", "lamp", 1, 3);

            Assert.Equal(PlaceResult.Ok, pet.TransferItem("pig:a", uid, "pig:b", 4, 3));
            Assert.Empty(world.Rooms["pig:a"].Items);
            Assert.Equal(2, world.Rooms["pig:b"].Items.Count);
            Assert.Equal(2, world.Rooms["pig:b"].Items[1].Variant);

            var refused = pet.TransferItem("pig:b", uid, "pig:a", 99, 99);
            Assert.NotEqual(PlaceResult.Ok, refused);
            Assert.Empty(world.Rooms["pig:a"].Items);
            Assert.Equal(2, world.Rooms["pig:b"].Items.Count);

            Assert.Equal(PlaceResult.UnknownItem, pet.TransferItem("pig:a", "nope", "pig:b", 0, 0));
            Assert.Equal(PlaceResult.UnknownItem, pet.TransferItem("pig:b", blocker, "pig:missing", 0, 0));
        }

        [Fact]
        public void Counters_PigRoomItemsAndFurnished_RiseOncePerRoom()
        {
            var pet = CreatePet();
            var world = pet.EnsureWorld();
            for (int i = 0; i < Pet.PigRoomFurnishedItems - 1; i++) AddItem(pet, "pig:b", "pot", i, 3);
            string uid = AddItem(pet, "pig:a", "sofa", 0, 3);

            Assert.Equal(PlaceResult.Ok, pet.TransferItem("pig:a", uid, "pig:b", 7, 3));

            Assert.Equal(1, pet.State.Stats.Counters["pig_room_items"]);
            Assert.Equal(1, pet.State.Stats.Counters["pig_rooms_furnished"]);

            Assert.Equal(PlaceResult.Ok, pet.TransferItem("pig:b", uid, "pig:a", 0, 3));
            Assert.Equal(PlaceResult.Ok, pet.TransferItem("pig:a", uid, "pig:b", 7, 3));
            Assert.Equal(1, pet.State.Stats.Counters["pig_rooms_furnished"]);
        }

        [Fact]
        public void FlagOff_DoesNothing()
        {
            var pet = CreatePet(active: false);
            var world = pet.EnsureWorld();
            world.Rooms["pig:a"] = new RoomLayout();
            world.OwnedItems["sofa"] = 1;
            string uid = AddItem(pet, "pig:a", "sofa", 0, 3);

            Assert.False(pet.SetVariant("pig:a", uid, 0));
            Assert.Equal(WorldResult.Disabled, pet.UnlockVariant("sofa", 1));
            Assert.False(pet.RenameRoom("pig:a", "x"));
            Assert.Empty(pet.StorageList());
            Assert.Equal(PlaceResult.NotAllowedHere, pet.TransferItem("pig:a", uid, "pig:b", 0, 0));
            Assert.Equal(1000, pet.State.Clovers);
        }
    }
}
