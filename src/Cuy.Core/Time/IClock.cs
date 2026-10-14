using System;

namespace Cuy.Core.Time
{
    /// <summary>
    /// Game clock. All game time goes through this interface (RULES.md),
    /// so that accelerated time can be tested.
    /// </summary>
    public interface IClock
    {
        /// <summary>Current game time (UTC).</summary>
        DateTime UtcNow { get; }

        /// <summary>
        /// How many game seconds pass in one real second.
        /// 1 = normal, 60 = an hour per minute, 1440 = a day per minute.
        /// </summary>
        double Multiplier { get; set; }
    }

    /// <summary>Common time multipliers.</summary>
    public static class TimeMultipliers
    {
        public const double Normal = 1.0;
        public const double HourPerMinute = 60.0;
        public const double DayPerMinute = 1440.0;
    }

    public static class ClockExtensions
    {
        /// <summary>Game time in the local time zone (time of day, calendar date).</summary>
        public static DateTime LocalNow(this IClock clock)
        {
            return clock.UtcNow.ToLocalTime();
        }
    }
}
