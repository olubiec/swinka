using System;

namespace Cuy.Core.Time
{
    /// <summary>
    /// Zegar gry. Cały czas gry przechodzi przez ten interfejs (ZASADY.md),
    /// żeby dało się testować przyspieszony czas.
    /// </summary>
    public interface IClock
    {
        /// <summary>Aktualny czas gry (UTC).</summary>
        DateTime UtcNow { get; }

        /// <summary>
        /// Ile sekund gry mija w jednej sekundzie realnej.
        /// 1 = normalnie, 60 = godzina w minutę, 1440 = doba w minutę.
        /// </summary>
        double Multiplier { get; set; }
    }

    /// <summary>Typowe mnożniki czasu.</summary>
    public static class TimeMultipliers
    {
        public const double Normal = 1.0;
        public const double HourPerMinute = 60.0;
        public const double DayPerMinute = 1440.0;
    }

    public static class ClockExtensions
    {
        /// <summary>Czas gry w strefie lokalnej (pora dnia, data dzienna).</summary>
        public static DateTime LocalNow(this IClock clock)
        {
            return clock.UtcNow.ToLocalTime();
        }
    }
}
