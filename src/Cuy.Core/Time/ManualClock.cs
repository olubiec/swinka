using System;

namespace Cuy.Core.Time
{
    /// <summary>
    /// Artificial clock moved by hand. For the Simulator and tests.
    /// </summary>
    public sealed class ManualClock : IClock
    {
        private DateTime _utcNow;

        public ManualClock(DateTime startUtc, double multiplier = TimeMultipliers.Normal)
        {
            _utcNow = DateTime.SpecifyKind(startUtc.ToUniversalTime(), DateTimeKind.Utc);
            Multiplier = multiplier;
        }

        public DateTime UtcNow
        {
            get { return _utcNow; }
            set { _utcNow = DateTime.SpecifyKind(value.ToUniversalTime(), DateTimeKind.Utc); }
        }

        /// <summary>
        /// Used only by <see cref="AdvanceReal"/> and by Pet to detect breaks
        /// (computer asleep), because a break is measured in real time.
        /// </summary>
        public double Multiplier { get; set; }

        /// <summary>Moves game time forward by the given span.</summary>
        public void Advance(TimeSpan gameTime)
        {
            _utcNow = _utcNow.Add(gameTime);
        }

        /// <summary>Moves game time as if the given real time had passed (with the multiplier).</summary>
        public void AdvanceReal(TimeSpan realTime)
        {
            _utcNow = _utcNow.AddTicks((long)(realTime.Ticks * Multiplier));
        }
    }
}
