using System;
using SwinkaCore;
using SwinkaCore.Time;
using Xunit;

namespace SwinkaCore.Tests
{
    public class OfflineRulesTests
    {
        [Fact]
        public void Needs_OfflineDecay_IsThreeTimesSlowerThanOnline()
        {
            var needs = new Needs();
            var balance = Balance.CreateDefault();

            // 1 godzina offline
            needs.ApplyTime(TimeSpan.FromHours(1), offline: true, sleeping: false, balance);

            // Spadek: najedzenie 8 * (1/3) = 8/3 pkt
            Assert.Equal(100.0 - (8.0 / 3.0), needs.Satiety, precision: 4);
            // Witamina C: 4 * (1/3) = 4/3 pkt
            Assert.Equal(100.0 - (4.0 / 3.0), needs.VitaminC, precision: 4);
            // Humor: 5 * (1/3) = 5/3 pkt
            Assert.Equal(100.0 - (5.0 / 3.0), needs.Mood, precision: 4);
            // Ząbki: 2 * (1/3) = 2/3 pkt
            Assert.Equal(100.0 - (2.0 / 3.0), needs.Teeth, precision: 4);
        }

        [Fact]
        public void Needs_OfflineDecay_DoesNotDropBelowFloor20_AfterLongAbsence()
        {
            var needs = new Needs();
            var balance = Balance.CreateDefault();

            // Weekend bez opieki (np. 72 godziny)
            needs.ApplyTime(TimeSpan.FromHours(72), offline: true, sleeping: false, balance);

            // Potrzeby o szybszym spadku zatrzymują się dokładnie na 20
            Assert.Equal(20.0, needs.Satiety);
            Assert.Equal(20.0, needs.VitaminC);
            Assert.Equal(20.0, needs.Mood);

            // Ząbki: spadek (2/3) * 72 = 48 pkt -> 100 - 48 = 52 (> 20)
            Assert.Equal(52.0, needs.Teeth, precision: 4);

            // Czystość: nie spada sama z siebie
            Assert.Equal(100.0, needs.Cleanliness);
        }

        [Fact]
        public void Needs_OfflineDecay_WhenAlreadyBelow20_PreservesExistingValue()
        {
            var needs = new Needs();
            needs.Satiety = 12.0;
            var balance = Balance.CreateDefault();

            // Skoro potrzeba przed offline była już poniżej dolnej granicy 20,
            // zgodnie z logiką Math.Min(value, 20) nie powinna spaść jeszcze niżej ani podskoczyć do 20.
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

            // 2 godziny offline
            needs.ApplyTime(TimeSpan.FromHours(2), offline: true, sleeping: false, balance);

            // Regeneracja: 40 + 15 * 2 = 70
            Assert.Equal(70.0, needs.Energy, precision: 4);
        }

        [Fact]
        public void Needs_OfflineDecay_EnergyDecaysToFloor20_WhenOfflineSleepDisabled()
        {
            var needs = new Needs();
            needs.Energy = 100.0;
            var balance = Balance.CreateDefault();
            balance.OfflineCountsAsSleep = false;

            // Spadek energii offline: 6 * (1/3) = 2/h. Po 10h -> 80
            needs.ApplyTime(TimeSpan.FromHours(10), offline: true, sleeping: false, balance);
            Assert.Equal(80.0, needs.Energy, precision: 4);

            // Po bardzo długim czasie nie spada poniżej 20
            needs.ApplyTime(TimeSpan.FromHours(100), offline: true, sleeping: false, balance);
            Assert.Equal(20.0, needs.Energy);
        }

        [Fact]
        public void Pet_Start_AppliesOfflineTime_WhenLaunchedAfterLongBreak()
        {
            var lastSavedUtc = new DateTime(2026, 10, 11, 8, 0, 0, DateTimeKind.Utc);
            var state = GameState.CreateNew("Świnka", lastSavedUtc);
            state.LastActiveUtc = lastSavedUtc;

            // Włączenie komputera 48 godzin później
            var startupUtc = lastSavedUtc.AddHours(48);
            var clock = new ManualClock(startupUtc);
            var balance = Balance.CreateDefault();
            var pet = new Pet(state, clock, balance);

            pet.Start();

            Assert.Equal(TimeSpan.FromHours(48), pet.LastOfflineDuration);
            Assert.Equal(48.0, pet.State.Stats.OfflineHours, precision: 3);
            Assert.Equal(0.0, pet.State.Stats.OnlineHours);
            // Satiety po 48h offline osiąga dolną granicę 20
            Assert.Equal(20.0, pet.Needs.Satiety);
            // Energia przy OfflineCountsAsSleep zregenerowała się do 100
            Assert.Equal(100.0, pet.Needs.Energy);
            // LastActiveUtc zaktualizowane do czasu startu
            Assert.Equal(startupUtc, pet.State.LastActiveUtc);
        }

        [Fact]
        public void Pet_Update_TreatsLongGapAsOffline_WhenComputerWasAsleep()
        {
            var startUtc = new DateTime(2026, 10, 11, 12, 0, 0, DateTimeKind.Utc);
            var clock = new ManualClock(startUtc, multiplier: TimeMultipliers.Normal);
            var state = GameState.CreateNew("Świnka", startUtc);
            var balance = Balance.CreateDefault();
            var pet = new Pet(state, clock, balance);

            pet.Start();

            // Uśpiony laptop na 3 godziny (czas realny > MaxOnlineGap 5 min)
            clock.Advance(TimeSpan.FromHours(3));
            pet.Update();

            // Zaliczone do godzin offline
            Assert.Equal(3.0, pet.State.Stats.OfflineHours, precision: 3);
            Assert.Equal(0.0, pet.State.Stats.OnlineHours);
            // Spadek wg reguły offline: 100 - (8/3)*3 = 92
            Assert.Equal(92.0, pet.Needs.Satiety, precision: 3);
        }
    }
}
