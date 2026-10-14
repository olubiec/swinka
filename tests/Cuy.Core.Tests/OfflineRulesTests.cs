using System;
using Cuy.Core;
using Cuy.Core.Time;
using Xunit;

namespace Cuy.Core.Tests
{
    public class OfflineRulesTests
    {
        [Fact]
        public void Needs_OfflineDecay_IsThreeTimesSlowerThanOnline()
        {
            var needs = new Needs();
            var balance = Balance.CreateDefault();

            // 1 hour offline
            needs.ApplyTime(TimeSpan.FromHours(1), offline: true, sleeping: false, balance);

            // Decay: fullness 8 * (1/3) = 8/3 pts
            Assert.Equal(100.0 - (8.0 / 3.0), needs.Satiety, precision: 4);
            // Vitamin C: 4 * (1/3) = 4/3 pts
            Assert.Equal(100.0 - (4.0 / 3.0), needs.VitaminC, precision: 4);
            // Humor: 5 * (1/3) = 5/3 pkt
            Assert.Equal(100.0 - (5.0 / 3.0), needs.Mood, precision: 4);
            // Teeth: 2 * (1/3) = 2/3 pts
            Assert.Equal(100.0 - (2.0 / 3.0), needs.Teeth, precision: 4);
        }

        [Fact]
        public void Needs_OfflineDecay_DoesNotDropBelowFloor20_AfterLongAbsence()
        {
            var needs = new Needs();
            var balance = Balance.CreateDefault();

            // Weekend without care (e.g. 72 hours)
            needs.ApplyTime(TimeSpan.FromHours(72), offline: true, sleeping: false, balance);

            // Faster-decaying needs stop exactly at 20
            Assert.Equal(20.0, needs.Satiety);
            Assert.Equal(20.0, needs.VitaminC);
            Assert.Equal(20.0, needs.Mood);

            // Teeth: decay (2/3) * 72 = 48 pts -> 100 - 48 = 52 (> 20)
            Assert.Equal(52.0, needs.Teeth, precision: 4);

            // Cleanliness: does not drop by itself
            Assert.Equal(100.0, needs.Cleanliness);
        }

        [Fact]
        public void Needs_OfflineDecay_WhenAlreadyBelow20_PreservesExistingValue()
        {
            var needs = new Needs();
            needs.Satiety = 12.0;
            var balance = Balance.CreateDefault();

            // Since the need was already below the lower bound of 20 before going offline,
            // per Math.Min(value, 20) it should neither drop further nor jump up to 20.
            needs.ApplyTime(TimeSpan.FromHours(24), offline: true, sleeping: false, balance);

            Assert.Equal(12.0, needs.Satiety);
        }

        [Fact]
        public void Needs_OfflineDecay_EnergyCountsAsSleepByDefault_AndRegenerates()
        {
            var needs = new Needs();
            needs.Energy = 40.0;
            var balance = Balance.CreateDefault();
            Assert.True(balance.OfflineCountsAsSleep);

            // 2 hours offline
            needs.ApplyTime(TimeSpan.FromHours(2), offline: true, sleeping: false, balance);

            // Recovery: 40 + 15 * 2 = 70
            Assert.Equal(70.0, needs.Energy, precision: 4);
        }

        [Fact]
        public void Needs_OfflineDecay_EnergyDecaysToFloor20_WhenOfflineSleepDisabled()
        {
            var needs = new Needs();
            needs.Energy = 100.0;
            var balance = Balance.CreateDefault();
            balance.OfflineCountsAsSleep = false;

            // Offline energy decay: 6 * (1/3) = 2/h. After 10h -> 80
            needs.ApplyTime(TimeSpan.FromHours(10), offline: true, sleeping: false, balance);
            Assert.Equal(80.0, needs.Energy, precision: 4);

            // After a very long time it does not drop below 20
            needs.ApplyTime(TimeSpan.FromHours(100), offline: true, sleeping: false, balance);
            Assert.Equal(20.0, needs.Energy);
        }

        [Fact]
        public void Pet_Start_AppliesOfflineTime_WhenLaunchedAfterLongBreak()
        {
            var lastSavedUtc = new DateTime(2026, 10, 11, 8, 0, 0, DateTimeKind.Utc);
            var state = GameState.CreateNew("Cuy", lastSavedUtc);
            state.LastActiveUtc = lastSavedUtc;

            // Computer switched on 48 hours later
            var startupUtc = lastSavedUtc.AddHours(48);
            var clock = new ManualClock(startupUtc);
            var balance = Balance.CreateDefault();
            var pet = new Pet(state, clock, balance);

            pet.Start();

            Assert.Equal(TimeSpan.FromHours(48), pet.LastOfflineDuration);
            Assert.Equal(48.0, pet.State.Stats.OfflineHours, precision: 3);
            Assert.Equal(0.0, pet.State.Stats.OnlineHours);
            // Satiety reaches the lower bound of 20 after 48h offline
            Assert.Equal(20.0, pet.Needs.Satiety);
            // With OfflineCountsAsSleep energy recovered to 100
            Assert.Equal(100.0, pet.Needs.Energy);
            // LastActiveUtc updated to the start time
            Assert.Equal(startupUtc, pet.State.LastActiveUtc);
        }

        [Fact]
        public void Pet_Update_TreatsLongGapAsOffline_WhenComputerWasAsleep()
        {
            var startUtc = new DateTime(2026, 10, 11, 12, 0, 0, DateTimeKind.Utc);
            var clock = new ManualClock(startUtc, multiplier: TimeMultipliers.Normal);
            var state = GameState.CreateNew("Cuy", startUtc);
            var balance = Balance.CreateDefault();
            var pet = new Pet(state, clock, balance);

            pet.Start();

            // Laptop asleep for 3 hours (real time > MaxOnlineGap 5 min)
            clock.Advance(TimeSpan.FromHours(3));
            pet.Update();

            // Counted as offline hours
            Assert.Equal(3.0, pet.State.Stats.OfflineHours, precision: 3);
            Assert.Equal(0.0, pet.State.Stats.OnlineHours);
            // Decay per the offline rule: 100 - (8/3)*3 = 92
            Assert.Equal(92.0, pet.Needs.Satiety, precision: 3);
        }
    }
}
