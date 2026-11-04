using System;
using System.IO;
using System.Linq;
using Cuy.Core.Achievements;
using Cuy.Core.Pigs;
using Cuy.Core.Time;
using Cuy.Core.World;
using Newtonsoft.Json;
using Xunit;

namespace Cuy.Core.Tests
{
    public class PetDormTests
    {
        private static Pet CreatePet(bool pigRooms = true, bool dorm = true)
        {
            var clock = new ManualClock(new DateTime(2026, 1, 1, 12, 0, 0, DateTimeKind.Utc));
            var state = GameState.CreateNew("test", clock.UtcNow);
            state.Roster.Clear();
            var balance = Balance.CreateDefault();
            balance.PigRoomsActive = pigRooms;
            balance.DormActive = dorm;
            var pet = new Pet(state, clock, balance);
            pet.PigRooms = PigRoomConfig.CreateDefault();
            pet.WorldItemCatalog = new WorldItemCatalog(new[]
            {
                new WorldItemDefinition { Id = "lamp", Name = "Lamp", W = 1, H = 1, Layer = "floor", Comfort = 2 }
            }, new[] { "ground", "floor", "wall" });
            return pet;
        }

        private static PigProfile Pig(string id, string name, bool memorial = false)
        {
            return new PigProfile { Id = id, Name = name, Memorial = memorial };
        }

        private static RoomLayout PigRoom(string prefix, int lamps)
        {
            var room = new RoomLayout { Wallpaper = "wall_" + prefix, Floor = "floor_" + prefix, Name = prefix + "'s room" };
            for (int i = 1; i <= lamps; i++)
            {
                room.Items.Add(new PlacedItem { Uid = prefix + i, ItemId = "lamp", X = i, Y = 5 });
            }
            return room;
        }

        private static string RepoFile(string relativePath)
        {
            var dir = new DirectoryInfo(AppContext.BaseDirectory);
            while (dir != null)
            {
                string candidate = Path.Combine(dir.FullName, relativePath);
                if (File.Exists(candidate)) return candidate;
                dir = dir.Parent;
            }
            throw new FileNotFoundException(relativePath);
        }

        private static void AddTwoPigs(Pet pet)
        {
            pet.State.Roster.Add(Pig("a", "A"));
            pet.State.Roster.Add(Pig("b", "B"));
        }

        [Fact]
        public void UnlockDorm_FailsWithOnePig()
        {
            var pet = CreatePet();
            pet.State.Roster.Add(Pig("a", "A"));
            pet.State.Clovers = 5000;

            Assert.Equal(WorldResult.Locked, pet.UnlockDorm());
            Assert.False(pet.EnsureWorld().RoomsUnlocked.Contains(SharedRoomOps.DormId));
            Assert.Equal(5000, pet.State.Clovers);
        }

        [Fact]
        public void UnlockDorm_NeedsExactly1500Clovers()
        {
            var pet = CreatePet();
            AddTwoPigs(pet);
            pet.State.Clovers = 1499;

            Assert.Equal(WorldResult.NotEnoughClovers, pet.UnlockDorm());
            Assert.False(pet.EnsureWorld().RoomsUnlocked.Contains(SharedRoomOps.DormId));

            pet.State.Clovers = 1500;
            Assert.Equal(WorldResult.Ok, pet.UnlockDorm());
            Assert.True(pet.EnsureWorld().RoomsUnlocked.Contains(SharedRoomOps.DormId));
            Assert.Equal(0, pet.State.Clovers);
        }

        [Fact]
        public void UnlockDorm_CounterAndSharedNestAchievementPayOnce()
        {
            var pet = CreatePet();
            pet.AchievementsTable = AchievementCatalog.Load(File.ReadAllText(RepoFile("assets/data/achievements.json")));
            AddTwoPigs(pet);
            pet.State.Clovers = 1500;

            Assert.Equal(WorldResult.Ok, pet.UnlockDorm());
            Assert.Equal(1, pet.State.Stats.Counters["dorm_unlocked"]);
            Assert.Single(pet.CheckAchievements().Where(a => a.Id == "shared_nest"));
            Assert.Empty(pet.CheckAchievements().Where(a => a.Id == "shared_nest"));

            Assert.Equal(WorldResult.Locked, pet.UnlockDorm());
            Assert.Equal(1, pet.State.Stats.Counters["dorm_unlocked"]);
        }

        [Fact]
        public void UpgradeDorm_CostsOneHundredElevenHundredThenEighteenHundredThenMax()
        {
            var pet = CreatePet();
            AddTwoPigs(pet);
            pet.State.Clovers = 5000;
            Assert.Equal(WorldResult.Locked, pet.UpgradeDorm());

            pet.UnlockDorm();
            Assert.Equal(3500, pet.State.Clovers);

            Assert.Equal(WorldResult.Ok, pet.UpgradeDorm());
            Assert.Equal(2400, pet.State.Clovers);
            Assert.Equal(2, pet.EnsureWorld().PlaceLevels[SharedRoomOps.DormId]);

            Assert.Equal(WorldResult.Ok, pet.UpgradeDorm());
            Assert.Equal(600, pet.State.Clovers);

            Assert.Equal(WorldResult.MaxLevel, pet.UpgradeDorm());
            Assert.Equal(600, pet.State.Clovers);
        }

        [Fact]
        public void MoveIn_ThenMoveOut_RestoresPigRoom()
        {
            var pet = CreatePet();
            AddTwoPigs(pet);
            pet.State.Clovers = 1500;
            pet.UnlockDorm();
            var world = pet.EnsureWorld();
            world.Rooms[pet.PigRooms.RoomId("a")] = PigRoom("a", 3);
            world.Rooms[pet.PigRooms.RoomId("b")] = PigRoom("b", 3);
            string before = JsonConvert.SerializeObject(world.Rooms[pet.PigRooms.RoomId("a")]);

            Assert.Equal(MoveResult.Ok, pet.MoveIn(new[] { "a", "b" }));
            Assert.True(world.RoomShare.ContainsKey("a"));
            Assert.True(world.RoomShare.ContainsKey("b"));

            Assert.True(pet.MoveOut("a"));
            Assert.False(world.RoomShare.ContainsKey("a"));
            Assert.False(world.Parked.ContainsKey("a"));
            Assert.Equal(before, JsonConvert.SerializeObject(world.Rooms[pet.PigRooms.RoomId("a")]));
            Assert.False(pet.MoveOut("a"));
        }

        [Fact]
        public void MoveIn_RequiresUnlockTwoPigsAndKnownPigs()
        {
            var pet = CreatePet();
            AddTwoPigs(pet);
            pet.State.Clovers = 1500;

            Assert.Equal(MoveResult.Locked, pet.MoveIn(new[] { "a", "b" }));

            pet.UnlockDorm();
            Assert.Equal(MoveResult.Unknown, pet.MoveIn(new[] { "zzz", "a" }));
            Assert.Equal(MoveResult.NeedTwo, pet.MoveIn(new[] { "a" }));
            Assert.Equal(MoveResult.Ok, pet.MoveIn(new[] { "a", "b" }));
            Assert.Equal(MoveResult.AlreadyShared, pet.MoveIn(new[] { "a", "b" }));
        }

        [Fact]
        public void DormBondBonus_OnlyForResidentWithNonMemorialRoommate()
        {
            var pet = CreatePet();
            pet.State.Roster.Add(Pig("a", "A"));
            pet.State.Roster.Add(Pig("b", "B"));
            pet.State.Roster.Add(Pig("m", "M", memorial: true));
            pet.State.Clovers = 1500;
            pet.UnlockDorm();
            Assert.Equal(MoveResult.Ok, pet.MoveIn(new[] { "a", "m" }));

            Assert.Equal(0.0, pet.DormBondBonus("a"));
            Assert.Equal(pet.PigRooms.Dorm.BondGainBonus, pet.DormBondBonus("m"));
            Assert.Equal(0.0, pet.DormBondBonus("b"));
        }

        [Fact]
        public void FlagsOff_DisableEverything()
        {
            var pet = CreatePet(dorm: false);
            AddTwoPigs(pet);
            pet.State.Clovers = 5000;

            Assert.Equal(WorldResult.Disabled, pet.UnlockDorm());
            Assert.Equal(WorldResult.Disabled, pet.UpgradeDorm());
            Assert.Equal(MoveResult.Disabled, pet.MoveIn(new[] { "a", "b" }));
            Assert.False(pet.MoveOut("a"));
            Assert.Equal(0.0, pet.DormBondBonus("a"));
            Assert.Equal(5000, pet.State.Clovers);
        }
    }
}
