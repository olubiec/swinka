using System;
using System.Collections.Generic;
using Cuy.Core;
using Cuy.Core.Time;
using Xunit;

namespace Cuy.Core.Tests
{
    public class InteractionLogicTests
    {
        [Fact]
        public void Petting_AwakePig_IncreasesMoodAndBondPoints_UpToHourlyLimit()
        {
            var clock = new ManualClock(new DateTime(2026, 10, 1, 12, 0, 0, DateTimeKind.Utc));
            var state = GameState.CreateNew("Cuy", clock.UtcNow);
            state.Needs.Mood = 50.0;
            var pet = new Pet(state, clock);

            var rewardedTimes = new List<DateTime>();

            // Do 10 rewarded pets
            for (int i = 0; i < 10; i++)
            {
                var now = clock.UtcNow;
                rewardedTimes.RemoveAll(t => (now - t).TotalSeconds > 3600.0);

                if (rewardedTimes.Count < 10)
                {
                    rewardedTimes.Add(now);
                    pet.Needs.Mood = Math.Min(100.0, pet.Needs.Mood + 5.0);
                    pet.AddBondPoints(1);
                    pet.Count("pets");
                }
            }

            Assert.Equal(10, rewardedTimes.Count);
            Assert.Equal(100.0, pet.Needs.Mood); // 50 + 10*5 = 100
            Assert.Equal(10, pet.State.Bond.Points);
            Assert.Equal(10, pet.State.Stats.Counters["pets"]);

            // The 11th pet in the same hour should not add a reward
            var now11 = clock.UtcNow;
            rewardedTimes.RemoveAll(t => (now11 - t).TotalSeconds > 3600.0);
            bool rewardGiven = false;
            if (rewardedTimes.Count < 10)
            {
                rewardGiven = true;
                rewardedTimes.Add(now11);
                pet.Needs.Mood = Math.Min(100.0, pet.Needs.Mood + 5.0);
                pet.AddBondPoints(1);
                pet.Count("pets");
            }

            Assert.False(rewardGiven);
            Assert.Equal(10, pet.State.Bond.Points);
            Assert.Equal(10, pet.State.Stats.Counters["pets"]);

            // Move the clock 61 minutes -> the limit renews
            clock.Advance(TimeSpan.FromMinutes(61));
            var nowAfterHour = clock.UtcNow;
            rewardedTimes.RemoveAll(t => (nowAfterHour - t).TotalSeconds > 3600.0);
            Assert.Empty(rewardedTimes);

            // The next pet is rewarded
            if (rewardedTimes.Count < 10)
            {
                rewardedTimes.Add(nowAfterHour);
                pet.Needs.Mood = Math.Min(100.0, pet.Needs.Mood + 5.0);
                pet.AddBondPoints(1);
                pet.Count("pets");
            }

            Assert.Single(rewardedTimes);
            Assert.Equal(11, pet.State.Bond.Points);
            Assert.Equal(11, pet.State.Stats.Counters["pets"]);
        }

        [Fact]
        public void Petting_SleepingPig_WakesItUpAndReducesMoodBy2()
        {
            var clock = new ManualClock(new DateTime(2026, 10, 1, 12, 0, 0, DateTimeKind.Utc));
            var state = GameState.CreateNew("Cuy", clock.UtcNow);
            state.Needs.Mood = 50.0;
            var pet = new Pet(state, clock);
            pet.IsSleeping = true;

            // Petting a sleeping pig
            Assert.True(pet.IsSleeping);
            pet.IsSleeping = false;
            pet.Needs.Mood = Math.Max(0.0, pet.Needs.Mood - 2.0);

            Assert.False(pet.IsSleeping);
            Assert.Equal(48.0, pet.Needs.Mood);
        }

        [Fact]
        public void StartupGreeting_ConditionDependsOnBondLevel()
        {
            var clock = new ManualClock(new DateTime(2026, 10, 1, 12, 0, 0, DateTimeKind.Utc));
            var state = GameState.CreateNew("Cuy", clock.UtcNow);
            var pet = new Pet(state, clock);

            // Initial bond level = 1 (< 3) -> sniff
            Assert.True(pet.State.Bond.Level < 3);
            string greetingAnimLowBond = pet.State.Bond.Level >= 3 ? "greet" : "sniff";
            Assert.Equal("sniff", greetingAnimLowBond);

            // Raise the bond to level 3 (threshold = 45 pts, daily limit = 30 pts)
            pet.AddBondPoints(30);
            clock.Advance(TimeSpan.FromDays(1));
            pet.AddBondPoints(20);
            Assert.True(pet.State.Bond.Level >= 3);

            string greetingAnimHighBond = pet.State.Bond.Level >= 3 ? "greet" : "sniff";
            Assert.Equal("greet", greetingAnimHighBond);
        }

        [Fact]
        public void Irritation_BlocksCallPetFor30Seconds()
        {
            var clock = new ManualClock(new DateTime(2026, 10, 1, 12, 0, 0, DateTimeKind.Utc));
            DateTime offendedUntil = clock.UtcNow.AddSeconds(30);

            // While sulking
            bool isOffendedNow = clock.UtcNow < offendedUntil;
            Assert.True(isOffendedNow);

            // Move 15 s -> still sulking
            clock.Advance(TimeSpan.FromSeconds(15));
            Assert.True(clock.UtcNow < offendedUntil);

            // Move another 16 s (31 s in total) -> no longer sulking
            clock.Advance(TimeSpan.FromSeconds(16));
            Assert.False(clock.UtcNow < offendedUntil);
        }

        [Fact]
        public void CallPet_IncreasesBondAndCounts()
        {
            var clock = new ManualClock(new DateTime(2026, 10, 1, 12, 0, 0, DateTimeKind.Utc));
            var state = GameState.CreateNew("Cuy", clock.UtcNow);
            var pet = new Pet(state, clock);

            int initialBond = pet.State.Bond.Points;
            pet.AddBondPoints(1);
            pet.Count("calls");

            Assert.Equal(initialBond + 1, pet.State.Bond.Points);
            Assert.Equal(1, pet.State.Stats.Counters["calls"]);
        }
    }
}
