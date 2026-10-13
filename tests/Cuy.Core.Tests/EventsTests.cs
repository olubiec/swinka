using System;
using System.Collections.Generic;
using Cuy.Core;
using Cuy.Core.Time;
using Xunit;

namespace Cuy.Core.Tests
{
    public class EventsTests
    {
        [Fact]
        public void NeedLow_FiresWhenNeedDropsBelowThreshold()
        {
            var nowUtc = new DateTime(2026, 10, 11, 12, 0, 0, DateTimeKind.Utc);
            var clock = new ManualClock(nowUtc);
            var state = GameState.CreateNew("Świnka", nowUtc);
            var balance = Balance.CreateDefault(); // LowThreshold = 35
            var pet = new Pet(state, clock, balance);
            pet.Start();

            var receivedEvents = new List<NeedEventArgs>();
            pet.NeedLow += (s, e) => receivedEvents.Add(e);

            // Najedzenie spada z 100 do 36 (jeszcze powyżej progu 35)
            pet.ChangeNeed(Need.Satiety, -64);
            Assert.Equal(36.0, pet.Needs.Satiety);
            Assert.Empty(receivedEvents);

            // Spada do 34 (poniżej progu 35)
            pet.ChangeNeed(Need.Satiety, -2);
            Assert.Equal(34.0, pet.Needs.Satiety);
            Assert.Single(receivedEvents);
            Assert.Equal(Need.Satiety, receivedEvents[0].Need);
            Assert.Equal(34.0, receivedEvents[0].Value);
        }

        [Fact]
        public void NeedLow_DoesNotFireRepeatedlyWhileRemainingBelowThreshold()
        {
            var nowUtc = new DateTime(2026, 10, 11, 12, 0, 0, DateTimeKind.Utc);
            var clock = new ManualClock(nowUtc);
            var state = GameState.CreateNew("Świnka", nowUtc);
            var pet = new Pet(state, clock);
            pet.Start();

            int eventCount = 0;
            pet.NeedLow += (s, e) => eventCount++;

            // Spadek do 30 -> wywołuje pierwsze powiadomienie
            pet.ChangeNeed(Need.Satiety, -70);
            Assert.Equal(1, eventCount);

            // Dalszy spadek do 25 i 20 -> nie generuje kolejnych NeedLow dopóki nie zresetuje się histereza
            pet.ChangeNeed(Need.Satiety, -5);
            pet.ChangeNeed(Need.Satiety, -5);
            Assert.Equal(1, eventCount);
        }

        [Fact]
        public void NeedLow_Hysteresis_RequiresRisingAboveThresholdPlusHysteresisBeforeFiringAgain()
        {
            var nowUtc = new DateTime(2026, 10, 11, 12, 0, 0, DateTimeKind.Utc);
            var clock = new ManualClock(nowUtc);
            var state = GameState.CreateNew("Świnka", nowUtc);
            var balance = Balance.CreateDefault(); // LowThreshold = 35, Hysteresis = 5 -> Reset przy >= 40
            var pet = new Pet(state, clock, balance);
            pet.Start();

            int eventCount = 0;
            pet.NeedLow += (s, e) => eventCount++;

            // 1. Spadek do 30 -> pierwsze zdarzenie
            pet.ChangeNeed(Need.Satiety, -70);
            Assert.Equal(1, eventCount);

            // 2. Podnosimy do 38 (powyżej 35, ale MNIEJ niż 35 + 5 = 40)
            pet.ChangeNeed(Need.Satiety, +8);
            Assert.Equal(38.0, pet.Needs.Satiety);

            // 3. Spadek ponownie do 32 -> zdarzenie NIE powinno przyjść, bo histereza nie została zresetowana!
            pet.ChangeNeed(Need.Satiety, -6);
            Assert.Equal(32.0, pet.Needs.Satiety);
            Assert.Equal(1, eventCount);

            // 4. Podnosimy powyżej 40 (np. do 42) -> reset flagi _lowNotified
            pet.ChangeNeed(Need.Satiety, +10);
            Assert.Equal(42.0, pet.Needs.Satiety);

            // 5. Ponowny spadek poniżej 35 (do 33) -> teraz drugie zdarzenie!
            pet.ChangeNeed(Need.Satiety, -9);
            Assert.Equal(33.0, pet.Needs.Satiety);
            Assert.Equal(2, eventCount);
        }

        [Fact]
        public void NeedLow_FiresOnPetStart_WhenLoadedStateHasLowNeeds()
        {
            var nowUtc = new DateTime(2026, 10, 11, 12, 0, 0, DateTimeKind.Utc);
            var clock = new ManualClock(nowUtc);
            var state = GameState.CreateNew("Głodomorek", nowUtc);
            // Stan wczytany z zapisu ma już niskie potrzeby
            state.Needs.Mood = 22.0;

            var pet = new Pet(state, clock);
            NeedEventArgs? received = null;
            pet.NeedLow += (s, e) =>
            {
                if (e.Need == Need.Mood) received = e;
            };

            // Start zgłasza zaległe zdarzenia
            pet.Start();

            Assert.NotNull(received);
            Assert.Equal(Need.Mood, received.Need);
            Assert.Equal(22.0, received.Value);
        }

        [Fact]
        public void StageChanged_FiresWhenAgeCrossesJuniorThreshold()
        {
            var birthUtc = new DateTime(2026, 10, 1, 0, 0, 0, DateTimeKind.Utc);
            var clock = new ManualClock(birthUtc);
            var state = GameState.CreateNew("Maluch", birthUtc);
            var balance = Balance.CreateDefault(); // 21 pig days per real day. JuniorFromPigDays = 21 (czyli dokładnie 1 dzień realny)
            var pet = new Pet(state, clock, balance);
            pet.Start();

            Assert.Equal(LifeStage.Baby, pet.Stage);

            StageChangedEventArgs? stageEvent = null;
            pet.StageChanged += (s, e) => stageEvent = e;

            // Przesuwamy o 23 godziny gry (jeszcze Maluch: 23/24 * 21 = 20.125 dni świnki < 21)
            clock.Advance(TimeSpan.FromHours(23));
            pet.Update();
            Assert.Null(stageEvent);
            Assert.Equal(LifeStage.Baby, pet.Stage);

            // Przesuwamy o kolejne 2 godziny (łącznie 25 godzin > 24 godziny realne = 21.875 dni świnki >= 21)
            clock.Advance(TimeSpan.FromHours(2));
            pet.Update();

            Assert.NotNull(stageEvent);
            Assert.Equal(LifeStage.Baby, stageEvent.OldStage);
            Assert.Equal(LifeStage.Junior, stageEvent.NewStage);
            Assert.Equal(LifeStage.Junior, pet.Stage);
        }

        [Fact]
        public void StageChanged_DoesNotFireAgainWhileInSameStage()
        {
            var birthUtc = new DateTime(2026, 10, 1, 0, 0, 0, DateTimeKind.Utc);
            var clock = new ManualClock(birthUtc);
            var state = GameState.CreateNew("Świnka", birthUtc);
            var pet = new Pet(state, clock);
            pet.Start();

            int eventCount = 0;
            pet.StageChanged += (s, e) => eventCount++;

            // Przeskok do Młodzika (2 dni)
            clock.Advance(TimeSpan.FromDays(2));
            pet.Update();
            Assert.Equal(1, eventCount);

            // Kolejne aktualizacje w ramach etapu Młodzik (np. dzień 3, 4, 5)
            clock.Advance(TimeSpan.FromDays(1));
            pet.Update();
            clock.Advance(TimeSpan.FromDays(1));
            pet.Update();

            Assert.Equal(1, eventCount);
            Assert.Equal(LifeStage.Junior, pet.Stage);
        }

        [Fact]
        public void StageChanged_FiresWhenReachingAdultStage()
        {
            var birthUtc = new DateTime(2026, 10, 1, 0, 0, 0, DateTimeKind.Utc);
            var clock = new ManualClock(birthUtc);
            var state = GameState.CreateNew("Świnka", birthUtc);
            var pet = new Pet(state, clock);
            pet.Start();

            // Dorosła od 6 miesięcy świnki = 182.625 dni świnki = 8.696 dni realnych
            // Przesuwamy najpierw do Juniora (2 dni)
            clock.Advance(TimeSpan.FromDays(2));
            pet.Update();
            Assert.Equal(LifeStage.Junior, pet.Stage);

            StageChangedEventArgs? toAdultEvent = null;
            pet.StageChanged += (s, e) => toAdultEvent = e;

            // Przesuwamy do 9 dni realnych (9 * 21 = 189 dni świnki > 182.625)
            clock.Advance(TimeSpan.FromDays(7));
            pet.Update();

            Assert.NotNull(toAdultEvent);
            Assert.Equal(LifeStage.Junior, toAdultEvent.OldStage);
            Assert.Equal(LifeStage.Adult, toAdultEvent.NewStage);
            Assert.Equal(LifeStage.Adult, pet.Stage);
        }

        [Fact]
        public void StageChanged_CanSkipStagesAfterLongOffline_OnStart()
        {
            var birthUtc = new DateTime(2026, 10, 1, 0, 0, 0, DateTimeKind.Utc);
            var state = GameState.CreateNew("Świnka", birthUtc);
            state.Stage = LifeStage.Baby;
            state.LastActiveUtc = birthUtc;

            // Uruchomienie po 15 dniach realnych (15 * 21 = 315 dni świnki -> Dorosła)
            var startUtc = birthUtc.AddDays(15);
            var clock = new ManualClock(startUtc);
            var pet = new Pet(state, clock);

            StageChangedEventArgs? stageEvent = null;
            pet.StageChanged += (s, e) => stageEvent = e;

            pet.Start();

            Assert.NotNull(stageEvent);
            Assert.Equal(LifeStage.Baby, stageEvent.OldStage);
            Assert.Equal(LifeStage.Adult, stageEvent.NewStage);
            Assert.Equal(LifeStage.Adult, pet.Stage);
        }
    }
}
