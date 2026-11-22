using System;
using System.Linq;
using Cuy.Core.Weather;

namespace Cuy.Core.World
{
    public enum RunVerdict
    {
        Ok,
        TooEarly,
        TooLate,
        TooWet,
        TooCold,
        TooHot,
        Dark
    }

    /// <summary>
    /// Time-of-day, weather and mood rules for the garden run.
    /// </summary>
    public static class RunRules
    {
        public static RunVerdict CanBeOut(DateTime localNow, WeatherInfo weatherOrNull, RunConfig cfg = null)
        {
            var config = cfg ?? RunConfig.Current;

            if (localNow.Hour < config.DayFromHour)
                return RunVerdict.TooEarly;
            if (localNow.Hour >= config.DayToHour)
                return RunVerdict.TooLate;

            if (weatherOrNull != null)
            {
                if (!weatherOrNull.IsDay)
                    return RunVerdict.Dark;

                string condName = weatherOrNull.Condition.ToString();
                bool allowed = config.AllowedConditions != null &&
                               config.AllowedConditions.Any(c => string.Equals(c, condName, StringComparison.OrdinalIgnoreCase));
                if (weatherOrNull.IsWet || !allowed)
                    return RunVerdict.TooWet;

                if (weatherOrNull.TemperatureC < config.MinTempC)
                    return RunVerdict.TooCold;
                if (weatherOrNull.TemperatureC > config.MaxTempC)
                    return RunVerdict.TooHot;
            }

            return RunVerdict.Ok;
        }

        public static string Message(RunVerdict verdict)
        {
            switch (verdict)
            {
                case RunVerdict.Ok: return "Ready for the garden run";
                case RunVerdict.TooEarly: return "Too early for the garden run";
                case RunVerdict.TooLate: return "Evening is coming, time to rest inside";
                case RunVerdict.TooWet: return "It is a bit wet outside today";
                case RunVerdict.TooCold: return "It is too chilly outside today";
                case RunVerdict.TooHot: return "It is too warm outside today";
                case RunVerdict.Dark: return "It is dark outside";
                default: return "Ready for the garden run";
            }
        }

        public static double MoodFor(double hoursOut, double alreadyCreditedToday, RunConfig cfg = null)
        {
            var config = cfg ?? RunConfig.Current;
            double remainingCap = Math.Max(0.0, config.MoodCapPerDay - alreadyCreditedToday);
            double earned = Math.Max(0.0, hoursOut) * config.MoodPerHour;
            return Math.Min(remainingCap, earned);
        }

        public static double CreditableHours(DateTime outSinceUtc, DateTime untilUtc, DateTime localDayStart, TimeSpan utcOffset, RunConfig cfg = null)
        {
            var config = cfg ?? RunConfig.Current;
            if (untilUtc <= outSinceUtc) return 0.0;

            var startLocal = outSinceUtc + utcOffset;
            var endLocal = untilUtc + utcOffset;
            var winStart = localDayStart.Date.AddHours(config.DayFromHour);
            var winEnd = localDayStart.Date.AddHours(config.DayToHour);

            var clampedStart = startLocal > winStart ? startLocal : winStart;
            var clampedEnd = endLocal < winEnd ? endLocal : winEnd;
            if (clampedEnd <= clampedStart) return 0.0;

            double hours = (clampedEnd - clampedStart).TotalHours;
            return Math.Min(config.MaxHoursPerDay, Math.Max(0.0, hours));
        }

        public static double CreditableHours(DateTime outSinceLocal, DateTime untilLocal, RunConfig cfg = null)
        {
            var config = cfg ?? RunConfig.Current;
            if (untilLocal <= outSinceLocal) return 0.0;

            var winStart = outSinceLocal.Date.AddHours(config.DayFromHour);
            var winEnd = outSinceLocal.Date.AddHours(config.DayToHour);

            var clampedStart = outSinceLocal > winStart ? outSinceLocal : winStart;
            var clampedEnd = untilLocal < winEnd ? untilLocal : winEnd;
            if (clampedEnd <= clampedStart) return 0.0;

            double hours = (clampedEnd - clampedStart).TotalHours;
            return Math.Min(config.MaxHoursPerDay, Math.Max(0.0, hours));
        }
    }
}
