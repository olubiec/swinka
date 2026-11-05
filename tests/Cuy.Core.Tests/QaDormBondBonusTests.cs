using System;
using Cuy.Core.Pigs;
using Cuy.Core.Time;
using Cuy.Core.World;
using Xunit;

namespace Cuy.Core.Tests
{
    public class QaDormBondBonusTests
    {
        private static Pet CreatePet()
        {
            var clock = new ManualClock(new DateTime(2026, 1, 1, 12, 0, 0, DateTimeKind.Utc));
            var state = GameState.CreateNew("test", clock.UtcNow);
            state.Roster.Clear();
            var balance = Balance.CreateDefault();
            balance.PigRoomsActive = true;
            balance.DormActive = true;
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

        [Fact]
        public void BondGain_IsIncreasedForResidentsOfTheDorm()
        {
            var pet = CreatePet();
            pet.State.Roster.Add(Pig("a", "A"));
            pet.State.Roster.Add(Pig("b", "B"));
            pet.State.Clovers = 1500;
            Assert.Equal(WorldResult.Ok, pet.UnlockDorm());
            Assert.Equal(MoveResult.Ok, pet.MoveIn(new[] { "a", "b" }));

            // 20 points * (1 + 0.05) = 21 with the default dorm bonus.
            Assert.Equal(21, pet.AddBondPoints(20));
            Assert.Equal(21, pet.State.Bond.Points);
        }

        [Fact]
        public void BondGain_IsUnchangedOutsideTheDorm()
        {
            var pet = CreatePet();
            pet.State.Roster.Add(Pig("a", "A"));
            pet.State.Roster.Add(Pig("b", "B"));
            pet.State.Clovers = 1500;
            Assert.Equal(WorldResult.Ok, pet.UnlockDorm());

            // Dorm unlocked, but nobody has moved in.
            Assert.Equal(20, pet.AddBondPoints(20));
        }
    }
}
