using System;
using System.Collections.Generic;
using System.IO;
using System.Linq;
using Cuy.Core.AI;
using Cuy.Core.Pigs;
using Xunit;

namespace Cuy.Core.Tests
{
    public class BrainModifiersTests
    {
        private static string RepoFile(string relativePath)
        {
            var dir = AppContext.BaseDirectory;
            while (dir != null && !File.Exists(Path.Combine(dir, "Cuy.sln")))
            {
                dir = Directory.GetParent(dir)?.FullName;
            }
            if (dir == null)
            {
                throw new InvalidOperationException("Could not find Cuy.sln repository root.");
            }
            return Path.Combine(dir, relativePath);
        }

        private static Brain CreateBrain(Random random)
        {
            string actionsPath = RepoFile("assets/data/actions.json");
            return Brain.LoadFromFile(actionsPath, pet: null, random: random);
        }

        [Fact]
        public void NoProvider_EqualsNeutralProvider_WithSameSeed()
        {
            var brainNoProvider = CreateBrain(new Random(42));
            var brainNeutral = CreateBrain(new Random(42));
            brainNeutral.ModifiersProvider = () => PigModifiers.Neutral;

            for (int i = 0; i < 100; i++)
            {
                var d1 = brainNoProvider.DecideNextAction();
                var d2 = brainNeutral.DecideNextAction();

                Assert.Equal(d1.ActionId, d2.ActionId);
                Assert.Equal(d1.Score, d2.Score, precision: 6);

                brainNoProvider.Update(d1.Duration);
                brainNeutral.Update(d2.Duration);
            }
        }

        [Fact]
        public void ActivityMultiplier_PicksMoreWalkingActionsOver2000Decisions()
        {
            var brainHigh = CreateBrain(new Random(123));
            brainHigh.ModifiersProvider = () => new PigModifiers(activity: 1.5);

            var brainLow = CreateBrain(new Random(123));
            brainLow.ModifiersProvider = () => new PigModifiers(activity: 0.6);

            int highWalks = 0;
            int lowWalks = 0;

            for (int i = 0; i < 2000; i++)
            {
                // Active state with room for mood improvement
                brainHigh.CurrentNeeds.Energy = 90;
                brainHigh.CurrentNeeds.Mood = 30;
                brainHigh.CurrentNeeds.Satiety = 80;
                brainHigh.HayInRack = 100;

                brainLow.CurrentNeeds.Energy = 90;
                brainLow.CurrentNeeds.Mood = 30;
                brainLow.CurrentNeeds.Satiety = 80;
                brainLow.HayInRack = 100;

                brainHigh.Update(TimeSpan.FromSeconds(30));
                if (brainHigh.CurrentAction?.ActionId == "walk") highWalks++;

                brainLow.Update(TimeSpan.FromSeconds(30));
                if (brainLow.CurrentAction?.ActionId == "walk") lowWalks++;
            }

            Assert.True(highWalks > lowWalks, $"High activity walking decisions ({highWalks}) should exceed low activity ({lowWalks}).");
        }

        [Fact]
        public void JoyWeightMultiplier_PicksJoyfulActionsMoreOften()
        {
            var joyfulIds = new HashSet<string>(StringComparer.OrdinalIgnoreCase) { "popcorn", "dancing", "zoomies", "beaming" };

            var brainHigh = CreateBrain(new Random(456));
            brainHigh.ModifiersProvider = () => new PigModifiers(joyWeight: 1.5);

            var brainNeutral = CreateBrain(new Random(456));
            brainNeutral.ModifiersProvider = () => new PigModifiers(joyWeight: 1.0);

            int highJoyful = 0;
            int neutralJoyful = 0;

            for (int i = 0; i < 2000; i++)
            {
                // Maintain high mood and energy so joyful actions remain available
                brainHigh.CurrentNeeds.Mood = 95;
                brainHigh.CurrentNeeds.Energy = 90;
                brainNeutral.CurrentNeeds.Mood = 95;
                brainNeutral.CurrentNeeds.Energy = 90;

                var dHigh = brainHigh.DecideNextAction();
                if (joyfulIds.Contains(dHigh.ActionId)) highJoyful++;
                brainHigh.Update(dHigh.Duration + TimeSpan.FromMinutes(30));

                var dNeutral = brainNeutral.DecideNextAction();
                if (joyfulIds.Contains(dNeutral.ActionId)) neutralJoyful++;
                brainNeutral.Update(dNeutral.Duration + TimeSpan.FromMinutes(30));
            }

            Assert.True(highJoyful > neutralJoyful, $"High JoyWeight joyful count ({highJoyful}) should exceed neutral ({neutralJoyful}).");
        }

        [Fact]
        public void WheekRateMultiplier_RaisesWheekChoicesWhenNeedIsLow()
        {
            var brainHigh = CreateBrain(new Random(789));
            brainHigh.ModifiersProvider = () => new PigModifiers(wheekRate: 1.5);

            var brainLow = CreateBrain(new Random(789));
            brainLow.ModifiersProvider = () => new PigModifiers(wheekRate: 1.0);

            // Empty hay so hunger triggers wheeking rather than eating hay
            brainHigh.HayInRack = 0;
            brainLow.HayInRack = 0;

            // In EvaluateAllActionScores: wheeking score is directly higher
            brainHigh.CurrentNeeds.Satiety = 10;
            brainLow.CurrentNeeds.Satiety = 10;
            var highScores = brainHigh.EvaluateAllActionScores();
            var lowScores = brainLow.EvaluateAllActionScores();

            var wheekHigh = highScores.First(a => a.ActionId == "wheeking");
            var wheekLow = lowScores.First(a => a.ActionId == "wheeking");

            Assert.True(wheekHigh.IsAvailable, "Wheeking should be available when satiety is low.");
            Assert.True(wheekLow.IsAvailable, "Wheeking should be available when satiety is low.");
            Assert.True(wheekHigh.Score > wheekLow.Score, $"Wheek score with 1.5 ({wheekHigh.Score}) should exceed 1.0 ({wheekLow.Score}).");
        }

        [Fact]
        public void ModifiersProvider_IsReadOnEveryDecision_AndChangesBehaviour()
        {
            var brain = CreateBrain(new Random(101));
            var currentMods = PigModifiers.Neutral;
            int providerCalls = 0;

            brain.ModifiersProvider = () =>
            {
                providerCalls++;
                return currentMods;
            };

            var d1 = brain.DecideNextAction();
            int callsAfterFirst = providerCalls;
            Assert.True(callsAfterFirst > 0, "Provider should be called during decision.");

            var d2 = brain.DecideNextAction();
            Assert.True(providerCalls > callsAfterFirst, "Provider should be called again on subsequent decision.");

            // Changing returned modifier changes evaluated score
            currentMods = new PigModifiers(activity: 0.1);
            var scoresLow = brain.EvaluateAllActionScores();
            var walkLow = scoresLow.First(a => a.ActionId == "walk").Score;

            currentMods = new PigModifiers(activity: 2.0);
            var scoresHigh = brain.EvaluateAllActionScores();
            var walkHigh = scoresHigh.First(a => a.ActionId == "walk").Score;

            Assert.True(walkHigh > walkLow, $"High activity score ({walkHigh}) should be greater than low activity score ({walkLow}).");
        }
    }
}
