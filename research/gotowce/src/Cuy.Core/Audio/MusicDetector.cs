using System;

namespace Cuy.Core.Audio
{
    /// <summary>
    /// Decides "music is playing" from a stream of peak levels (0..1).
    /// Pure logic, no NAudio: the desktop feeds it the loudest peak of the media audio sessions
    /// (NAudio AudioSessionControl.AudioMeterInformation.MasterPeakValue, system sounds excluded).
    ///
    /// Silent -> Music: peak above Threshold for EnterSeconds AND the coefficient of variation of the
    ///                  peaks over the last WindowSeconds is above MinVariation (a steady hum is not music).
    /// Music -> Silent: peak below Threshold for LeaveSeconds.
    /// Allocation free after construction (fixed ring buffer).
    /// </summary>
    public sealed class MusicDetector
    {
        public double Threshold { get; set; } = 0.02;
        public double MinVariation { get; set; } = 0.15;
        public double EnterSeconds { get; set; } = 5.0;
        public double LeaveSeconds { get; set; } = 3.0;
        public double WindowSeconds { get; set; } = 2.0;

        public bool IsMusic { get; private set; }

        /// <summary>Fires with the new value whenever IsMusic changes.</summary>
        public event Action<bool> MusicChanged;

        private readonly double[] _ring;
        private readonly DateTime[] _ringTime;
        private int _ringHead;
        private int _ringCount;

        private DateTime? _loudSinceUtc;
        private DateTime? _quietSinceUtc;

        /// <param name="capacity">Ring size; must cover WindowSeconds at the push rate (2 s at 50 ms = 40).</param>
        public MusicDetector(int capacity = 64)
        {
            if (capacity < 8) capacity = 8;
            _ring = new double[capacity];
            _ringTime = new DateTime[capacity];
        }

        public void Reset()
        {
            _ringHead = 0;
            _ringCount = 0;
            _loudSinceUtc = null;
            _quietSinceUtc = null;
            SetMusic(false);
        }

        /// <summary>Push one peak sample (0..1). Call every 50-100 ms.</summary>
        public void Push(double peak, DateTime utc)
        {
            if (double.IsNaN(peak) || peak < 0) peak = 0;
            if (peak > 1) peak = 1;

            _ring[_ringHead] = peak;
            _ringTime[_ringHead] = utc;
            _ringHead = (_ringHead + 1) % _ring.Length;
            if (_ringCount < _ring.Length) _ringCount++;

            bool loud = peak >= Threshold;

            if (!IsMusic)
            {
                if (loud)
                {
                    if (_loudSinceUtc == null) _loudSinceUtc = utc;
                    if ((utc - _loudSinceUtc.Value).TotalSeconds >= EnterSeconds && Variation(utc) >= MinVariation)
                    {
                        _quietSinceUtc = null;
                        SetMusic(true);
                    }
                }
                else
                {
                    _loudSinceUtc = null;
                }
                return;
            }

            if (loud)
            {
                _quietSinceUtc = null;
            }
            else
            {
                if (_quietSinceUtc == null) _quietSinceUtc = utc;
                if ((utc - _quietSinceUtc.Value).TotalSeconds >= LeaveSeconds)
                {
                    _loudSinceUtc = null;
                    SetMusic(false);
                }
            }
        }

        /// <summary>Coefficient of variation (stddev / mean) of the samples inside the window.</summary>
        public double Variation(DateTime nowUtc)
        {
            double sum = 0, sumSq = 0;
            int n = 0;
            for (int i = 0; i < _ringCount; i++)
            {
                int idx = (_ringHead - 1 - i + _ring.Length) % _ring.Length;
                if ((nowUtc - _ringTime[idx]).TotalSeconds > WindowSeconds) break;
                double v = _ring[idx];
                sum += v;
                sumSq += v * v;
                n++;
            }
            if (n < 4) return 0;
            double mean = sum / n;
            if (mean <= 1e-9) return 0;
            double variance = sumSq / n - mean * mean;
            if (variance < 0) variance = 0;
            return Math.Sqrt(variance) / mean;
        }

        private void SetMusic(bool value)
        {
            if (IsMusic == value) return;
            IsMusic = value;
            MusicChanged?.Invoke(value);
        }
    }
}
