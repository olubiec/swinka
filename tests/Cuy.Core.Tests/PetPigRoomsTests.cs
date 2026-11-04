using System;
using System.Linq;
using Cuy.Core.Pigs;
using Cuy.Core.Time;
using Cuy.Core.World;
using Xunit;

namespace Cuy.Core.Tests
{
    public class PetPigRoomsTests
    {
        private static Pet CreatePet(bool active = true)
        {
            var clock = new ManualClock(new DateTime(2026, 1, 1, 12, 0, 0, DateTimeKind.Utc));
            var state = GameState.CreateNew("test", clock.UtcNow);
            state.Roster.Clear();
            var balance = Balance.CreateDefault();
            balance.PigRoomsActive = active;
            var pet = new Pet(state, clock, balance);
            pet.PigRooms = PigRoomConfig.CreateDefault();
            pet.WorldItemCatalog = new WorldItemCatalog(new WorldItemDefinition[0]);
            return pet;
        }

        private static PigProfile Pig(string id, string name, bool memorial = false)
        {
            return new PigProfile { Id = id, Name = name, Memorial = memorial };
        }

        [Fact]
        public void Adopting_CreatesRoomOnce()
        {
            var pet = CreatePet();
            pet.AttachPigRooms();
            pet.AttachPigRooms();
            pet.State.Roster.Add(Pig("p1", "Mimi"));
            pet.EnsurePigRooms();

            var rng = new Random(1);
            Assert.Equal(AdoptResult.Ok, pet.AdoptGroup("starter", rng, pet.Clock.UtcNow));

            var world = pet.EnsureWorld();
            Assert.True(world.Rooms.ContainsKey(pet.RoomIdOf("kuki")));
            Assert.True(world.Rooms.ContainsKey(pet.RoomIdOf("ned")));
            Assert.Equal(3, world.Rooms.Count);
            Assert.Equal("pig:kuki", pet.RoomIdOf("kuki"));
        }

        [Fact]
        public void Adopting_InMemorialMode_AlsoCreatesRoom()
        {
            var pet = CreatePet();
            pet.AttachPigRooms();
            pet.NamedPigs = NamedPigCatalog.Current;

            Assert.Equal(AdoptResult.Ok, pet.AdoptNamed("kuki", true, new Random(1), pet.Clock.UtcNow));

            Assert.True(pet.EnsureWorld().Rooms.ContainsKey("pig:kuki"));
        }

        [Fact]
        public void EnsurePigRooms_CreatesRoomForEachPigOfRoster()
        {
            var pet = CreatePet();
            pet.State.Roster.Add(Pig("a", "A"));
            pet.State.Roster.Add(Pig("b", "B"));
            pet.State.Roster.Add(Pig("c", "C", memorial: true));

            pet.EnsurePigRooms();

            var world = pet.EnsureWorld();
            Assert.Equal(3, world.Rooms.Count);
            Assert.All(new[] { "a", "b", "c" }, id => Assert.True(world.Rooms.ContainsKey("pig:" + id)));
            Assert.Null(world.Rooms["pig:a"].Name);
        }

        [Fact]
        public void FlagOff_CreatesNothing()
        {
            var pet = CreatePet(active: false);
            pet.AttachPigRooms();
            pet.State.Roster.Add(Pig("a", "A"));

            pet.EnsurePigRooms();
            pet.AdoptGroup("starter", new Random(1), pet.Clock.UtcNow);

            Assert.Empty(pet.EnsureWorld().Rooms);
            Assert.Empty(pet.EnsureWorld().PigRoomsEnsured);
        }

        [Fact]
        public void CallingTwice_ChangesNothing()
        {
            var pet = CreatePet();
            pet.State.Roster.Add(Pig("a", "A"));
            pet.EnsurePigRooms();
            var world = pet.EnsureWorld();
            world.Rooms["pig:a"].Name = "Mine";
            world.Rooms["pig:a"].Wallpaper = "custom";

            pet.EnsurePigRooms();

            Assert.Single(world.Rooms);
            Assert.Equal("Mine", world.Rooms["pig:a"].Name);
            Assert.Equal("custom", world.Rooms["pig:a"].Wallpaper);
        }

        [Fact]
        public void Furnished_CounterRisesOncePerRoom()
        {
            var pet = CreatePet();
            pet.State.Roster.Add(Pig("a", "A"));
            pet.EnsurePigRooms();
            var room = pet.EnsureWorld().Rooms["pig:a"];
            for (int i = 0; i < Pet.PigRoomFurnishedItems; i++)
            {
                room.Items.Add(new PlacedItem { Uid = "u" + i, ItemId = "x" });
            }

            pet.EnsurePigRooms();
            pet.EnsurePigRooms();

            Assert.Equal(1, pet.State.Stats.Counters["pig_rooms_furnished"]);
        }
    }
}
