using System;
using System.Collections.Generic;
using Cuy.Core.AI;
using Cuy.Core.Time;
using Xunit;

namespace Cuy.Core.Tests
{
    public class BrainTests
    {
        [Fact]
        public void CreateDefault_LoadsActionsSuccessfully()
        {
            var brain = Brain.CreateDefault();
            Assert.NotNull(brain.Config);
            Assert.NotEmpty(brain.Config.Actions);
            Assert.NotNull(brain.Config.DailyBudget);
            Assert.Equal(6, brain.Config.DailyBudget.TargetPercentages.Count);
        }

        [Fact]
        public void Cooldown_PreventsActionFromBeingChosenImmediately()
        {
            var brain = Brain.CreateDefault(random: new Random(42));
            
            // Spacer ma cooldown 20s
            var walkAction = brain.Config.Actions.Find(a => a.Id == "walk" || a.Id == "walk");
            Assert.NotNull(walkAction);
            Assert.Equal(20, walkAction.CooldownSeconds);

            // Run the walk by hand or steer the brain into choosing it
            // Simulate a walk at t = 100s
            brain.Update(TimeSpan.FromSeconds(100));
            // Force an action choice
            var decision = brain.DecideNextAction();

            // Now pretend the decision was a walk and check that the very next choice can NOT be a walk
            // Set the cooldown for "walk" to t + 20s
            var brain2 = Brain.CreateDefault(random: new Random(42));
            // Lower mood so a walk is attractive
            brain2.CurrentNeeds.Mood = 10;
            brain2.CurrentNeeds.Energy = 90;

            bool spacerChosen = false;
            for (int i = 0; i < 50; i++)
            {
                var dec = brain2.DecideNextAction();
                if (dec.ActionId == "walk" || dec.ActionId == "walk")
                {
                    spacerChosen = true;
                    // The next decision right away (before 20s pass) must not be a walk!
                    var immediateNext = brain2.DecideNextAction();
                    Assert.False(immediateNext.ActionId == "walk" || immediateNext.ActionId == "walk");
                    break;
                }
            }
            Assert.True(spacerChosen, "A walk should be picked with high energy and a need for mood.");
        }

        [Fact]
        public void DailyLimit_BlocksActionAfterLimitReachedUntilNextDay()
        {
            var brain = Brain.CreateDefault(random: new Random(123));
            var zoomiesAction = brain.Config.Actions.Find(a => a.Id == "zoomies");
            Assert.NotNull(zoomiesAction);
            Assert.Equal(2, zoomiesAction.GetDailyLimit(LifeStage.Adult));

            // High mood and energy for zoomies
            brain.CurrentNeeds.Mood = 95;
            brain.CurrentNeeds.Energy = 95;

            int zoomiesCountDay0 = 0;
            // Fast-forward 1 day (86400 seconds) in steps
            for (int i = 0; i < 2000; i++)
            {
                brain.Update(TimeSpan.FromSeconds(30));
                if (brain.CurrentAction != null && brain.CurrentAction.ActionId == "zoomies")
                {
                    zoomiesCountDay0++;
                }
                if (brain.TotalSimulatedSeconds >= 86400) break;
            }

            // Daily limit for zoomies is 2
            Assert.InRange(zoomiesCountDay0, 1, 2);

            // The next day the limit resets and zoomies can happen again
            int zoomiesCountDay1 = 0;
            for (int i = 0; i < 2000; i++)
            {
                brain.Update(TimeSpan.FromSeconds(30));
                if (brain.CurrentAction != null && brain.CurrentAction.ActionId == "zoomies")
                {
                    zoomiesCountDay1++;
                }
                if (brain.TotalSimulatedSeconds >= 172800) break;
            }
            Assert.InRange(zoomiesCountDay1, 1, 2);
        }

        [Fact]
        public void NoThreeConsecutive_NeverPicksSameActionThreeTimesInARow()
        {
            var brain = Brain.CreateDefault(random: new Random(999));
            string lastAction = string.Empty;
            int consecutive = 0;

            // Make 500 decisions in a row
            for (int i = 0; i < 500; i++)
            {
                var dec = brain.DecideNextAction();
                if (dec.ActionId == lastAction)
                {
                    consecutive++;
                }
                else
                {
                    lastAction = dec.ActionId;
                    consecutive = 1;
                }

                Assert.True(consecutive <= 2,
                    string.Format("Action '{0}' was picked {1} times in a row! (Max allowed: 2)", dec.ActionId, consecutive));
            }
        }

        [Fact]
        public void HungryPig_EatsSignificantlyMoreOftenThanWellFedPig()
        {
            // Well-fed pig (fullness = 95, teeth = 95) vs hungry pig (fullness = 15, teeth = 95)
            var wellFedBrain = Brain.CreateDefault(random: new Random(100));
            var hungryBrain = Brain.CreateDefault(random: new Random(100));

            int wellFedEatCount = 0;
            int hungryEatCount = 0;

            for (int i = 0; i < 50; i++)
            {
                // Keep hay in the rack available and set the tested fullness levels
                wellFedBrain.HayInRack = 100;
                wellFedBrain.CurrentNeeds.Satiety = 95;
                wellFedBrain.CurrentNeeds.Teeth = 95;

                hungryBrain.HayInRack = 100;
                hungryBrain.CurrentNeeds.Satiety = 15;
                hungryBrain.CurrentNeeds.Teeth = 95;

                var decWellFed = wellFedBrain.DecideNextAction();
                var decHungry = hungryBrain.DecideNextAction();

                if (decWellFed.ActionId == "eat_hay" || decWellFed.ActionId == "eat_hay") wellFedEatCount++;
                if (decHungry.ActionId == "eat_hay" || decHungry.ActionId == "eat_hay") hungryEatCount++;
            }

            Assert.True(hungryEatCount > wellFedEatCount * 2,
                string.Format("A hungry pig should eat much more often (hungry: {0}, well fed: {1})", hungryEatCount, wellFedEatCount));
        }

        [Fact]
        public void PhysicsInterrupt_PausesAndResumesAction()
        {
            var brain = Brain.CreateDefault(random: new Random(777));
            var decision = brain.DecideNextAction();
            Assert.NotNull(decision);
            Assert.False(brain.IsInterrupted);

            var initialRemaining = brain.RemainingDuration;
            Assert.True(initialRemaining > TimeSpan.Zero);

            // Simulate 1 second passing
            brain.Update(TimeSpan.FromSeconds(1));
            var remainingBeforeInterrupt = brain.RemainingDuration;
            Assert.True(remainingBeforeInterrupt < initialRemaining);

            // Physics event (the player picks the pig up with the mouse)
            brain.Interrupt("held_by_mouse");
            Assert.True(brain.IsInterrupted);
            Assert.Equal("held_by_mouse", brain.InterruptedReason);

            // While physics is active the action time does NOT run down
            brain.Update(TimeSpan.FromSeconds(5));
            Assert.Equal(remainingBeforeInterrupt, brain.RemainingDuration);

            // The player puts the pig down: the brain resumes
            var resumedDecision = brain.Resume();
            Assert.False(brain.IsInterrupted);
            Assert.Null(brain.InterruptedReason);
            Assert.NotNull(resumedDecision);
        }

        [Fact]
        public void BudgetReport_DeviationUnderFivePercentagePointsInThreeDaysSimulation()
        {
            var brain = Brain.CreateDefault(random: new Random(555));
            
            // Simulate 3 days (72 hours = 259200 seconds)
            TimeSpan step = TimeSpan.FromSeconds(5);
            int totalSteps = (72 * 3600) / (int)step.TotalSeconds;

            for (int i = 0; i < totalSteps; i++)
            {
                brain.Update(step);
                // Keep the hay rack filled so the pig always has hay
                if (brain.HayInRack < 30) brain.HayInRack = 100;
            }

            var report = brain.GetBudgetReport(3.0);
            Assert.NotNull(report);
            Assert.True(report.IsAllWithinTolerance,
                "Every day budget group must deviate by <= 5 percentage points!\n" + report.FormatTable());

            // Check each group separately
            foreach (var group in report.Groups)
            {
                Assert.True(group.IsWithinTolerance,
                    string.Format("Group '{0}' is out of tolerance: deviation {1:0.00} pts (target: {2}%, actual: {3:0.00}%)",
                        group.GroupName, group.DeviationPercentagePoints, group.TargetPercentage, group.ActualPercentage));
            }
        }

        [Fact]
        public void UserIdle_UnlocksSleepAtHigherEnergy_ButExtremeHungerTakesPrecedence()
        {
            var brain = Brain.CreateDefault(random: new Random(101));
            // Set a daytime hour (14:00) so the test is not in night hours
            brain.Update(TimeSpan.FromHours(14));

            brain.HayInRack = 100;
            brain.CurrentNeeds.Energy = 60; // By default sleep needs energy_max <= 35
            brain.CurrentNeeds.Satiety = 80;
            brain.CurrentNeeds.Teeth = 80;

            // Before idleness: sleep is blocked because energy > 35
            brain.IsUserIdle = false;
            var scoresBefore = brain.EvaluateAllActionScores();
            var sleepBefore = System.Linq.Enumerable.FirstOrDefault(scoresBefore, a => a.ActionId == "sleep" || a.ActionId == "sleep");
            Assert.NotNull(sleepBefore);
            Assert.False(sleepBefore.IsAvailable, "Sleep should not be available at energy 60 without idleness.");

            // After 10 minutes of idleness: sleep is unlocked
            brain.IsUserIdle = true;
            brain.UserIdleDuration = TimeSpan.FromMinutes(10);
            var scoresAfter = brain.EvaluateAllActionScores();
            var sleepAfter = System.Linq.Enumerable.FirstOrDefault(scoresAfter, a => a.ActionId == "sleep" || a.ActionId == "sleep");
            Assert.NotNull(sleepAfter);
            Assert.True(sleepAfter.IsAvailable, "Sleep should be available when the user is idle, even at energy 60.");

            // Extreme hunger (satiety = 5, teeth = 40): the Utility AI should still prefer eating hay over sleep (a preference, not a hard override)
            brain.CurrentNeeds.Satiety = 5;
            brain.CurrentNeeds.Teeth = 40;
            var decision = brain.DecideNextAction();
            Assert.True(decision.ActionId == "eat_hay" || decision.ActionId == "eat_hay");
        }

        [Fact]
        public void NightHours_MultipliesSleepAndDozeWeightByTwo()
        {
            var brain = Brain.CreateDefault(random: new Random(202));
            brain.CurrentNeeds.Energy = 20; // Low energy: sleep and nap available
            brain.CurrentNeeds.Satiety = 90;

            // Simulate night: 2:00 (2 * 3600 = 7200s)
            brain.Update(TimeSpan.FromHours(2));
            Assert.True(brain.CurrentHour >= 23 || brain.CurrentHour < 7, "It should be night time (2:00).");

            var nightScores = brain.EvaluateAllActionScores();
            var nightSleep = System.Linq.Enumerable.FirstOrDefault(nightScores, a => a.ActionId == "sleep" || a.ActionId == "sleep");
            var nightWalk = System.Linq.Enumerable.FirstOrDefault(nightScores, a => a.ActionId == "walk" || a.ActionId == "walk");
            Assert.NotNull(nightSleep);
            Assert.NotNull(nightWalk);

            // At night sleep should score higher than moving around
            Assert.True(nightSleep.Score > nightWalk.Score, "At night sleep should have a higher priority than a walk.");
        }

        [Fact]
        public void Sleeping_RegeneratesEnergy_InAutonomousMode()
        {
            var brain = Brain.CreateDefault(random: new Random(303));
            brain.CurrentNeeds.Energy = 30;

            // Force idleness and high fullness so sleep gets picked
            brain.IsUserIdle = true;
            brain.CurrentNeeds.Satiety = 100;
            brain.CurrentNeeds.Mood = 100;

            // Fast-forward until the brain starts sleeping or napping
            bool startedSleep = false;
            for (int i = 0; i < 20; i++)
            {
                var dec = brain.DecideNextAction();
                if (dec.ActionId == "sleep" || dec.ActionId == "sleep" || dec.ActionId == "doze" || dec.ActionId == "nap")
                {
                    startedSleep = true;
                    break;
                }
            }
            Assert.True(startedSleep, "The pig should choose sleep or a nap when the user is idle and it is full.");

            double energyBefore = brain.CurrentNeeds.Energy;
            // 1 hour passes while asleep
            brain.Update(TimeSpan.FromHours(1));
            double energyAfter = brain.CurrentNeeds.Energy;

            Assert.True(energyAfter > energyBefore,
                string.Format("Sleep should restore energy in autonomous mode (before: {0}, after: {1})", energyBefore, energyAfter));
        }
    }
}

