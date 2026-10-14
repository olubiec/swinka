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
            var state = GameState.CreateNew("Cuy", nowUtc);
            var balance = Balance.CreateDefault(); // LowThreshold = 35
            var pet = new Pet(state, clock, balance);
            pet.Start();

            var receivedEvents = new List<NeedEventArgs>();
            pet.NeedLow += (s, e) => receivedEvents.Add(e);

            // Fullness drops from 100 to 36 (still above the 35 threshold)
            pet.ChangeNeed(Need.Satiety, -64);
            Assert.Equal(36.0, pet.Needs.Satiety);
            Assert.Empty(receivedEvents);

            // Drops to 34 (below the 35 threshold)
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
            var state = GameState.CreateNew("Cuy", nowUtc);
            var pet = new Pet(state, clock);
            pet.Start();

            int eventCount = 0;
            pet.NeedLow += (s, e) => eventCount++;

            // Drop to 30 -> raises the first notification
            pet.ChangeNeed(Need.Satiety, -70);
            Assert.Equal(1, eventCount);

            // Further drops to 25 and 20 -> no more NeedLow until the hysteresis resets
            pet.ChangeNeed(Need.Satiety, -5);
            pet.ChangeNeed(Need.Satiety, -5);
            Assert.Equal(1, eventCount);
        }

        [Fact]
        public void NeedLow_Hysteresis_RequiresRisingAboveThresholdPlusHysteresisBeforeFiringAgain()
        {
            var nowUtc = new DateTime(2026, 10, 11, 12, 0, 0, DateTimeKind.Utc);
            var clock = new ManualClock(nowUtc);
            var state = GameState.CreateNew("Cuy", nowUtc);
            var balance = Balance.CreateDefault(); // LowThreshold = 35, Hysteresis = 5 -> reset at >= 40
            var pet = new Pet(state, clock, balance);
            pet.Start();

            int eventCount = 0;
            pet.NeedLow += (s, e) => eventCount++;

            // 1. Drop to 30 -> first event
            pet.ChangeNeed(Need.Satiety, -70);
            Assert.Equal(1, eventCount);

            // 2. Raise to 38 (above 35, but LESS than 35 + 5 = 40)
            pet.ChangeNeed(Need.Satiety, +8);
            Assert.Equal(38.0, pet.Needs.Satiety);

            // 3. Drop again to 32 -> the event should NOT fire, the hysteresis was not reset!
            pet.ChangeNeed(Need.Satiety, -6);
            Assert.Equal(32.0, pet.Needs.Satiety);
            Assert.Equal(1, eventCount);

            // 4. Raise above 40 (e.g. to 42) -> resets the _lowNotified flag
            pet.ChangeNeed(Need.Satiety, +10);
            Assert.Equal(42.0, pet.Needs.Satiety);

            // 5. Drop below 35 again (to 33) -> now the second event!
            pet.ChangeNeed(Need.Satiety, -9);
            Assert.Equal(33.0, pet.Needs.Satiety);
            Assert.Equal(2, eventCount);
        }

        [Fact]
        public void NeedLow_FiresOnPetStart_WhenLoadedStateHasLowNeeds()
        {
            var nowUtc = new DateTime(2026, 10, 11, 12, 0, 0, DateTimeKind.Utc);
            var clock = new ManualClock(nowUtc);
            var state = GameState.CreateNew("Nibbles", nowUtc);
            // A state loaded from a save already has low needs
            state.Needs.Mood = 22.0;

            var pet = new Pet(state, clock);
            NeedEventArgs? received = null;
            pet.NeedLow += (s, e) =>
            {
                if (e.Need == Need.Mood) received = e;
            };

            // Start raises the pending events
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
            var state = GameState.CreateNew("Pip", birthUtc);
            var balance = Balance.CreateDefault(); // 21 pig days per real day. JuniorFromPigDays = 21 (exactly 1 real day)
            var pet = new Pet(state, clock, balance);
            pet.Start();

            Assert.Equal(LifeStage.Baby, pet.Stage);

            StageChangedEventArgs? stageEvent = null;
            pet.StageChanged += (s, e) => stageEvent = e;

            // Move 23 game hours (still Baby: 23/24 * 21 = 20.125 pig days < 21)
            clock.Advance(TimeSpan.FromHours(23));
            pet.Update();
            Assert.Null(stageEvent);
            Assert.Equal(LifeStage.Baby, pet.Stage);

            // Move another 2 hours (25 hours in total > 24 real hours = 21.875 pig days >= 21)
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
            var state = GameState.CreateNew("Cuy", birthUtc);
            var pet = new Pet(state, clock);
            pet.Start();

            int eventCount = 0;
            pet.StageChanged += (s, e) => eventCount++;

            // Jump to Junior (2 days)
            clock.Advance(TimeSpan.FromDays(2));
            pet.Update();
            Assert.Equal(1, eventCount);

            // Further updates within the Junior stage (e.g. day 3, 4, 5)
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
            var state = GameState.CreateNew("Cuy", birthUtc);
            var pet = new Pet(state, clock);
            pet.Start();

            // Adult from 6 pig months = 182.625 pig days = 8.696 real days
            // First move to Junior (2 days)
            clock.Advance(TimeSpan.FromDays(2));
            pet.Update();
            Assert.Equal(LifeStage.Junior, pet.Stage);

            StageChangedEventArgs? toAdultEvent = null;
            pet.StageChanged += (s, e) => toAdultEvent = e;

            // Move to 9 real days (9 * 21 = 189 pig days > 182.625)
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
            var state = GameState.CreateNew("Cuy", birthUtc);
            state.Stage = LifeStage.Baby;
            state.LastActiveUtc = birthUtc;

            // Start after 15 real days (15 * 21 = 315 pig days -> Adult)
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
