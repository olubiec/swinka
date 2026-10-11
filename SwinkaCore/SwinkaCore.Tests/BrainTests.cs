using System;
using System.Collections.Generic;
using SwinkaCore.AI;
using SwinkaCore.Time;
using Xunit;

namespace SwinkaCore.Tests
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
            var walkAction = brain.Config.Actions.Find(a => a.Id == "spacer");
            Assert.NotNull(walkAction);
            Assert.Equal(20, walkAction.CooldownSeconds);

            // Wykonujemy spacer ręcznie lub doprowadzamy do jego wyboru
            // Zasymulujmy wykonanie spaceru o t = 100s
            brain.Update(TimeSpan.FromSeconds(100));
            // Wymuśmy wybór akcji
            var decision = brain.DecideNextAction();

            // Teraz zasymulujmy, że decyzją był spacer i sprawdźmy, że zaraz potem kolejny wybór NIE może być spacerem
            // Ustawmy cooldown dla "spacer" na t + 20s
            var brain2 = Brain.CreateDefault(random: new Random(42));
            // Zmodyfikujmy potrzeby tak, aby humor był niski (sprzyja spacerowi)
            brain2.CurrentNeeds.Mood = 10;
            brain2.CurrentNeeds.Energy = 90;

            bool spacerChosen = false;
            for (int i = 0; i < 50; i++)
            {
                var dec = brain2.DecideNextAction();
                if (dec.ActionId == "spacer")
                {
                    spacerChosen = true;
                    // Następna decyzja natychmiast (przed upływem 20s) nie może być spacerem!
                    var immediateNext = brain2.DecideNextAction();
                    Assert.NotEqual("spacer", immediateNext.ActionId);
                    break;
                }
            }
            Assert.True(spacerChosen, "Spacer powinien zostać wylosowany przy wysokiej energii i potrzebie humoru.");
        }

        [Fact]
        public void DailyLimit_BlocksActionAfterLimitReachedUntilNextDay()
        {
            var brain = Brain.CreateDefault(random: new Random(123));
            var zoomiesAction = brain.Config.Actions.Find(a => a.Id == "zoomies");
            Assert.NotNull(zoomiesAction);
            Assert.Equal(2, zoomiesAction.GetDailyLimit(LifeStage.Adult));

            // Ustawmy wysoki humor i energię pod zoomies
            brain.CurrentNeeds.Mood = 95;
            brain.CurrentNeeds.Energy = 95;

            int zoomiesCountDay0 = 0;
            // Przewińmy 1 dzień (86400 sekund) krokami
            for (int i = 0; i < 2000; i++)
            {
                brain.Update(TimeSpan.FromSeconds(30));
                if (brain.CurrentAction != null && brain.CurrentAction.ActionId == "zoomies")
                {
                    zoomiesCountDay0++;
                }
                if (brain.TotalSimulatedSeconds >= 86400) break;
            }

            // Limit dzienny dla zoomies to 2
            Assert.InRange(zoomiesCountDay0, 1, 2);

            // Następnego dnia limit powinien się zresetować i zoomies znowu może wystąpić
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

            // Wykonujemy 500 kolejnych decyzji
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
                    string.Format("Czynność '{0}' została wybrana {1} razy z rzędu! (Maksymalnie dozwolone: 2)", dec.ActionId, consecutive));
            }
        }

        [Fact]
        public void HungryPig_EatsSignificantlyMoreOftenThanWellFedPig()
        {
            // Świnka najedzona (najedzenie = 95, ząbki = 95) vs świnka głodna (najedzenie = 15, ząbki = 95)
            var wellFedBrain = Brain.CreateDefault(random: new Random(100));
            var hungryBrain = Brain.CreateDefault(random: new Random(100));

            int wellFedEatCount = 0;
            int hungryEatCount = 0;

            for (int i = 0; i < 50; i++)
            {
                // Zapewniamy stały dostęp do siana w paśniku oraz badane poziomy sytości
                wellFedBrain.HayInRack = 100;
                wellFedBrain.CurrentNeeds.Satiety = 95;
                wellFedBrain.CurrentNeeds.Teeth = 95;

                hungryBrain.HayInRack = 100;
                hungryBrain.CurrentNeeds.Satiety = 15;
                hungryBrain.CurrentNeeds.Teeth = 95;

                var decWellFed = wellFedBrain.DecideNextAction();
                var decHungry = hungryBrain.DecideNextAction();

                if (decWellFed.ActionId == "jedzenie_siana") wellFedEatCount++;
                if (decHungry.ActionId == "jedzenie_siana") hungryEatCount++;
            }

            Assert.True(hungryEatCount > wellFedEatCount * 2,
                string.Format("Głodna świnka powinna jeść znacznie częściej (głodna: {0}, najedzona: {1})", hungryEatCount, wellFedEatCount));
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

            // Zasymulujmy upływ 1 sekundy
            brain.Update(TimeSpan.FromSeconds(1));
            var remainingBeforeInterrupt = brain.RemainingDuration;
            Assert.True(remainingBeforeInterrupt < initialRemaining);

            // Zdarzenie fizyki (gracz podnosi świnkę myszką)
            brain.Interrupt("held_by_mouse");
            Assert.True(brain.IsInterrupted);
            Assert.Equal("held_by_mouse", brain.InterruptedReason);

            // W trakcie trwania fizyki czas czynności NIE ubywa
            brain.Update(TimeSpan.FromSeconds(5));
            Assert.Equal(remainingBeforeInterrupt, brain.RemainingDuration);

            // Gracz odkłada świnkę – wznowienie działania mózgu
            var resumedDecision = brain.Resume();
            Assert.False(brain.IsInterrupted);
            Assert.Null(brain.InterruptedReason);
            Assert.NotNull(resumedDecision);
        }

        [Fact]
        public void BudgetReport_DeviationUnderFivePercentagePointsInThreeDaysSimulation()
        {
            var brain = Brain.CreateDefault(random: new Random(555));
            
            // Symulacja 3 dni (72 godziny = 259200 sekund)
            TimeSpan step = TimeSpan.FromSeconds(5);
            int totalSteps = (72 * 3600) / (int)step.TotalSeconds;

            for (int i = 0; i < totalSteps; i++)
            {
                brain.Update(step);
                // Uzupełniajmy siano w paśniku, żeby świnka miała stały dostęp do siana
                if (brain.HayInRack < 30) brain.HayInRack = 100;
            }

            var report = brain.GetBudgetReport(3.0);
            Assert.NotNull(report);
            Assert.True(report.IsAllWithinTolerance,
                "Wszystkie grupy budżetu dnia muszą mieć odchylenie <= 5 punktów procentowych!\n" + report.FormatTable());

            // Sprawdźmy każdą grupę z osobna
            foreach (var group in report.Groups)
            {
                Assert.True(group.IsWithinTolerance,
                    string.Format("Grupa '{0}' przekroczyła tolerancję: odchylenie {1:0.00} p.p. (cel: {2}%, aktualnie: {3:0.00}%)",
                        group.GroupName, group.DeviationPercentagePoints, group.TargetPercentage, group.ActualPercentage));
            }
        }

        [Fact]
        public void UserIdle_UnlocksSleepAtHigherEnergy_ButExtremeHungerTakesPrecedence()
        {
            var brain = Brain.CreateDefault(random: new Random(101));
            // Ustawiamy porę dzienną (14:00), aby test nie był w godzinach nocnych
            brain.Update(TimeSpan.FromHours(14));

            brain.HayInRack = 100;
            brain.CurrentNeeds.Energy = 60; // Domyślnie sen wymaga energia_max <= 35
            brain.CurrentNeeds.Satiety = 80;
            brain.CurrentNeeds.Teeth = 80;

            // Przed bezczynnością - sen powinien być zablokowany z powodu energii > 35
            brain.IsUserIdle = false;
            var scoresBefore = brain.EvaluateAllActionScores();
            var sleepBefore = System.Linq.Enumerable.FirstOrDefault(scoresBefore, a => a.ActionId == "sen");
            Assert.NotNull(sleepBefore);
            Assert.False(sleepBefore.IsAvailable, "Sen nie powinien być dostępny przy energii 60 bez bezczynności.");

            // Po 10 minutach bezczynności - sen zostaje odblokowany
            brain.IsUserIdle = true;
            brain.UserIdleDuration = TimeSpan.FromMinutes(10);
            var scoresAfter = brain.EvaluateAllActionScores();
            var sleepAfter = System.Linq.Enumerable.FirstOrDefault(scoresAfter, a => a.ActionId == "sen");
            Assert.NotNull(sleepAfter);
            Assert.True(sleepAfter.IsAvailable, "Sen powinien być dostępny przy bezczynności użytkownika nawet przy energii 60.");

            // Skrajny głód (satiety = 5, ząbki = 40) - Utility AI powinno nadal przedłożyć jedzenie siana nad sen (nie twarde wymuszenie)
            brain.CurrentNeeds.Satiety = 5;
            brain.CurrentNeeds.Teeth = 40;
            var decision = brain.DecideNextAction();
            Assert.Equal("jedzenie_siana", decision.ActionId);
        }

        [Fact]
        public void NightHours_MultipliesSleepAndDozeWeightByTwo()
        {
            var brain = Brain.CreateDefault(random: new Random(202));
            brain.CurrentNeeds.Energy = 20; // Niska energia, sen i drzemka dostępne
            brain.CurrentNeeds.Satiety = 90;

            // Symulujemy czas nocny: godzina 2:00 w nocy (2 * 3600 = 7200s)
            brain.Update(TimeSpan.FromHours(2));
            Assert.True(brain.CurrentHour >= 23 || brain.CurrentHour < 7, "Powinna być pora nocna (2:00).");

            var nightScores = brain.EvaluateAllActionScores();
            var nightSleep = System.Linq.Enumerable.FirstOrDefault(nightScores, a => a.ActionId == "sen");
            var nightWalk = System.Linq.Enumerable.FirstOrDefault(nightScores, a => a.ActionId == "spacer");
            Assert.NotNull(nightSleep);
            Assert.NotNull(nightWalk);

            // W nocy sen powinien mieć wyższy wynik niż aktywność ruchowa
            Assert.True(nightSleep.Score > nightWalk.Score, "W nocy sen powinien mieć wyższy priorytet niż spacer.");
        }

        [Fact]
        public void Sleeping_RegeneratesEnergy_InAutonomousMode()
        {
            var brain = Brain.CreateDefault(random: new Random(303));
            brain.CurrentNeeds.Energy = 30;

            // Wymuśmy bezczynność i niską sytość na wysokim poziomie, by wylosować sen
            brain.IsUserIdle = true;
            brain.CurrentNeeds.Satiety = 100;
            brain.CurrentNeeds.Mood = 100;

            // Przewijamy czas, aż mózg rozpocznie sen lub drzemkę
            bool startedSleep = false;
            for (int i = 0; i < 20; i++)
            {
                var dec = brain.DecideNextAction();
                if (dec.ActionId == "sen" || dec.ActionId == "drzemka")
                {
                    startedSleep = true;
                    break;
                }
            }
            Assert.True(startedSleep, "Świnka powinna wybrać sen lub drzemkę przy bezczynności i pełnej sytości.");

            double energyBefore = brain.CurrentNeeds.Energy;
            // Upływ 1 godziny w trakcie snu
            brain.Update(TimeSpan.FromHours(1));
            double energyAfter = brain.CurrentNeeds.Energy;

            Assert.True(energyAfter > energyBefore,
                string.Format("Sen powinien regenerować energię w trybie autonomicznym (przed: {0}, po: {1})", energyBefore, energyAfter));
        }
    }
}

