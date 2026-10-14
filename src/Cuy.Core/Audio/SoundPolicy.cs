using System;

namespace Cuy.Core.Audio
{
    /// <summary>
    /// Kinds of guinea pig sound events.
    /// </summary>
    public enum SoundEvent
    {
        None = 0,
        /// <summary>Wheek: hunger, call, greeting (wheek_1/2/3.wav, pick one, max 1 per 2 min).</summary>
        Wheek,
        /// <summary>Purr while petted (purr.wav, loops while petting).</summary>
        Purr,
        /// <summary>Chirp: baby, contentment (chirp.wav).</summary>
        Chirp,
        /// <summary>Fear squeal: sudden mouse movement, fleeing (fear_squeal.wav).</summary>
        Fear,
        /// <summary>Angry squeal: teeth chattering, too many clicks (angry_squeal.wav).</summary>
        Anger,
        /// <summary>Crunching while eating (crunch_1/2.wav, every 0.3-0.6 s with a slight pitch change).</summary>
        Crunch,
        /// <summary>Jump for joy / popcorning (pop.wav).</summary>
        Pop
    }

    /// <summary>
    /// Quiet hours configuration and check.
    /// Default 22:00 - 07:00 (night).
    /// </summary>
    public sealed class QuietHoursConfig
    {
        public bool Enabled { get; set; } = true;
        public TimeSpan Start { get; set; } = new TimeSpan(22, 0, 0); // 22:00
        public TimeSpan End { get; set; } = new TimeSpan(7, 0, 0);   // 07:00

        public QuietHoursConfig() { }

        public QuietHoursConfig(TimeSpan start, TimeSpan end, bool enabled = true)
        {
            Start = start;
            End = end;
            Enabled = enabled;
        }

        /// <summary>
        /// Returns true if the given time of day falls within quiet hours.
        /// </summary>
        public bool IsInQuietHours(TimeSpan timeOfDay)
        {
            if (!Enabled) return false;

            if (Start == End)
            {
                return false;
            }

            if (Start < End)
            {
                // Range within one day, e.g. 13:00 - 15:00
                return timeOfDay >= Start && timeOfDay < End;
            }
            else
            {
                // Range across midnight, e.g. 22:00 - 07:00
                return timeOfDay >= Start || timeOfDay < End;
            }
        }

        public bool IsInQuietHours(DateTime dateTime)
        {
            return IsInQuietHours(dateTime.TimeOfDay);
        }
    }

    /// <summary>
    /// Wheek rate limiter (PLAN.md F1: at most one wheek sound per 2 minutes).
    /// </summary>
    public sealed class WheekRateLimiter
    {
        public TimeSpan Cooldown { get; set; } = TimeSpan.FromMinutes(2); // 120 seconds

        public DateTime LastWheekUtc { get; private set; } = DateTime.MinValue;

        public WheekRateLimiter() { }

        public WheekRateLimiter(TimeSpan cooldown)
        {
            Cooldown = cooldown;
        }

        /// <summary>
        /// Checks whether a wheek may be played right now.
        /// </summary>
        public bool CanWheek(DateTime nowUtc, out TimeSpan remaining)
        {
            if (LastWheekUtc == DateTime.MinValue)
            {
                remaining = TimeSpan.Zero;
                return true;
            }

            // Guard against the clock going backwards
            if (nowUtc < LastWheekUtc)
            {
                LastWheekUtc = nowUtc;
                remaining = TimeSpan.Zero;
                return true;
            }

            TimeSpan elapsed = nowUtc - LastWheekUtc;
            if (elapsed >= Cooldown)
            {
                remaining = TimeSpan.Zero;
                return true;
            }

            remaining = Cooldown - elapsed;
            return false;
        }

        /// <summary>
        /// Tries to register a wheek. If the cooldown has passed, updates the time and returns true.
        /// </summary>
        public bool TryWheek(DateTime nowUtc)
        {
            if (CanWheek(nowUtc, out _))
            {
                LastWheekUtc = nowUtc;
                return true;
            }
            return false;
        }

        public void Reset()
        {
            LastWheekUtc = DateTime.MinValue;
        }
    }

    /// <summary>
    /// Small random pitch variation calculator.
    /// </summary>
    public static class PitchCalculator
    {
        /// <summary>Default maximum variation (e.g. 0.06 = +/-6% of the sample rate).</summary>
        public const double DefaultVariation = 0.06;

        public static double CalculateFactor(double randomUnit, double maxVariation = DefaultVariation)
        {
            if (maxVariation <= 0) return 1.0;
            // randomUnit in [0.0, 1.0] -> mapped to [-maxVariation, +maxVariation]
            double norm = Math.Max(0.0, Math.Min(1.0, randomUnit));
            double delta = (norm * 2.0 - 1.0) * maxVariation;
            return 1.0 + delta;
        }
    }

    /// <summary>
    /// Mapping of animation names and game events to sounds.
    /// </summary>
    public static class SoundEventMapper
    {
        public static SoundEvent MapAnimationToSound(string animationName)
        {
            if (string.IsNullOrEmpty(animationName)) return SoundEvent.None;

            switch (animationName.ToLowerInvariant())
            {
                case "wheek":
                case "greet":
                    return SoundEvent.Wheek;
                case "purr_pet":
                    return SoundEvent.Purr;
                case "chirp":
                    return SoundEvent.Chirp;
                case "flee":
                case "startle":
                    return SoundEvent.Fear;
                case "chatter":
                    return SoundEvent.Anger;
                case "eat":
                case "eat_treat":
                case "eat_bowl":
                case "eat_big":
                    return SoundEvent.Crunch;
                case "popcorn":
                    return SoundEvent.Pop;
                default:
                    return SoundEvent.None;
            }
        }
    }
}
