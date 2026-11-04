using System;
using Cuy.Core.Pigs;
using Cuy.Core.Time;
using Cuy.Core.World;
using Xunit;

namespace Cuy.Core.Tests
{
    public class PetHomesTests
    {
        private static Pet CreatePet(bool homesActive)
        {
            var clock = new ManualClock(new DateTime(2026, 1, 1, 12, 0, 0, DateTimeKind.Utc));
            var state = new GameState();
            state.Roster.Add(new PigProfile { Id = "kuki", Name = "Kuki" });
            state.Roster.Add(new PigProfile { Id = "ned", Name = "Ned" });
            state.Roster.Add(new PigProfile { Id = "m", Name = "M", Memorial = true });
            state.ActivePigIds.Clear();

            var balance = Balance.CreateDefault();
            balance.HomesActive = homesActive;
            balance.PigRoomsActive = true;

            var pet = new Pet(state, clock, balance);
            pet.PigRooms = PigRoomConfig.CreateDefault();
            pet.HomeEconomy = HomeEconomyConfig.CreateDefault();
            pet.EnsureWorld().RoomsUnlocked.Add("playroom");
            pet.EnsureWorld().RoomsUnlocked.Add("salon");
            return pet;
        }

        [Fact]
        public void DefaultMode_IsFree()
        {
            var pet = CreatePet(homesActive: true);

            var home = pet.EnsureWorld().HomeOf("kuki", pet.HomeEconomy.RoamDefaultMode);

            Assert.Equal(PigHomeState.ModeFree, home.Mode);
        }

        [Fact]
        public void SetTied_ThenLocationIsThatRoom()
        {
            var pet = CreatePet(homesActive: true);

            Assert.True(pet.SetHome("kuki", PigHomeState.ModeRoom, "playroom"));

            Assert.Equal("playroom", pet.LocationOf("kuki").RoomId);
            Assert.Contains(pet.Locations(), l => l.pigId == "kuki" && l.room == "playroom");
        }

        [Fact]
        public void InvalidMode_OrRoom_IsRefused()
        {
            var pet = CreatePet(homesActive: true);

            Assert.False(pet.SetHome("kuki", PigHomeState.ModeRoom, "nowhere"));
            Assert.False(pet.SetHome("kuki", PigHomeState.ModeRoom, null));
            Assert.False(pet.SetHome("kuki", "other", "playroom"));
            Assert.False(pet.SetHome("nobody", PigHomeState.ModeFree, null));
            Assert.Empty(pet.EnsureWorld().PigHomes);
        }

        [Fact]
        public void DormResident_CannotBeTiedToAnotherPigsRoom()
        {
            var pet = CreatePet(homesActive: true);
            var world = pet.EnsureWorld();
            world.RoomShare["kuki"] = SharedRoomOps.DormId;
            world.RoomsUnlocked.Add(SharedRoomOps.DormId);

            Assert.False(pet.SetHome("kuki", PigHomeState.ModeRoom, pet.RoomIdOf("ned")));
            Assert.True(pet.SetHome("kuki", PigHomeState.ModeRoom, SharedRoomOps.DormId));
            Assert.Equal(SharedRoomOps.DormId, pet.LocationOf("kuki").RoomId);
        }

        [Fact]
        public void MemorialPig_IsAlwaysInItsMemoryRoom()
        {
            var pet = CreatePet(homesActive: true);
            string memoryRoom = pet.RoomIdOf("m");

            Assert.Equal(memoryRoom, pet.LocationOf("m").RoomId);

            Assert.True(pet.SetHome("m", PigHomeState.ModeRoom, "playroom"));
            Assert.Equal(memoryRoom, pet.LocationOf("m").RoomId);
        }

        [Fact]
        public void FlagOff_EverybodyIsInOwnRoom()
        {
            var pet = CreatePet(homesActive: false);
            var world = pet.EnsureWorld();
            world.PigHomes["kuki"] = new PigHomeState { Mode = PigHomeState.ModeRoom, Room = "playroom" };

            Assert.False(pet.SetHome("ned", PigHomeState.ModeRoom, "playroom"));
            Assert.Equal(pet.RoomIdOf("kuki"), pet.LocationOf("kuki").RoomId);
            Assert.Equal(pet.RoomIdOf("ned"), pet.LocationOf("ned").RoomId);
            Assert.All(pet.Locations(), l => Assert.Equal(pet.RoomIdOf(l.pigId), l.room));
        }
    }
}
