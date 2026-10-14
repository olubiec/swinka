using System;

namespace Cuy.Core.Time
{
    /// <summary>
    /// Clock based on the system clock, with a multiplier. When the multiplier changes, game time
    /// does not jump: the clock remembers an anchor point and keeps counting from it.
    /// </summary>
    /// <remarks>
    /// With a multiplier above 1, game time runs ahead of real time.
    /// After going back to 1x pass <c>startUtc</c> = the last time from the save, otherwise the pig
    /// "goes back in time" (Pet ignores negative elapsed time, so it simply stops).
    /// </remarks>
    public sealed class ScaledClock : IClock
    {
        private readonly Func<DateTime> _realUtc;
        private readonly object _lock = new object();
        private DateTime _anchorReal;
        private DateTime _anchorGame;
        private double _multiplier;

        /// <param name="multiplier">Time multiplier (1, 60, 1440...).</param>
        /// <param name="startUtc">Game time at start; defaults to now.</param>
        /// <param name="realUtcSource">Real time source; defaults to DateTime.UtcNow.</param>
        public ScaledClock(double multiplier = TimeMultipliers.Normal, DateTime? startUtc = null,
            Func<DateTime> realUtcSource = null)
        {
            if (multiplier <= 0) throw new ArgumentOutOfRangeException(nameof(multiplier));
            _realUtc = realUtcSource ?? (() => DateTime.UtcNow);
            _anchorReal = _realUtc();
            _anchorGame = startUtc.HasValue ? DateTime.SpecifyKind(startUtc.Value.ToUniversalTime(), DateTimeKind.Utc) : _anchorReal;
            _multiplier = multiplier;
        }

        public DateTime UtcNow
        {
            get { lock (_lock) return Compute(_realUtc()); }
        }

        public double Multiplier
        {
            get { lock (_lock) return _multiplier; }
            set
            {
                if (value <= 0) throw new ArgumentOutOfRangeException(nameof(value));
                lock (_lock)
                {
                    var real = _realUtc();
                    _anchorGame = Compute(real);
                    _anchorReal = real;
                    _multiplier = value;
                }
            }
        }

        private DateTime Compute(DateTime real)
        {
            long ticks = (long)((real - _anchorReal).Ticks * _multiplier);
            return DateTime.SpecifyKind(_anchorGame.AddTicks(ticks), DateTimeKind.Utc);
        }
    }
}
