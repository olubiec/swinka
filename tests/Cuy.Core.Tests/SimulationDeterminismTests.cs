using System;
using Cuy.Core;
using Cuy.Core.AI;
using Cuy.Core.Time;
using Xunit;

namespace Cuy.Core.Tests
{
    public class SimulationDeterminismTests
    {
        private sealed class SimulationResult
        {
            public double Fullness { get; set; }
            public double VitaminC { get; set; }
            public double Energy { get; set; }
            public double Mood { get; set; }
            public double Cleanliness { get; set; }
            public double Teeth { get; set; }
            public int BondLevel { get; set; }
            public int BondPoints { get; set; }
            public int Clovers { get; set; }
            public LifeStage Stage { get; set; }
            public double HayRack { get; set; }
            public string BudgetReportTable { get; set; } = string.Empty;
        }

        private static SimulationResult RunSimulation(int seed, int days = 30)
        {
            var startUtc = new DateTime(2026, 1, 1, 8, 0, 0, DateTimeKind.Utc);
            var clock = new ManualClock(startUtc);
            var balance = Balance.CreateDefault();
            balance.HayRackActive = true;
            balance.DiaryActive = true;
            balance.BirthdayRewardsActive = true;

            var state = GameState.CreateNew("Cuy", startUtc);
            state.HayRack = 100;
            var pet = new Pet(state, clock, balance);
            pet.ApplyNewGameEconomy();
            pet.Start();

            var rng = new Random(seed);
            var brain = Brain.CreateDefault(pet, rng);

            int totalMinutes = days * 24 * 60;
            for (int minute = 1; minute <= totalMinutes; minute++)
            {
                var before = clock.LocalNow();
                clock.Advance(TimeSpan.FromMinutes(1));
                var now = clock.LocalNow();

                if (brain.HayInRack < 30) brain.HayInRack = 100;

                for (int step = 0; step < 12; step++)
                {
                    brain.Update(TimeSpan.FromSeconds(5));
                }

                bool isNight = before.Hour >= 23 || before.Hour < 7;
                pet.IsSleeping = (brain.CurrentAction != null && 
                    (brain.CurrentAction.ActionId == "sleep" || brain.CurrentAction.ActionId == "nap")) 
                    || isNight;

                pet.Update();

                // Periodic care routine matching simulator Care logic
                if (now.Minute == 0 && !pet.IsSleeping)
                {
                    int h = now.Hour;
                    if (h % 2 == 0)
                    {
                        pet.ChangeNeed(Need.Satiety, 20);
                        pet.ChangeNeed(Need.Teeth, 6);
                        pet.AddClovers(2);
                        pet.AddBondPoints(3);
                        pet.Count("hay");
                    }
                    if (h == 10 || h == 16)
                    {
                        pet.ChangeNeed(Need.VitaminC, 35);
                        pet.ChangeNeed(Need.Satiety, 8);
                        pet.ChangeNeed(Need.Mood, 5);
                        pet.AddClovers(2);
                        pet.AddBondPoints(3);
                        pet.Count("bell_pepper");
                    }
                    pet.ChangeNeed(Need.Mood, 6);
                    pet.AddBondPoints(2);
                    pet.Count("pets");
                }
            }

            var report = brain.GetBudgetReport(days);
            return new SimulationResult
            {
                Fullness = pet.Needs.Satiety,
                VitaminC = pet.Needs.VitaminC,
                Energy = pet.Needs.Energy,
                Mood = pet.Needs.Mood,
                Cleanliness = pet.Needs.Cleanliness,
                Teeth = pet.Needs.Teeth,
                BondLevel = pet.State.Bond.Level,
                BondPoints = pet.State.Bond.Points,
                Clovers = pet.State.Clovers,
                Stage = pet.Stage,
                HayRack = pet.State.HayRack,
                BudgetReportTable = report.FormatTable()
            };
        }

        [Fact]
        public void Simulation_30Days_SameSeed_ProducesIdenticalOutcomes()
        {
            const int seed = 42;
            var run1 = RunSimulation(seed, days: 30);
            var run2 = RunSimulation(seed, days: 30);

            Assert.Equal(run1.Fullness, run2.Fullness, precision: 6);
            Assert.Equal(run1.VitaminC, run2.VitaminC, precision: 6);
            Assert.Equal(run1.Energy, run2.Energy, precision: 6);
            Assert.Equal(run1.Mood, run2.Mood, precision: 6);
            Assert.Equal(run1.Cleanliness, run2.Cleanliness, precision: 6);
            Assert.Equal(run1.Teeth, run2.Teeth, precision: 6);
            Assert.Equal(run1.BondLevel, run2.BondLevel);
            Assert.Equal(run1.BondPoints, run2.BondPoints);
            Assert.Equal(run1.Clovers, run2.Clovers);
            Assert.Equal(run1.Stage, run2.Stage);
            Assert.Equal(run1.HayRack, run2.HayRack, precision: 6);
            Assert.Equal(run1.BudgetReportTable, run2.BudgetReportTable);
        }
    }
}
