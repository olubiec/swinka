using System;
using System.Diagnostics;
using Cuy.Core;
using Cuy.Core.AI;
using Cuy.Core.Time;
using Xunit;

namespace Cuy.Core.Tests
{
    public class BrainPerfTests
    {
        [Fact]
        public void Brain_10000Ticks_ExecutesUnderTwoSeconds_AndNoExceptions()
        {
            var startUtc = new DateTime(2026, 1, 1, 12, 0, 0, DateTimeKind.Utc);
            var clock = new ManualClock(startUtc);
            var state = GameState.CreateNew("Cuy", startUtc);
            var pet = new Pet(state, clock, new Balance());
            var rng = new Random(42);
            var brain = Brain.CreateDefault(pet, rng);

            var tickSpan = TimeSpan.FromSeconds(1);

            var sw = Stopwatch.StartNew();

            for (int i = 0; i < 10000; i++)
            {
                clock.Advance(tickSpan);
                brain.Update(tickSpan);
            }

            sw.Stop();

            Assert.True(sw.Elapsed < TimeSpan.FromSeconds(2.0),
                $"10,000 ticks took {sw.Elapsed.TotalMilliseconds:F2} ms, which exceeds 2.0 seconds.");
            Assert.NotNull(brain.CurrentAction);
        }
    }
}
