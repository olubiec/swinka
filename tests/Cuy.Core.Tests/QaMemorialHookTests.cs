using System;
using Cuy.Core.Pigs;
using Cuy.Core.Time;
using Cuy.Core.World;
using Xunit;

namespace Cuy.Core.Tests
{
    public class QaMemorialHookTests
    {
        [Fact]
        public void SetMemorial_CreatesTheMemoryRoom()
        {
            var clock = new ManualClock(new DateTime(2026, 1, 1, 12, 0, 0, DateTimeKind.Utc));
            var state = GameState.CreateNew("test", clock.UtcNow);
            state.Roster.Clear();
            state.Roster.Add(new PigProfile { Id = "p1", Name = "Kuki", NamedId = "kuki" });
            var balance = Balance.CreateDefault();
            balance.PigRoomsActive = true;
            var pet = new Pet(state, clock, balance);
            pet.PigRooms = PigRoomConfig.CreateDefault();

            // No EnsurePigRooms here: the room must come from the SetMemorial hook.
            Assert.False(pet.EnsureWorld().Rooms.ContainsKey("pig:kuki"));

            Assert.True(pet.SetMemorial("kuki", true));

            Assert.True(pet.EnsureWorld().Rooms.ContainsKey("pig:kuki"));
            Assert.True(pet.IsMemoryRoom("pig:kuki"));
        }
    }
}
