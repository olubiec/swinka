using System;
using Cuy.Core;
using Cuy.Core.Time;
using Xunit;

namespace Cuy.Core.Tests
{
    public class NeedsDecayTests
    {
        [Fact]
        public void Needs_OnlineDecay_MatchesBalanceTable_AfterOneHour()
        {
            var needs = new Needs();
            var balance = Balance.CreateDefault();

            needs.ApplyTime(TimeSpan.FromHours(1), offline: false, sleeping: false, balance);

            Assert.Equal(92.0, needs.Satiety, precision: 4);
            Assert.Equal(96.0, needs.VitaminC, precision: 4);
            Assert.Equal(94.0, needs.Energy, precision: 4);
            Assert.Equal(95.0, needs.Mood, precision: 4);
            Assert.Equal(100.0, needs.Cleanliness, precision: 4);
            Assert.Equal(98.0, needs.Teeth, precision: 4);
        }

        [Fact]
        public void Needs_OnlineDecay_ProportionalToTime()
        {
            var needs = new Needs();
            var balance = Balance.CreateDefault();

            needs.ApplyTime(TimeSpan.FromMinutes(30), offline: false, sleeping: false, balance);

            Assert.Equal(96.0, needs.Satiety, precision: 4);
            Assert.Equal(98.0, needs.VitaminC, precision: 4);
            Assert.Equal(97.0, needs.Energy, precision: 4);
            Assert.Equal(97.5, needs.Mood, precision: 4);
            Assert.Equal(100.0, needs.Cleanliness, precision: 4);
            Assert.Equal(99.0, needs.Teeth, precision: 4);
        }

        [Fact]
        public void Needs_OnlineDecay_ClampsAtZero()
        {
            var needs = new Needs();
            var balance = Balance.CreateDefault();

            // 20 godzin przy spadku 8/h to 160 punktów spadku
            needs.ApplyTime(TimeSpan.FromHours(20), offline: false, sleeping: false, balance);

            Assert.Equal(0.0, needs.Satiety);
            Assert.Equal(20.0, needs.VitaminC, precision: 4); // 100 - 80 = 20
            Assert.Equal(0.0, needs.Energy);                 // 100 - 120 -> 0
            Assert.Equal(0.0, needs.Mood);                   // 100 - 100 = 0
            Assert.Equal(100.0, needs.Cleanliness);          // 0 spadek
            Assert.Equal(60.0, needs.Teeth, precision: 4);   // 100 - 40 = 60
        }

        [Fact]
        public void Needs_OnlineDecay_WhenSleeping_RegeneratesEnergyAndDecaysOtherNeeds()
        {
            var needs = new Needs();
            needs.Energy = 50.0;
            var balance = Balance.CreateDefault();

            needs.ApplyTime(TimeSpan.FromHours(2), offline: false, sleeping: true, balance);

            // Regeneracja: 15/h * 2h = +30 pkt energii
            Assert.Equal(80.0, needs.Energy, precision: 4);
            // Inne potrzeby spadają normalnie: najedzenie 100 - 16 = 84
            Assert.Equal(84.0, needs.Satiety, precision: 4);
            Assert.Equal(92.0, needs.VitaminC, precision: 4);
            Assert.Equal(90.0, needs.Mood, precision: 4);
        }

        [Fact]
        public void Needs_OnlineDecay_ZeroOrNegativeSpan_DoesNotChangeNeeds()
        {
            var needs = new Needs();
            needs.Satiety = 80.0;
            var balance = Balance.CreateDefault();

            needs.ApplyTime(TimeSpan.Zero, offline: false, sleeping: false, balance);
            Assert.Equal(80.0, needs.Satiety);

            needs.ApplyTime(TimeSpan.FromHours(-2), offline: false, sleeping: false, balance);
            Assert.Equal(80.0, needs.Satiety);
        }

        [Fact]
        public void Pet_OnlineDecay_WithManualClock_OverOneHourInMinutes()
        {
            var startUtc = new DateTime(2026, 10, 11, 10, 0, 0, DateTimeKind.Utc);
            var clock = new ManualClock(startUtc);
            var state = GameState.CreateNew("Testowa", startUtc);
            var balance = Balance.CreateDefault();
            var pet = new Pet(state, clock, balance);

            pet.Start();

            // Krok po kroku co 1 minutę (w granicach MaxOnlineGap = 5 min)
            for (int i = 0; i < 60; i++)
            {
                clock.Advance(TimeSpan.FromMinutes(1));
                pet.Update();
            }

            Assert.Equal(92.0, pet.Needs.Satiety, precision: 3);
            Assert.Equal(96.0, pet.Needs.VitaminC, precision: 3);
            Assert.Equal(94.0, pet.Needs.Energy, precision: 3);
            Assert.Equal(95.0, pet.Needs.Mood, precision: 3);
            Assert.Equal(100.0, pet.Needs.Cleanliness, precision: 3);
            Assert.Equal(98.0, pet.Needs.Teeth, precision: 3);
            Assert.Equal(1.0, pet.State.Stats.OnlineHours, precision: 3);
        }

        [Fact]
        public void Pet_OnlineDecay_WithFastClockMultiplier()
        {
            var startUtc = new DateTime(2026, 10, 11, 10, 0, 0, DateTimeKind.Utc);
            // Mnożnik 60: 1 godzina gry to 1 minuta realna (< MaxOnlineGap 5 min)
            var clock = new ManualClock(startUtc, multiplier: TimeMultipliers.HourPerMinute);
            var state = GameState.CreateNew("Testowa", startUtc);
            var balance = Balance.CreateDefault();
            var pet = new Pet(state, clock, balance);

            pet.Start();

            // Przeskok o 1 godzinę czasu gry
            clock.Advance(TimeSpan.FromHours(1));
            pet.Update();

            Assert.Equal(92.0, pet.Needs.Satiety, precision: 3);
            Assert.Equal(96.0, pet.Needs.VitaminC, precision: 3);
            Assert.Equal(94.0, pet.Needs.Energy, precision: 3);
            Assert.Equal(95.0, pet.Needs.Mood, precision: 3);
            Assert.Equal(1.0, pet.State.Stats.OnlineHours, precision: 3);
        }
    }
}
