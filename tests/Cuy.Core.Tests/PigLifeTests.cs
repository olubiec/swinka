using System;
using Cuy.Core.Pigs;
using Newtonsoft.Json;
using Xunit;

namespace Cuy.Core.Tests
{
    public class PigLifeTests
    {
        private static readonly DateTime Now = new DateTime(2025, 6, 1, 12, 0, 0, DateTimeKind.Utc);
        private const double PigDaysPerRealDay = 21.0;

        [Fact]
        public void BornAtFor_TwoYears_IsTwoYearsOldAndAdult()
        {
            var born = PigLife.BornAtFor(Now, 2.0, PigDaysPerRealDay);
            var pig = new PigProfile { BornAtUtc = born };

            var age = PigLife.AgeOf(pig, Now, PigDaysPerRealDay, Now);
            Assert.Equal(2, age.Years);

            var stage = PigLife.StageOf(pig, Now, PigDaysPerRealDay, Now);
            Assert.Equal(LifeStage.Adult, stage);
        }

        [Fact]
        public void StageOf_StartAgeOnePointTwo_IsAdult()
        {
            var born = PigLife.BornAtFor(Now, 1.2, PigDaysPerRealDay);
            var pig = new PigProfile { BornAtUtc = born };

            var stage = PigLife.StageOf(pig, Now, PigDaysPerRealDay, Now);
            Assert.Equal(LifeStage.Adult, stage);
        }

        [Fact]
        public void StageOf_AtZeroIsBaby_AndOneRealDayLaterIsJunior()
        {
            var born = PigLife.BornAtFor(Now, 0, PigDaysPerRealDay);
            var pig = new PigProfile { BornAtUtc = born };

            var babyStage = PigLife.StageOf(pig, Now, PigDaysPerRealDay, Now);
            Assert.Equal(LifeStage.Baby, babyStage);

            var oneDayLater = Now.AddDays(1);
            var juniorStage = PigLife.StageOf(pig, oneDayLater, PigDaysPerRealDay, Now);
            Assert.Equal(LifeStage.Junior, juniorStage);
        }

        [Fact]
        public void StageOf_FourYearsIsSenior_AndEightYearsIsLegend_WhenLegendAtYearsIsNull()
        {
            var seniorBorn = PigLife.BornAtFor(Now, 4.0, PigDaysPerRealDay);
            var pigSenior = new PigProfile { BornAtUtc = seniorBorn, LegendAtYears = null };
            Assert.Equal(LifeStage.Senior, PigLife.StageOf(pigSenior, Now, PigDaysPerRealDay, Now));

            var legendBorn = PigLife.BornAtFor(Now, 8.0, PigDaysPerRealDay);
            var pigLegend = new PigProfile { BornAtUtc = legendBorn, LegendAtYears = null };
            Assert.Equal(LifeStage.Legend, PigLife.StageOf(pigLegend, Now, PigDaysPerRealDay, Now));
        }

        [Fact]
        public void StageOf_WithLegendAtSixYears_FivePointNineIsSenior_AndSixIsLegend()
        {
            var born59 = PigLife.BornAtFor(Now, 5.9, PigDaysPerRealDay);
            var pig59 = new PigProfile { BornAtUtc = born59, LegendAtYears = 6.0 };
            Assert.Equal(LifeStage.Senior, PigLife.StageOf(pig59, Now, PigDaysPerRealDay, Now));

            var born60 = PigLife.BornAtFor(Now, 6.0, PigDaysPerRealDay);
            var pig60 = new PigProfile { BornAtUtc = born60, LegendAtYears = 6.0 };
            Assert.Equal(LifeStage.Legend, PigLife.StageOf(pig60, Now, PigDaysPerRealDay, Now));
        }

        [Fact]
        public void StageOf_WithLegendAtNinePointFive_EightPointFiveIsStillSenior()
        {
            var born85 = PigLife.BornAtFor(Now, 8.5, PigDaysPerRealDay);
            var pig85 = new PigProfile { BornAtUtc = born85, LegendAtYears = 9.5 };
            Assert.Equal(LifeStage.Senior, PigLife.StageOf(pig85, Now, PigDaysPerRealDay, Now));

            var born95 = PigLife.BornAtFor(Now, 9.5, PigDaysPerRealDay);
            var pig95 = new PigProfile { BornAtUtc = born95, LegendAtYears = 9.5 };
            Assert.Equal(LifeStage.Legend, PigLife.StageOf(pig95, Now, PigDaysPerRealDay, Now));
        }

        [Fact]
        public void AgeOfAndStageOf_PigWithoutBornAtUtc_UsesFallback()
        {
            var fallbackBirth = PigLife.BornAtFor(Now, 3.0, PigDaysPerRealDay);
            var pigWithoutBirth = new PigProfile { BornAtUtc = null };

            var age = PigLife.AgeOf(pigWithoutBirth, Now, PigDaysPerRealDay, fallbackBirth);
            Assert.Equal(3, age.Years);

            var stage = PigLife.StageOf(pigWithoutBirth, Now, PigDaysPerRealDay, fallbackBirth);
            Assert.Equal(LifeStage.Adult, stage);

            // Null profile should also use fallback
            var ageNull = PigLife.AgeOf(null, Now, PigDaysPerRealDay, fallbackBirth);
            Assert.Equal(3, ageNull.Years);

            var stageNull = PigLife.StageOf(null, Now, PigDaysPerRealDay, fallbackBirth);
            Assert.Equal(LifeStage.Adult, stageNull);
        }

        [Fact]
        public void StageOf_MemorialPig_IsLegendAtAgeZero()
        {
            var memorialPig = new PigProfile
            {
                Memorial = true,
                BornAtUtc = Now
            };

            var stage = PigLife.StageOf(memorialPig, Now, PigDaysPerRealDay, Now);
            Assert.Equal(LifeStage.Legend, stage);
        }

        [Fact]
        public void PigProfile_JsonRoundTrip_PreservesAllFiveNewFields()
        {
            var profile = new PigProfile("Whiskers", "peruvian", "albino")
            {
                NamedId = "cookie",
                BornAtUtc = new DateTime(2023, 4, 10, 8, 30, 0, DateTimeKind.Utc),
                ArrivedAtUtc = new DateTime(2023, 5, 1, 12, 0, 0, DateTimeKind.Utc),
                LegendAtYears = 7.5,
                Memorial = true
            };

            string json = JsonConvert.SerializeObject(profile);
            var deserialized = JsonConvert.DeserializeObject<PigProfile>(json);

            Assert.NotNull(deserialized);
            Assert.Equal("cookie", deserialized.NamedId);
            Assert.Equal(new DateTime(2023, 4, 10, 8, 30, 0, DateTimeKind.Utc), deserialized.BornAtUtc);
            Assert.Equal(new DateTime(2023, 5, 1, 12, 0, 0, DateTimeKind.Utc), deserialized.ArrivedAtUtc);
            Assert.Equal(7.5, deserialized.LegendAtYears);
            Assert.True(deserialized.Memorial);
        }

        [Fact]
        public void PigProfile_OldJson_DeserializesWithSafeDefaults()
        {
            string oldJson = @"{
                ""Id"": ""test-pig-old-123"",
                ""Name"": ""OldPig"",
                ""Breed"": ""rosette"",
                ""PaletteId"": ""agouti"",
                ""Traits"": [""cuddly"", ""explorer""]
            }";

            var loaded = JsonConvert.DeserializeObject<PigProfile>(oldJson);

            Assert.NotNull(loaded);
            Assert.Equal("test-pig-old-123", loaded.Id);
            Assert.Equal("OldPig", loaded.Name);
            Assert.Null(loaded.NamedId);
            Assert.Null(loaded.BornAtUtc);
            Assert.Null(loaded.ArrivedAtUtc);
            Assert.Null(loaded.LegendAtYears);
            Assert.False(loaded.Memorial);
        }
    }
}
