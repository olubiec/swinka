using System;
using Cuy.Core.Pigs;
using Cuy.Core.Time;
using Cuy.Core.World;
using Xunit;

namespace Cuy.Core.Tests
{
    public class PetMemoryRoomTests
    {
        private static Pet CreatePet()
        {
            var clock = new ManualClock(new DateTime(2026, 1, 1, 12, 0, 0, DateTimeKind.Utc));
            var state = GameState.CreateNew("test", clock.UtcNow);
            state.Roster.Clear();
            state.Roster.Add(new PigProfile { Id = "p1", Name = "Kuki", NamedId = "kuki" });
            var balance = Balance.CreateDefault();
            balance.PigRoomsActive = true;
            var pet = new Pet(state, clock, balance);
            pet.PigRooms = PigRoomConfig.CreateDefault();
            pet.EnsurePigRooms();
            return pet;
        }

        [Fact]
        public void Names_NormalAndMemorial()
        {
            var pet = CreatePet();
            Assert.Equal("Kuki's room", pet.RoomDisplayName("kuki"));
            Assert.False(pet.IsMemoryRoom("pig:kuki"));

            Assert.True(pet.SetMemorial("kuki", true));
            pet.OnMemorialChanged("kuki", true);

            Assert.Equal("Kuki's memory room", pet.RoomDisplayName("p1"));
            Assert.True(pet.IsMemoryRoom("pig:kuki"));

            Assert.True(pet.SetMemorial("kuki", false));
            pet.OnMemorialChanged("kuki", false);
            Assert.Equal("Kuki's room", pet.RoomDisplayName("kuki"));
            Assert.False(pet.IsMemoryRoom("pig:kuki"));
        }

        [Fact]
        public void CustomName_WinsOverTemplate()
        {
            var pet = CreatePet();
            pet.EnsureWorld().Rooms["pig:kuki"].Name = "Sunny spot";
            pet.SetMemorial("kuki", true);

            Assert.Equal("Sunny spot", pet.RoomDisplayName("kuki"));
        }

        [Fact]
        public void RoomAndItems_SurviveBothDirections()
        {
            var pet = CreatePet();
            var room = pet.EnsureWorld().Rooms["pig:kuki"];
            room.Items.Add(new PlacedItem { Uid = "u1", ItemId = "cushion", X = 1, Y = 2 });

            pet.SetMemorial("kuki", true);
            pet.OnMemorialChanged("kuki", true);
            Assert.Same(room, pet.EnsureWorld().Rooms["pig:kuki"]);
            Assert.Single(room.Items);

            pet.SetMemorial("kuki", false);
            pet.OnMemorialChanged("kuki", false);
            Assert.Same(room, pet.EnsureWorld().Rooms["pig:kuki"]);
            Assert.Single(room.Items);
        }

        [Fact]
        public void Names_ContainNoNegativeWords_AndUnknownPigIsEmpty()
        {
            var pet = CreatePet();
            pet.SetMemorial("kuki", true);
            string text = pet.RoomDisplayName("kuki").ToLowerInvariant();

            Assert.DoesNotContain("dead", text);
            Assert.DoesNotContain("died", text);
            Assert.DoesNotContain("death", text);
            Assert.Equal(string.Empty, pet.RoomDisplayName("nobody"));
            Assert.False(pet.IsMemoryRoom("pig:nobody"));
            Assert.False(pet.IsMemoryRoom("salon"));
        }
    }
}
