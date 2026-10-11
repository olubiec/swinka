using System;

namespace SwinkaCore.Time
{
    /// <summary>
    /// Sztuczny zegar przesuwany ręcznie. Do Symulatora i testów.
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
        /// Używany tylko przez <see cref="AdvanceReal"/> i przez Pet do wykrywania przerw
        /// (uśpiony komputer), bo przerwa jest liczona w czasie realnym.
        /// </summary>
        public double Multiplier { get; set; }

        /// <summary>Przesuwa czas gry o podany odcinek.</summary>
        public void Advance(TimeSpan gameTime)
        {
            _utcNow = _utcNow.Add(gameTime);
        }

        /// <summary>Przesuwa czas gry tak, jakby minął podany czas realny (z mnożnikiem).</summary>
        public void AdvanceReal(TimeSpan realTime)
        {
            _utcNow = _utcNow.AddTicks((long)(realTime.Ticks * Multiplier));
        }
    }
}
