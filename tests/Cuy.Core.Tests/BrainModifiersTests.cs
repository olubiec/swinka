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
            string? dir = AppContext.BaseDirectory;
            while (dir != null)
            {
                if (File.Exists(Path.Combine(dir, "Cuy.sln")))
                    return Path.Combine(dir, relativePath);
                dir = Path.GetDirectoryName(dir);
            }
            throw new FileNotFoundException($"Cannot find repo root to resolve {relativePath}");
        }

        private static Brain CreateBrain(Random random, Func<PigModifiers>? provider = null)
        {
            string path = RepoFile("assets/data/actions.json");
            var brain = Brain.LoadFromFile(path, random: random);
            if (provider != null)
            {
                brain.ModifiersProvider = provider;
            }
            return brain;
        }

        [Fact]
        public void FixedSeed_NoProvider_EqualsNeutralProviderSequence()
        {
            var brainNoProvider = CreateBrain(new Random(42));
            var brainNeutral = CreateBrain(new Random(42), () => PigModifiers.Neutral);

            var decisionsNoProvider = new List<string>();
            var decisionsNeutral = new List<string>();

            for (int i = 0; i < 200; i++)
            {
                var dec1 = brainNoProvider.DecideNextAction();
                var dec2 = brainNeutral.DecideNextAction();

                decisionsNoProvider.Add(dec1.ActionId);
                decisionsNeutral.Add(dec2.ActionId);

                Assert.Equal(dec1.ActionId, dec2.ActionId);
                Assert.Equal(dec1.Score, dec2.Score, 5);

                brainNoProvider.Update(TimeSpan.FromSeconds(15));
                brainNeutral.Update(TimeSpan.FromSeconds(15));
            }

            Assert.Equal(decisionsNoProvider, decisionsNeutral);
        }

        [Fact]
        public void ActivityMultiplier_ChoosesMoreWalkingActionsOver2000Decisions()
        {
            var brainHigh = CreateBrain(new Random(1234), () => new PigModifiers(activity: 1.5));
            var brainLow = CreateBrain(new Random(1234), () => new PigModifiers(activity: 0.6));

            int walkHigh = 0;
            int walkLow = 0;

            var decHigh = brainHigh.DecideNextAction();
            if (decHigh.ActionId == "walk") walkHigh++;

            var decLow = brainLow.DecideNextAction();
            if (decLow.ActionId == "walk") walkLow++;

            for (int i = 1; i < 2000; i++)
            {
                var durHigh = brainHigh.RemainingDuration > TimeSpan.Zero ? brainHigh.RemainingDuration : TimeSpan.FromSeconds(1);
                brainHigh.Update(durHigh);
                if (brainHigh.CurrentAction.ActionId == "walk")
                    walkHigh++;

                var durLow = brainLow.RemainingDuration > TimeSpan.Zero ? brainLow.RemainingDuration : TimeSpan.FromSeconds(1);
                brainLow.Update(durLow);
                if (brainLow.CurrentAction.ActionId == "walk")
                    walkLow++;
            }

            Assert.True(walkHigh > walkLow,
                $"Expected more walking actions with Activity=1.5 ({walkHigh}) than Activity=0.6 ({walkLow})");
        }

        [Fact]
        public void JoyWeightMultiplier_ChoosesMoreJoyfulActions()
        {
            var brainJoy = CreateBrain(new Random(555), () => new PigModifiers(joyWeight: 1.5));
            var brainNeutral = CreateBrain(new Random(555), () => PigModifiers.Neutral);

            var joyfulIds = new HashSet<string>(StringComparer.OrdinalIgnoreCase)
            {
                "popcorn", "dance", "dancing", "zoomies", "front_happy", "beaming"
            };

            int joyfulCountHigh = 0;
            int joyfulCountNeutral = 0;

            for (int i = 0; i < 200; i++)
            {
                // Set needs where joyful actions compete with other actions (e.g. eating)
                brainJoy.CurrentNeeds.Mood = 80;
                brainJoy.CurrentNeeds.Satiety = 60;
                brainJoy.CurrentNeeds.Energy = 75;

                brainNeutral.CurrentNeeds.Mood = 80;
                brainNeutral.CurrentNeeds.Satiety = 60;
                brainNeutral.CurrentNeeds.Energy = 75;

                var decJoy = brainJoy.DecideNextAction();
                if (joyfulIds.Contains(decJoy.ActionId)) joyfulCountHigh++;

                var decNeutral = brainNeutral.DecideNextAction();
                if (joyfulIds.Contains(decNeutral.ActionId)) joyfulCountNeutral++;

                // Advance by 1 day so daily limits and cooldowns reset for the next decision
                brainJoy.Update(TimeSpan.FromHours(24));
                brainNeutral.Update(TimeSpan.FromHours(24));
            }

            Assert.True(joyfulCountHigh > joyfulCountNeutral,
                $"Expected more joyful actions with JoyWeight=1.5 ({joyfulCountHigh}) than 1.0 ({joyfulCountNeutral})");
        }

        [Fact]
        public void WheekRateMultiplier_RaisesWheekChoicesWhenNeedIsLow()
        {
            var brainHigh = CreateBrain(new Random(777), () => new PigModifiers(wheekRate: 1.5));
            var brainNeutral = CreateBrain(new Random(777), () => PigModifiers.Neutral);

            int wheekHigh = 0;
            int wheekNeutral = 0;

            var decHigh = brainHigh.DecideNextAction();
            if (decHigh.ActionId == "wheeking") wheekHigh++;

            var decNeutral = brainNeutral.DecideNextAction();
            if (decNeutral.ActionId == "wheeking") wheekNeutral++;

            for (int i = 1; i < 2000; i++)
            {
                // Keep satiety low so wheeking is available
                brainHigh.CurrentNeeds.Satiety = 15;
                var durHigh = brainHigh.RemainingDuration > TimeSpan.Zero ? brainHigh.RemainingDuration : TimeSpan.FromSeconds(1);
                brainHigh.Update(durHigh);
                if (brainHigh.CurrentAction.ActionId == "wheeking")
                    wheekHigh++;

                brainNeutral.CurrentNeeds.Satiety = 15;
                var durNeutral = brainNeutral.RemainingDuration > TimeSpan.Zero ? brainNeutral.RemainingDuration : TimeSpan.FromSeconds(1);
                brainNeutral.Update(durNeutral);
                if (brainNeutral.CurrentAction.ActionId == "wheeking")
                    wheekNeutral++;
            }

            Assert.True(wheekHigh > wheekNeutral,
                $"Expected more wheeks with WheekRate=1.5 ({wheekHigh}) than 1.0 ({wheekNeutral})");
        }

        [Fact]
        public void ModifiersProvider_IsReadOnEveryDecision()
        {
            var brain = CreateBrain(new Random(888));

            PigModifiers currentMods = PigModifiers.Neutral;
            brain.ModifiersProvider = () => currentMods;

            var walkScoreNeutral = brain.EvaluateAllActionScores().First(a => a.ActionId == "walk").Score;

            // Change provider output dynamically
            currentMods = new PigModifiers(activity: 1.5);
            var walkScoreHigh = brain.EvaluateAllActionScores().First(a => a.ActionId == "walk").Score;

            Assert.True(walkScoreHigh > walkScoreNeutral,
                $"Score with Activity=1.5 ({walkScoreHigh}) should be greater than neutral ({walkScoreNeutral})");

            currentMods = new PigModifiers(activity: 0.5);
            var walkScoreLow = brain.EvaluateAllActionScores().First(a => a.ActionId == "walk").Score;

            Assert.True(walkScoreLow < walkScoreNeutral,
                $"Score with Activity=0.5 ({walkScoreLow}) should be less than neutral ({walkScoreNeutral})");
        }
    }
}
