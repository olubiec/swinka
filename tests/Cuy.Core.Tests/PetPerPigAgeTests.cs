using System;
using System.Collections.Generic;
using Cuy.Core;
using Cuy.Core.Pigs;
using Cuy.Core.Time;
using Xunit;

namespace Cuy.Core.Tests
{
    public class PetPerPigAgeTests
    {
        [Fact]
        public void FlagOff_BehavesAsBefore_PetBorn3RealDaysAgoIsJunior()
        {
            var now = new DateTime(2026, 10, 15, 12, 0, 0, DateTimeKind.Utc);
            var clock = new ManualClock(now);
            var birthUtc = now.AddDays(-3);
            var state = GameState.CreateNew("Cuy", birthUtc);
            var balance = Balance.CreateDefault();
            balance.PerPigAgeActive = false;

            var olderPig = new PigProfile("SeniorPig") { BornAtUtc = now.AddDays(-100) };
            state.Roster.Clear();
            state.Roster.Add(olderPig);
            state.ActivePigIds.Clear();
            state.ActivePigIds.Add(olderPig.Id);

            var pet = new Pet(state, clock, balance);
            pet.Start();

            Assert.Equal(LifeStage.Junior, pet.Stage);
            Assert.Equal(3 * balance.PigDaysPerRealDay, pet.Age.PigDays);
        }

        [Fact]
        public void FlagOn_TwoRosterPigs_ShowsStageOfActiveOne_AndSwitchingRaisesStageChangedOnce()
        {
            var now = new DateTime(2026, 10, 15, 12, 0, 0, DateTimeKind.Utc);
            var clock = new ManualClock(now);
            var state = GameState.CreateNew("Cuy", now);
            var balance = Balance.CreateDefault();
            balance.PerPigAgeActive = true;

            var pigJunior = new PigProfile("JuniorPig") { BornAtUtc = now.AddDays(-7) };
            var pigAdult = new PigProfile("AdultPig") { BornAtUtc = now.AddDays(-30) };

            state.Roster.Clear();
            state.Roster.Add(pigJunior);
            state.Roster.Add(pigAdult);
            state.ActivePigIds.Clear();
            state.ActivePigIds.Add(pigJunior.Id);

            var pet = new Pet(state, clock, balance);
            pet.Start();

            Assert.Equal(LifeStage.Junior, pet.Stage);
            Assert.Equal(7 * balance.PigDaysPerRealDay, pet.Age.PigDays);

            int stageChangedCount = 0;
            StageChangedEventArgs? lastEvent = null;
            pet.StageChanged += (s, e) =>
            {
                stageChangedCount++;
                lastEvent = e;
            };

            // Switching ActivePigIds changes Stage and raises StageChanged once
            state.ActivePigIds[0] = pigAdult.Id;

            Assert.Equal(LifeStage.Adult, pet.Stage);
            Assert.Equal(1, stageChangedCount);
            Assert.NotNull(lastEvent);
            Assert.Equal(LifeStage.Junior, lastEvent.OldStage);
            Assert.Equal(LifeStage.Adult, lastEvent.NewStage);
            Assert.Equal(30 * balance.PigDaysPerRealDay, pet.Age.PigDays);

            // Reading Stage again does NOT fire StageChanged again
            Assert.Equal(LifeStage.Adult, pet.Stage);
            Assert.Equal(1, stageChangedCount);

            // Update() does NOT fire StageChanged again when stage is the same
            pet.Update();
            Assert.Equal(1, stageChangedCount);
        }

        [Fact]
        public void SwitchingActivePig_WhenStageIsTheSame_DoesNotRaiseStageChanged()
        {
            var now = new DateTime(2026, 10, 15, 12, 0, 0, DateTimeKind.Utc);
            var clock = new ManualClock(now);
            var state = GameState.CreateNew("Cuy", now);
            var balance = Balance.CreateDefault();
            balance.PerPigAgeActive = true;

            var pigJunior1 = new PigProfile("Junior1") { BornAtUtc = now.AddDays(-3) };
            var pigJunior2 = new PigProfile("Junior2") { BornAtUtc = now.AddDays(-5) };

            state.Roster.Clear();
            state.Roster.Add(pigJunior1);
            state.Roster.Add(pigJunior2);
            state.ActivePigIds.Clear();
            state.ActivePigIds.Add(pigJunior1.Id);

            var pet = new Pet(state, clock, balance);
            pet.Start();

            Assert.Equal(LifeStage.Junior, pet.Stage);

            int stageChangedCount = 0;
            pet.StageChanged += (s, e) => stageChangedCount++;

            state.ActivePigIds[0] = pigJunior2.Id;

            Assert.Equal(LifeStage.Junior, pet.Stage);
            Assert.Equal(0, stageChangedCount);
        }

        [Fact]
        public void FlagOn_MemorialLeadPig_IsLegend()
        {
            var now = new DateTime(2026, 10, 15, 12, 0, 0, DateTimeKind.Utc);
            var clock = new ManualClock(now);
            var state = GameState.CreateNew("Cuy", now);
            var balance = Balance.CreateDefault();
            balance.PerPigAgeActive = true;

            var memorialPig = new PigProfile("MemorialPig")
            {
                BornAtUtc = now.AddDays(-1),
                Memorial = true
            };

            state.Roster.Clear();
            state.Roster.Add(memorialPig);
            state.ActivePigIds.Clear();
            state.ActivePigIds.Add(memorialPig.Id);

            var pet = new Pet(state, clock, balance);
            pet.Start();

            Assert.Equal(LifeStage.Legend, pet.Stage);
        }

        [Fact]
        public void FlagOn_LegendAtYears_CustomThresholds()
        {
            var now = new DateTime(2026, 10, 15, 12, 0, 0, DateTimeKind.Utc);
            var clock = new ManualClock(now);
            var state = GameState.CreateNew("Cuy", now);
            var balance = Balance.CreateDefault();
            balance.PerPigAgeActive = true;

            var bornUtc = PigLife.BornAtFor(now, 6.0, balance.PigDaysPerRealDay);

            var pig6 = new PigProfile("Pig6")
            {
                BornAtUtc = bornUtc,
                LegendAtYears = 6.0
            };

            var pig95 = new PigProfile("Pig95")
            {
                BornAtUtc = bornUtc,
                LegendAtYears = 9.5
            };

            state.Roster.Clear();
            state.Roster.Add(pig6);
            state.Roster.Add(pig95);
            state.ActivePigIds.Clear();
            state.ActivePigIds.Add(pig6.Id);

            var pet = new Pet(state, clock, balance);
            pet.Start();

            Assert.Equal(LifeStage.Legend, pet.Stage);

            state.ActivePigIds[0] = pig95.Id;
            Assert.Equal(LifeStage.Senior, pet.Stage);
        }

        [Fact]
        public void FlagOn_PigWithoutBornAtUtc_FallsBackToGameBirthDate()
        {
            var now = new DateTime(2026, 10, 15, 12, 0, 0, DateTimeKind.Utc);
            var clock = new ManualClock(now);
            var gameBirthUtc = now.AddDays(-3);
            var state = GameState.CreateNew("Cuy", gameBirthUtc);
            var balance = Balance.CreateDefault();
            balance.PerPigAgeActive = true;

            var pigWithoutBirth = new PigProfile("NoBirthPig")
            {
                BornAtUtc = null
            };

            state.Roster.Clear();
            state.Roster.Add(pigWithoutBirth);
            state.ActivePigIds.Clear();
            state.ActivePigIds.Add(pigWithoutBirth.Id);

            var pet = new Pet(state, clock, balance);
            pet.Start();

            Assert.Equal(LifeStage.Junior, pet.Stage);
            Assert.Equal(3 * balance.PigDaysPerRealDay, pet.Age.PigDays);
        }

        [Fact]
        public void FlagOn_NoLeadPigFound_FallsBackToGameBirthDate()
        {
            var now = new DateTime(2026, 10, 15, 12, 0, 0, DateTimeKind.Utc);
            var clock = new ManualClock(now);
            var gameBirthUtc = now.AddDays(-3);
            var state = GameState.CreateNew("Cuy", gameBirthUtc);
            var balance = Balance.CreateDefault();
            balance.PerPigAgeActive = true;

            state.Roster.Clear();
            state.ActivePigIds.Clear();

            var pet = new Pet(state, clock, balance);
            pet.Start();

            Assert.Equal(LifeStage.Junior, pet.Stage);
            Assert.Equal(3 * balance.PigDaysPerRealDay, pet.Age.PigDays);
        }
    }
}
