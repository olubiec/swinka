using System;

namespace SwinkaCore.Time
{
    /// <summary>
    /// Zegar oparty na zegarze systemowym, z mnożnikiem. Przy zmianie mnożnika czas gry
    /// nie skacze: zegar zapamiętuje punkt zaczepienia i dalej liczy od niego.
    /// </summary>
    /// <remarks>
    /// Przy mnożniku większym niż 1 czas gry ucieka do przodu względem realnego.
    /// Po powrocie do 1x podaj <c>startUtc</c> = ostatni czas z zapisu, inaczej świnka
    /// "cofnie się w czasie" (Pet ignoruje ujemny upływ czasu, więc po prostu stanie).
    /// </remarks>
    public sealed class ScaledClock : IClock
    {
        private readonly Func<DateTime> _realUtc;
        private readonly object _lock = new object();
        private DateTime _anchorReal;
        private DateTime _anchorGame;
        private double _multiplier;

        /// <param name="multiplier">Mnożnik czasu (1, 60, 1440...).</param>
        /// <param name="startUtc">Czas gry na starcie; domyślnie teraz.</param>
        /// <param name="realUtcSource">Źródło czasu realnego; domyślnie DateTime.UtcNow.</param>
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
