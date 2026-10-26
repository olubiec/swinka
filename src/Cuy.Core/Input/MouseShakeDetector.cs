using System;

namespace Cuy.Core.Input
{
    /// <summary>
    /// Detects a wildly shaken mouse near the pig (task F6-02). Pure, allocation free, tested with synthetic tracks.
    /// A shake = at least MinReversals horizontal direction changes within WindowSeconds, average speed above
    /// MinSpeedPxPerSec, while the cursor is within MaxDistancePx of the pig. After a shake the detector is quiet
    /// for DebounceSeconds. Small jitter (below MinStepPx) is ignored, so normal work with the mouse never counts.
    /// </summary>
    public sealed class MouseShakeDetector
    {
        public int MinReversals { get; set; } = 6;
        public double WindowSeconds { get; set; } = 1.0;
        public double MinSpeedPxPerSec { get; set; } = 900;
        public double MaxDistancePx { get; set; } = 300;
        public double DebounceSeconds { get; set; } = 2.0;
        public int MinStepPx { get; set; } = 4;

        private const int Capacity = 64; // 1 s at 60 Hz
        private readonly DateTime[] _revTime = new DateTime[Capacity];
        private int _revHead, _revCount;

        private readonly DateTime[] _sTime = new DateTime[Capacity];
        private readonly double[] _sDist = new double[Capacity];
        private int _sHead, _sCount;

        private bool _hasLast;
        private int _lastX, _lastY, _lastDir;
        private DateTime _lastUtc;
        private DateTime _quietUntilUtc = DateTime.MinValue;

        public void Reset()
        {
            _revHead = _revCount = 0;
            _sHead = _sCount = 0;
            _hasLast = false;
            _lastDir = 0;
        }

        /// <summary>
        /// Push the cursor position (~30-60 Hz). distanceToPigPx is computed by the caller (it knows the pig window).
        /// Returns true exactly once per detected shake.
        /// </summary>
        public bool Push(int x, int y, double distanceToPigPx, DateTime utc)
        {
            if (!_hasLast)
            {
                _hasLast = true;
                _lastX = x; _lastY = y; _lastUtc = utc;
                return false;
            }

            int dx = x - _lastX;
            int dy = y - _lastY;
            double step = Math.Sqrt((double)dx * dx + (double)dy * dy);
            _lastX = x; _lastY = y; _lastUtc = utc;

            // Path length samples for the average speed.
            _sTime[_sHead] = utc;
            _sDist[_sHead] = step;
            _sHead = (_sHead + 1) % Capacity;
            if (_sCount < Capacity) _sCount++;

            if (Math.Abs(dx) >= MinStepPx)
            {
                int dir = Math.Sign(dx);
                if (_lastDir != 0 && dir != _lastDir)
                {
                    _revTime[_revHead] = utc;
                    _revHead = (_revHead + 1) % Capacity;
                    if (_revCount < Capacity) _revCount++;
                }
                _lastDir = dir;
            }

            if (utc < _quietUntilUtc) return false;
            if (distanceToPigPx > MaxDistancePx) return false;

            int reversals = CountSince(_revTime, _revHead, _revCount, utc);
            if (reversals < MinReversals) return false;

            double path = 0;
            DateTime oldest = utc;
            for (int i = 0; i < _sCount; i++)
            {
                int idx = (_sHead - 1 - i + Capacity) % Capacity;
                if ((utc - _sTime[idx]).TotalSeconds > WindowSeconds) break;
                path += _sDist[idx];
                oldest = _sTime[idx];
            }
            double seconds = Math.Max(0.05, (utc - oldest).TotalSeconds);
            if (path / seconds < MinSpeedPxPerSec) return false;

            _quietUntilUtc = utc.AddSeconds(DebounceSeconds);
            _revCount = 0;
            return true;
        }

        private int CountSince(DateTime[] times, int head, int count, DateTime now)
        {
            int n = 0;
            for (int i = 0; i < count; i++)
            {
                int idx = (head - 1 - i + Capacity) % Capacity;
                if ((now - times[idx]).TotalSeconds > WindowSeconds) break;
                n++;
            }
            return n;
        }
    }
}
