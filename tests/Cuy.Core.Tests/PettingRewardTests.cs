using System;
using Cuy.Core;
using Cuy.Core.Time;
using Xunit;

namespace Cuy.Core.Tests
{
    public class PettingRewardTests
    {
        [Fact]
        public void Petting_RewardsOnlyTenTimesPerHour()
        {
            var clock = new ManualClock(new DateTime(2026, 10, 12, 12, 0, 0, DateTimeKind.Utc));
            var state = GameState.CreateNew("Tester", clock.UtcNow);
            state.Needs.Mood = 10.0;
            var pet = new Pet(state, clock);

            for (int i = 0; i < 10; i++) Assert.True(pet.TryRewardPetting(2.0));
            Assert.Equal(30.0, state.Needs.Mood);

            // 11th pet within the hour: no reward
            Assert.False(pet.TryRewardPetting(2.0));
            Assert.Equal(30.0, state.Needs.Mood);

            // an hour later the limit has reset
            clock.Advance(TimeSpan.FromMinutes(61));
            Assert.True(pet.TryRewardPetting(2.0));
        }
    }
}
