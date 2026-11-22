using System;
using Cuy.Core.Weather;
using Cuy.Core.World;
using Xunit;

namespace Cuy.Core.Tests
{
    public class RunRulesTests
    {
        [Fact]
        public void DefaultConfig_MatchesPigRunJson()
        {
            var cfg = RunConfig.LoadDefault();
            Assert.Equal(12, cfg.MinCells);
            Assert.Equal(6, cfg.CellsPerPig);
            Assert.Equal("gate_garden", cfg.GateItem);
            Assert.Equal(6, cfg.MaxHoursPerDay);
            Assert.Equal(8, cfg.DayFromHour);
            Assert.Equal(19, cfg.DayToHour);
            Assert.Equal(10, cfg.MinTempC);
            Assert.Equal(28, cfg.MaxTempC);
            Assert.Equal(1.0, cfg.MoodPerHour);
            Assert.Equal(6, cfg.MoodCapPerDay);
        }

        [Fact]
        public void CustomJsonConfig_ChangesCanBeOutVerdict()
        {
            var cfg = RunConfig.Load("{\"day_from_hour\":10,\"day_to_hour\":16,\"min_temp_c\":15,\"max_temp_c\":22}");
            var morning = new DateTime(2026, 5, 10, 9, 0, 0);
            var warm = new WeatherInfo { IsDay = true, TemperatureC = 24, Condition = WeatherCondition.Clear };

            Assert.Equal(RunVerdict.TooEarly, RunRules.CanBeOut(morning, null, cfg));
            Assert.Equal(RunVerdict.TooHot, RunRules.CanBeOut(new DateTime(2026, 5, 10, 12, 0, 0), warm, cfg));
        }

        [Fact]
        public void CanBeOut_ChecksTimeAndWeather()
        {
            var cfg = RunConfig.CreateDefault();
            var noon = new DateTime(2026, 5, 10, 12, 0, 0);

            Assert.Equal(RunVerdict.Ok, RunRules.CanBeOut(noon, null, cfg));
            Assert.Equal(RunVerdict.TooEarly, RunRules.CanBeOut(new DateTime(2026, 5, 10, 7, 59, 0), null, cfg));
            Assert.Equal(RunVerdict.TooLate, RunRules.CanBeOut(new DateTime(2026, 5, 10, 19, 0, 0), null, cfg));

            Assert.Equal(RunVerdict.Dark, RunRules.CanBeOut(noon, new WeatherInfo { IsDay = false, TemperatureC = 18, Condition = WeatherCondition.Clear }, cfg));
            Assert.Equal(RunVerdict.TooWet, RunRules.CanBeOut(noon, new WeatherInfo { IsDay = true, TemperatureC = 18, Condition = WeatherCondition.Rain }, cfg));
            Assert.Equal(RunVerdict.TooWet, RunRules.CanBeOut(noon, new WeatherInfo { IsDay = true, TemperatureC = 18, Condition = WeatherCondition.Fog }, cfg));
            Assert.Equal(RunVerdict.TooCold, RunRules.CanBeOut(noon, new WeatherInfo { IsDay = true, TemperatureC = 9.5, Condition = WeatherCondition.Clear }, cfg));
            Assert.Equal(RunVerdict.TooHot, RunRules.CanBeOut(noon, new WeatherInfo { IsDay = true, TemperatureC = 28.5, Condition = WeatherCondition.Cloudy }, cfg));
            Assert.Equal(RunVerdict.Ok, RunRules.CanBeOut(noon, new WeatherInfo { IsDay = true, TemperatureC = 20, Condition = WeatherCondition.Cloudy }, cfg));
        }

        [Fact]
        public void Message_ReturnsNonEmptyEnglishStringForAllVerdicts()
        {
            foreach (RunVerdict v in Enum.GetValues(typeof(RunVerdict)))
            {
                string msg = RunRules.Message(v);
                Assert.False(string.IsNullOrWhiteSpace(msg));
            }
        }

        [Fact]
        public void MoodFor_RespectsDailyCap()
        {
            var cfg = RunConfig.CreateDefault();
            Assert.Equal(3.0, RunRules.MoodFor(3.0, 0.0, cfg), 4);
            Assert.Equal(2.0, RunRules.MoodFor(5.0, 4.0, cfg), 4);
            Assert.Equal(0.0, RunRules.MoodFor(2.0, 6.0, cfg), 4);
            Assert.Equal(0.0, RunRules.MoodFor(-1.0, 0.0, cfg), 4);
        }

        [Fact]
        public void CreditableHours_ClampsToDayWindowAndMaxHours()
        {
            var cfg = RunConfig.CreateDefault();
            var startLocal = new DateTime(2026, 5, 10, 6, 0, 0);
            var endLocal = new DateTime(2026, 5, 10, 21, 0, 0);
            Assert.Equal(6.0, RunRules.CreditableHours(startLocal, endLocal, cfg), 4);

            var utcOffset = TimeSpan.FromHours(2);
            var dayStartLocal = new DateTime(2026, 5, 10, 0, 0, 0);
            var startUtc = new DateTime(2026, 5, 10, 8, 0, 0, DateTimeKind.Utc); // 10:00 local
            var endUtc = new DateTime(2026, 5, 10, 10, 30, 0, DateTimeKind.Utc); // 12:30 local
            Assert.Equal(2.5, RunRules.CreditableHours(startUtc, endUtc, dayStartLocal, utcOffset, cfg), 4);
        }
    }
}
