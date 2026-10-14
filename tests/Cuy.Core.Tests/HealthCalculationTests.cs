using Cuy.Core;
using Xunit;

namespace Cuy.Core.Tests
{
    public class HealthCalculationTests
    {
        [Fact]
        public void Needs_Health_AllMax_Returns100()
        {
            var needs = new Needs();
            Assert.Equal(100.0, needs.Health);
        }

        [Fact]
        public void Needs_Health_AllZero_Returns0()
        {
            var needs = new Needs();
            foreach (var n in NeedNames.All)
            {
                needs[n] = 0.0;
            }

            Assert.Equal(0.0, needs.Health);
        }

        [Theory]
        [InlineData(20.0)]
        [InlineData(50.0)]
        [InlineData(80.0)]
        public void Needs_Health_AllEqual_ReturnsThatValue(double value)
        {
            var needs = new Needs();
            foreach (var n in NeedNames.All)
            {
                needs[n] = value;
            }

            // When all needs are equal: avg = value, min = value -> 0.5 * value + 0.5 * value = value
            Assert.Equal(value, needs.Health, precision: 4);
        }

        [Fact]
        public void Needs_Health_MatchesDocstringFormula_AfterOfflineWeekend()
        {
            // Example from the Needs.cs documentation:
            // (20/20/100/20/100/77) -> health about 38
            var needs = new Needs
            {
                Satiety = 20.0,
                VitaminC = 20.0,
                Energy = 100.0,
                Mood = 20.0,
                Cleanliness = 100.0,
                Teeth = 77.0
            };

            double sum = 20.0 + 20.0 + 100.0 + 20.0 + 100.0 + 77.0; // 337
            double avg = sum / 6.0;                                  // 56.166667
            double min = 20.0;
            double expected = 0.5 * avg + 0.5 * min;                 // 38.083333

            Assert.Equal(expected, needs.Health, precision: 4);
            Assert.True(needs.Health > 38.0 && needs.Health < 38.2);
        }

        [Fact]
        public void Needs_Health_SingleZeroNeed_DrasticallyLowersHealth()
        {
            var needs = new Needs
            {
                Satiety = 0.0,
                VitaminC = 100.0,
                Energy = 100.0,
                Mood = 100.0,
                Cleanliness = 100.0,
                Teeth = 100.0
            };

            // Average = 500 / 6 = 83.3333, but min = 0
            // Health = 0.5 * 83.3333 + 0 = 41.6667
            double expected = 0.5 * (500.0 / 6.0) + 0.5 * 0.0;

            Assert.Equal(expected, needs.Health, precision: 4);
        }

        [Fact]
        public void Needs_Health_TracksDifferentLowestNeedsCorrectly()
        {
            var needs = new Needs();

            // Set each need in turn as the lowest (10.0)
            foreach (var lowestNeed in NeedNames.All)
            {
                foreach (var n in NeedNames.All) needs[n] = 90.0;
                needs[lowestNeed] = 10.0;

                double sum = 5 * 90.0 + 10.0; // 460
                double avg = sum / 6.0;
                double min = 10.0;
                double expected = 0.5 * avg + 0.5 * min;

                Assert.Equal(expected, needs.Health, precision: 4);
                Assert.Equal(lowestNeed, needs.Lowest());
            }
        }
    }
}
