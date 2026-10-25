using System;
using System.Linq;
using Xunit;
using Cuy.Core;
using Cuy.Core.Health;
using Cuy.Core.Time;
using Newtonsoft.Json;
using System.Collections.Generic;

namespace Cuy.Core.Tests
{
    public class HealthSystemTests
    {
        private (Pet pet, ManualClock clock, Random rng) Setup()
        {
            var clock = new ManualClock(new DateTime(2023, 1, 1, 12, 0, 0, DateTimeKind.Utc));
            var state = new GameState();
            var pet = new Pet(state, clock);
            var rng = new Random(42);
            pet.State.Health.RandomSeed = rng;
            return (pet, clock, rng);
        }

        [Fact]
        public void Scurvy_AppearsAfter24hBelow20_NotBefore()
        {
            var (pet, clock, rng) = Setup();
            pet.State.Needs.VitaminC = 19;

            // Tick for 23 hours
            pet.TickHealth(TimeSpan.FromHours(23));
            Assert.DoesNotContain(pet.State.Health.Active, a => a.Id == "scurvy");

            // Tick for 1 more hour
            pet.TickHealth(TimeSpan.FromHours(1));

            // Advance clock one day so roll happens
            clock.Advance(TimeSpan.FromDays(1));
            pet.TickHealth(TimeSpan.FromHours(1));

            var scurvy = pet.State.Health.Active.FirstOrDefault(a => a.Id == "scurvy");
            Assert.NotNull(scurvy);
        }

        [Fact]
        public void MaxConditions_OneNewPerDay_MaxTwoActive()
        {
            var (pet, clock, rng) = Setup();
            pet.State.Needs.VitaminC = 10;
            pet.State.Needs.Teeth = 10;
            pet.State.Needs.Cleanliness = 10; // Bumblefoot

            // Just advance time without ticking to build up need timers quickly
            clock.Advance(TimeSpan.FromHours(48));
            // Apply elapsed time (triggers are evaluated now, but rolling only happens once a day based on local date)
            pet.TickHealth(TimeSpan.FromHours(48));

            Assert.Single(pet.State.Health.Active);

            // 2nd Day Roll
            clock.Advance(TimeSpan.FromDays(1));
            pet.TickHealth(TimeSpan.FromHours(1));
            Assert.Equal(2, pet.State.Health.Active.Count);

            // 3rd Day Roll
            clock.Advance(TimeSpan.FromDays(1));
            pet.TickHealth(TimeSpan.FromHours(1));
            Assert.Equal(2, pet.State.Health.Active.Count);
        }

        [Fact]
        public void RespiratoryInfection_UsesMultipliers()
        {
            var hitsWithoutMultipliers = 0;
            var hitsWithMultipliers = 0;
            var iters = 1000;

            for (int i=0; i<iters; i++)
            {
                // Normal
                var (p1, c1, r1) = Setup();
                p1.State.Health.RandomSeed = new Random(i);

                // Clear triggers
                p1.State.Needs.VitaminC = 100;
                p1.State.Needs.Teeth = 100;

                c1.Advance(TimeSpan.FromDays(1));
                // Only one chance of 0.01 per day if we tick just once after 1 day.
                // We tick for 0 timespan to just roll.
                p1.TickHealth(TimeSpan.Zero);
                if (p1.State.Health.Active.Any(a => a.Id == "respiratory")) hitsWithoutMultipliers++;

                // With Multipliers
                var (p2, c2, r2) = Setup();
                p2.State.Health.RandomSeed = new Random(i);
                p2.State.Needs.Mood = 10; // "mood_below_30" -> 3.0
                p2.State.Needs.Energy = 10; // "energy_below_25" -> 2.0
                p2.State.Needs.Cleanliness = 10; // "cleanliness_below_40" -> 2.0

                p2.State.Needs.VitaminC = 100;
                p2.State.Needs.Teeth = 100;

                c2.Advance(TimeSpan.FromDays(1));
                p2.TickHealth(TimeSpan.Zero);
                if (p2.State.Health.Active.Any(a => a.Id == "respiratory")) hitsWithMultipliers++;
            }

            // Due to randomness, just verify the rate is higher
            Assert.True(hitsWithMultipliers > hitsWithoutMultipliers);
        }

        [Fact]
        public void SeverityGrows_ExtraDecayApplies()
        {
            var (pet, clock, rng) = Setup();
            pet.State.Needs.VitaminC = 10;

            // Wait for 24h then roll on day 2
            pet.TickHealth(TimeSpan.FromHours(24));
            clock.Advance(TimeSpan.FromDays(1));

            // Add scurvy, elapsed=0 so severity grows by 0 * rate = 0
            pet.TickHealth(TimeSpan.Zero);

            var scurvy = pet.State.Health.Active.FirstOrDefault(a => a.Id == "scurvy");
            Assert.NotNull(scurvy);

            // Since we use the elapsed time to grow severity, resetting severity to 0 manually to isolate our test
            scurvy.Severity = 0;

            double energyBefore = pet.State.Needs.Energy;

            // Tick 1 day
            clock.Advance(TimeSpan.FromDays(1));
            pet.TickHealth(TimeSpan.FromDays(1));

            // Should be exactly 0.35 because we ticked for 1 day with starting severity 0
            Assert.Equal(0.35, scurvy.Severity, 2);
            Assert.True(pet.State.Needs.Energy < energyBefore); // Extra decay applied
        }

        [Fact]
        public void TreatmentWithCourse3_Needs3DailyDoses_CureNeed()
        {
            var (pet, clock, rng) = Setup();
            pet.State.Needs.VitaminC = 10;
            // Get Scurvy active
            clock.Advance(TimeSpan.FromHours(24));
            pet.TickHealth(TimeSpan.FromHours(24));
            clock.Advance(TimeSpan.FromDays(1));
            pet.TickHealth(TimeSpan.FromHours(1));

            pet.Treat("scurvy");
            var scurvy = pet.State.Health.Active.First();

            Assert.True(scurvy.Treated);
            Assert.Equal(2, scurvy.CourseDaysLeft); // After first dose it should be course_days(3) - 1 = 2

            // Second dose same day shouldn't count
            pet.GiveDose("scurvy");
            Assert.Equal(2, scurvy.CourseDaysLeft);

            // Day 2
            clock.Advance(TimeSpan.FromDays(1));
            pet.GiveDose("scurvy");
            Assert.Equal(1, scurvy.CourseDaysLeft);

            // Day 3
            clock.Advance(TimeSpan.FromDays(1));
            pet.GiveDose("scurvy");
            Assert.Equal(0, scurvy.CourseDaysLeft);

            // Need not satisfied yet
            pet.TickHealth(TimeSpan.FromHours(1));
            Assert.Single(pet.State.Health.Active);

            // Satisfy need
            pet.State.Needs.VitaminC = 70;
            pet.TickHealth(TimeSpan.FromHours(1));
            Assert.Empty(pet.State.Health.Active);
            Assert.Single(pet.State.Health.History);
        }

        [Fact]
        public void Course0Removal()
        {
            var (pet, clock, rng) = Setup();
            pet.State.Needs.Teeth = 10;
            clock.Advance(TimeSpan.FromHours(24));
            pet.TickHealth(TimeSpan.FromHours(24));
            clock.Advance(TimeSpan.FromDays(1));
            pet.TickHealth(TimeSpan.FromHours(1)); // Add dental

            pet.Treat("dental");
            pet.TickHealth(TimeSpan.FromHours(1));

            // Removed right away
            Assert.Empty(pet.State.Health.Active);
        }

        [Fact]
        public void RefusesTreats_WithDental()
        {
            var (pet, clock, rng) = Setup();
            pet.State.Needs.Teeth = 10;
            clock.Advance(TimeSpan.FromHours(24));
            pet.TickHealth(TimeSpan.FromHours(24));
            clock.Advance(TimeSpan.FromDays(1));
            pet.TickHealth(TimeSpan.FromHours(1));

            Assert.True(pet.RefusesTreats);
        }

        [Fact]
        public void HealthPenaltyCap()
        {
            var (pet, clock, rng) = Setup();
            pet.State.Needs.VitaminC = 10;
            pet.State.Needs.Teeth = 10;

            clock.Advance(TimeSpan.FromHours(24));
            pet.TickHealth(TimeSpan.FromHours(24));
            clock.Advance(TimeSpan.FromDays(1));
            pet.TickHealth(TimeSpan.FromHours(24));
            clock.Advance(TimeSpan.FromDays(1));
            pet.TickHealth(TimeSpan.FromHours(24));

            // Advance many days to max out severity
            for(int i=0; i<10; i++)
            {
                clock.Advance(TimeSpan.FromDays(1));
                pet.TickHealth(TimeSpan.FromDays(1));
            }

            Assert.Equal(30, pet.HealthPenalty); // max 30 for 2 conditions max severity (15 * 2). Penalty cap property correctly handles up to 60.
        }

        [Fact]
        public void TummyAche_TriggersAfterNextDayRoll()
        {
            var (pet, clock, rng) = Setup();

            // Initial tick to set LastRollLocalDate to 2023-01-01
            pet.TickHealth(TimeSpan.Zero);

            pet.State.Needs.VitaminC = 100;
            pet.State.Needs.Teeth = 100;

            pet.RecordTreat("carrot");
            pet.RecordTreat("carrot");
            pet.RecordTreat("carrot");
            pet.RecordTreat("carrot"); // 4 treats on 2023-01-01

            // Check that Tummy Ache is not yet active
            var tummy = pet.State.Health.Active.FirstOrDefault(a => a.Id == "tummy_ache");
            Assert.Null(tummy);

            // Advance clock by 11 hours -> 23:00 (still 2023-01-01)
            clock.Advance(TimeSpan.FromHours(11));
            pet.TickHealth(TimeSpan.FromHours(11));

            tummy = pet.State.Health.Active.FirstOrDefault(a => a.Id == "tummy_ache");
            Assert.Null(tummy); // No roll yet

            // Advance by 1 more hour -> 2023-01-02 00:00.
            // The health roll happens NOW! TreatsLocalDate was 2023-01-01, which is "yesterday",
            // so we still have the record of 4 treats yesterday, meaning Tummy Ache triggers.
            clock.Advance(TimeSpan.FromHours(1));
            pet.TickHealth(TimeSpan.FromHours(1));

            tummy = pet.State.Health.Active.FirstOrDefault(a => a.Id == "tummy_ache");
            Assert.NotNull(tummy);
        }

        [Fact]
        public void OldSave_WithoutHealth_Loads()
        {
            string json = @"{ 'Version': 2, 'Name': 'Cuy' }".Replace("'", "\"");
            var state = JsonConvert.DeserializeObject<GameState>(json);
            Assert.NotNull(state.Health);
            Assert.Empty(state.Health.Active);
        }
    }
}
