using System;
using System.IO;
using Cuy.Core.Pigs;
using Cuy.Core.Time;
using Cuy.Core.World;
using Xunit;

namespace Cuy.Core.Tests
{
    public class PetPigComfortTests
    {
        private static string RepoFile(string relativePath)
        {
            string? dir = AppContext.BaseDirectory;
            while (dir != null && !File.Exists(Path.Combine(dir, "Cuy.sln")))
            {
                dir = Path.GetDirectoryName(dir);
            }
            return Path.Combine(dir ?? "", relativePath);
        }

        private static Pet CreatePet(bool pigRooms)
        {
            var clock = new ManualClock(new DateTime(2026, 1, 1, 12, 0, 0, DateTimeKind.Utc));
            var state = GameState.CreateNew("test", clock.UtcNow);
            state.Roster.Clear();
            state.Roster.Add(new PigProfile { Id = "a", Name = "A" });
            state.Roster.Add(new PigProfile { Id = "b", Name = "B" });
            state.Roster.Add(new PigProfile { Id = "m", Name = "M", Memorial = true });
            state.ActivePigIds.Clear();
            var balance = Balance.CreateDefault();
            balance.WorldDecorActive = true;
            balance.PigRoomsActive = pigRooms;
            var pet = new Pet(state, clock, balance);
            pet.PigRooms = PigRoomConfig.CreateDefault();
            pet.PlaceCatalog = PlaceCatalog.LoadFromFile(RepoFile("assets/data/places.json"));
            pet.WorldItemCatalog = new WorldItemCatalog(new[]
            {
                new WorldItemDefinition("sofa", "Sofa", new string[0], 1, 1, price: 320, comfort: 1000, layer: "floor", icon: "sofa")
            });
            return pet;
        }

        private static void Furnish(Pet pet, string roomId)
        {
            var world = pet.EnsureWorld();
            if (!world.Rooms.TryGetValue(roomId, out var room))
            {
                room = new RoomLayout();
                world.Rooms[roomId] = room;
            }
            room.Items.Add(new PlacedItem { Uid = Guid.NewGuid().ToString("N"), ItemId = "sofa" });
        }

        private static double OldFactor(Pet pet)
        {
            int capped = Comfort.Capped(pet.ComfortScore(), pet.PlaceCatalog);
            return Comfort.MoodDecayFactor(capped, pet.PlaceCatalog);
        }

        [Fact]
        public void FlagOff_EqualsWorldWideFactor()
        {
            var pet = CreatePet(pigRooms: false);
            pet.State.ActivePigIds.Add("a");
            Furnish(pet, "pig:a");

            Assert.Equal(OldFactor(pet), pet.MoodDecayComfortFactor(), 9);
        }

        [Fact]
        public void TwoActivePigs_AverageTheirRoomFactors()
        {
            var pet = CreatePet(pigRooms: true);
            pet.State.ActivePigIds.Add("a");
            pet.State.ActivePigIds.Add("b");
            Furnish(pet, "pig:a");
            double full = 1.0 - pet.PlaceCatalog.MoodDecayReductionAtCap;

            Assert.Equal((full + 1.0) / 2, pet.MoodDecayComfortFactor(), 9);
        }

        [Fact]
        public void MemorialPig_IsIgnored()
        {
            var pet = CreatePet(pigRooms: true);
            pet.State.ActivePigIds.Add("m");
            pet.State.ActivePigIds.Add("b");
            Furnish(pet, "pig:m");

            Assert.Equal(1.0, pet.MoodDecayComfortFactor(), 9);
        }

        [Fact]
        public void NoActiveNamedPigs_UsesWorldWideFactor()
        {
            var pet = CreatePet(pigRooms: true);
            Furnish(pet, "salon");

            Assert.Equal(OldFactor(pet), pet.MoodDecayComfortFactor(), 9);
            Assert.True(pet.MoodDecayComfortFactor() < 1.0);
        }

        [Fact]
        public void TenHoursOfMoodDecay_DifferByTheFactor()
        {
            var pet = CreatePet(pigRooms: true);
            pet.State.ActivePigIds.Add("a");
            Furnish(pet, "pig:a");
            double perHour = pet.Balance.GetDecay(Need.Mood);
            double withRoom = perHour * 10 * pet.MoodDecayComfortFactor();
            double without = perHour * 10;

            Assert.Equal(perHour * 10 * (1.0 - pet.PlaceCatalog.MoodDecayReductionAtCap), withRoom, 9);
            Assert.True(withRoom < without);
        }
    }
}
