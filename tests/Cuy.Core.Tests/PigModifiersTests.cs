using System;
using System.Collections.Generic;
using Cuy.Core.Pigs;
using Xunit;

namespace Cuy.Core.Tests
{
    public class PigModifiersTests
    {
        [Fact]
        public void Neutral_HasAllPropertiesSetToOne()
        {
            var neutral = PigModifiers.Neutral;
            Assert.Equal(1.0, neutral.Appetite);
            Assert.Equal(1.0, neutral.PoopRate);
            Assert.Equal(1.0, neutral.Activity);
            Assert.Equal(1.0, neutral.BondGain);
            Assert.Equal(1.0, neutral.MinigameScore);
            Assert.Equal(1.0, neutral.WheekRate);
            Assert.Equal(1.0, neutral.Startle);
            Assert.Equal(1.0, neutral.JoyWeight);
        }

        [Fact]
        public void FromDictionary_WithOnlyAppetite_LeavesRestAtOne()
        {
            var dict = new Dictionary<string, double>
            {
                { "appetite", 1.3 }
            };

            var mods = PigModifiers.FromDictionary(dict);

            Assert.Equal(1.3, mods.Appetite);
            Assert.Equal(1.0, mods.PoopRate);
            Assert.Equal(1.0, mods.Activity);
            Assert.Equal(1.0, mods.BondGain);
            Assert.Equal(1.0, mods.MinigameScore);
            Assert.Equal(1.0, mods.WheekRate);
            Assert.Equal(1.0, mods.Startle);
            Assert.Equal(1.0, mods.JoyWeight);
        }

        [Fact]
        public void FromDictionary_UnknownKeysAreIgnored()
        {
            var dict = new Dictionary<string, double>
            {
                { "unknown_multiplier", 99.0 },
                { "another_random_key", 0.123 },
                { "activity", 1.2 }
            };

            var mods = PigModifiers.FromDictionary(dict);

            Assert.Equal(1.2, mods.Activity);
            Assert.Equal(1.0, mods.Appetite);
            Assert.Equal(1.0, mods.PoopRate);
            Assert.Equal(1.0, mods.BondGain);
            Assert.Equal(1.0, mods.MinigameScore);
            Assert.Equal(1.0, mods.WheekRate);
            Assert.Equal(1.0, mods.Startle);
            Assert.Equal(1.0, mods.JoyWeight);
        }

        [Fact]
        public void FromDictionary_InvalidValues_BecomeOne()
        {
            var dict = new Dictionary<string, double>
            {
                { "appetite", 0.0 },
                { "poop_rate", -1.0 },
                { "activity", double.NaN },
                { "bond_gain", double.PositiveInfinity },
                { "minigame_score", double.NegativeInfinity },
                { "wheek_rate", -0.0001 }
            };

            var mods = PigModifiers.FromDictionary(dict);

            Assert.Equal(1.0, mods.Appetite);
            Assert.Equal(1.0, mods.PoopRate);
            Assert.Equal(1.0, mods.Activity);
            Assert.Equal(1.0, mods.BondGain);
            Assert.Equal(1.0, mods.MinigameScore);
            Assert.Equal(1.0, mods.WheekRate);
            Assert.Equal(1.0, mods.Startle);
            Assert.Equal(1.0, mods.JoyWeight);
        }

        [Fact]
        public void FromDictionary_Null_ReturnsNeutral()
        {
            var mods = PigModifiers.FromDictionary(null);
            Assert.Equal(PigModifiers.Neutral, mods);
        }

        [Fact]
        public void Average_NedAndGlen_AveragesToOne()
        {
            // Ned (appetite 1.3), Glen (appetite 0.7)
            var ned = new PigModifiers(appetite: 1.3);
            var glen = new PigModifiers(appetite: 0.7);

            var avg = PigModifiers.Average(new[] { ned, glen });

            Assert.Equal(1.0, avg.Appetite, 5);
            Assert.Equal(1.0, avg.PoopRate, 5);
            Assert.Equal(1.0, avg.Activity, 5);
            Assert.Equal(1.0, avg.BondGain, 5);
            Assert.Equal(1.0, avg.MinigameScore, 5);
            Assert.Equal(1.0, avg.WheekRate, 5);
            Assert.Equal(1.0, avg.Startle, 5);
            Assert.Equal(1.0, avg.JoyWeight, 5);
        }

        [Fact]
        public void Average_SingleItem_EqualsTheItem()
        {
            var item = new PigModifiers(1.2, 0.8, 1.1, 0.9, 1.5, 0.5, 1.3, 0.7);
            var avg = PigModifiers.Average(new[] { item });

            Assert.Equal(item.Appetite, avg.Appetite);
            Assert.Equal(item.PoopRate, avg.PoopRate);
            Assert.Equal(item.Activity, avg.Activity);
            Assert.Equal(item.BondGain, avg.BondGain);
            Assert.Equal(item.MinigameScore, avg.MinigameScore);
            Assert.Equal(item.WheekRate, avg.WheekRate);
            Assert.Equal(item.Startle, avg.Startle);
            Assert.Equal(item.JoyWeight, avg.JoyWeight);
        }

        [Fact]
        public void Average_EmptyListAndNull_GivesNeutral()
        {
            Assert.Equal(PigModifiers.Neutral, PigModifiers.Average(new List<PigModifiers>()));
            Assert.Equal(PigModifiers.Neutral, PigModifiers.Average(null));
        }

        [Fact]
        public void Clamp_LimitsRangeCorrectly()
        {
            var mods = new PigModifiers(
                appetite: 2.0,
                poopRate: 0.2,
                activity: 1.0,
                bondGain: 0.5,
                minigameScore: 1.5,
                wheekRate: 3.0,
                startle: 0.0,
                joyWeight: 1.2
            );

            var clamped = mods.Clamp(0.5, 1.5);

            Assert.Equal(1.5, clamped.Appetite);
            Assert.Equal(0.5, clamped.PoopRate);
            Assert.Equal(1.0, clamped.Activity);
            Assert.Equal(0.5, clamped.BondGain);
            Assert.Equal(1.5, clamped.MinigameScore);
            Assert.Equal(1.5, clamped.WheekRate);
            Assert.Equal(0.5, clamped.Startle);
            Assert.Equal(1.2, clamped.JoyWeight);
        }

        [Fact]
        public void AverageClamped_TwoValuesOnePointFive_StaysOnePointFive()
        {
            var p1 = new PigModifiers(appetite: 1.5, activity: 1.5);
            var p2 = new PigModifiers(appetite: 1.5, activity: 1.5);

            var clamped = PigModifiers.AverageClamped(new[] { p1, p2 }, 0.5, 2.0);

            Assert.Equal(1.5, clamped.Appetite, 5);
            Assert.Equal(1.5, clamped.Activity, 5);
            Assert.Equal(1.0, clamped.PoopRate, 5);
        }
    }
}
