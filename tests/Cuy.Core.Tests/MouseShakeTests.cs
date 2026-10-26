using System;
using Cuy.Core.Input;
using Xunit;

namespace Cuy.Core.Tests
{
    public class MouseShakeTests
    {
        private static readonly DateTime T0 = new DateTime(2026, 10, 26, 12, 0, 0, DateTimeKind.Utc);

        [Fact]
        public void Slow_wide_sweep_is_not_a_shake()
        {
            var d = new MouseShakeDetector();
            int hits = 0;
            // 0 -> 800 -> 0 over 4 s.
            // 4 s / 0.033 s = ~121 samples.
            // 2 s each way = 60 samples each way.
            for (int i = 0; i < 120; i++)
            {
                int x = i < 60 ? (i * 800 / 60) : ((120 - i) * 800 / 60);
                if (d.Push(x, 400, 100, T0.AddMilliseconds(i * 33))) hits++;
            }
            Assert.Equal(0, hits);
        }

        [Fact]
        public void Vertical_shaking_is_not_counted()
        {
            var d = new MouseShakeDetector();
            int hits = 0;
            // x constant, y zig-zag +/-100 px with a 200 ms period.
            // 200 ms period = 6 samples per period at 33 ms. 3 samples per half period.
            for (int i = 0; i < 60; i++) // 2 seconds
            {
                int phase = i % 6;
                int y = 400 + (phase < 3 ? phase * 100 / 3 : (6 - phase) * 100 / 3) * (i / 3 % 2 == 0 ? 1 : -1);
                // Wait, easier: triangle wave y
                int amp = 100;
                int y2 = 400 + (phase < 3 ? phase * (amp / 3) : (6 - phase) * (amp / 3)); // Close enough.

                if (d.Push(500, y2, 100, T0.AddMilliseconds(i * 33))) hits++;
            }
            Assert.Equal(0, hits);
        }

        [Fact]
        public void Reset_clears_state()
        {
            var d = new MouseShakeDetector();
            int hits = 0;

            // Generate 4 reversals
            for (int i = 0; i < 15; i++)
            {
                int phase = i % 6;
                int x = 500 + (phase < 3 ? phase * 50 : (6 - phase) * 50);
                if (d.Push(x, 400, 100, T0.AddMilliseconds(i * 33))) hits++;
            }

            d.Reset();

            // Generate 3 more reversals
            for (int i = 15; i < 25; i++)
            {
                int phase = i % 6;
                int x = 500 + (phase < 3 ? phase * 50 : (6 - phase) * 50);
                if (d.Push(x, 400, 100, T0.AddMilliseconds(i * 33))) hits++;
            }

            // Without Reset() those 7 reversals inside one second would be a shake.
            Assert.Equal(0, hits);
        }

        [Fact]
        public void Monitor_rate_shake_is_detected_once()
        {
            var d = new MouseShakeDetector();
            int hits = 0;
            // triangle wave, amplitude 150 px, period 200 ms, sampled every 33 ms for 1.5 s
            for (int i = 0; i < 45; i++) // 45 * 33.3ms = 1.5s
            {
                // 200 ms / 33 ms = 6 samples per period.
                // 3 samples per half period. So amplitude 150 means 50 px per sample.
                int phase = i % 6;
                int x = 500 + (phase < 3 ? phase * 50 : (6 - phase) * 50);
                if (d.Push(x, 400, 100, T0.AddMilliseconds(i * 33))) hits++;
            }
            Assert.Equal(1, hits);
        }

        [Fact]
        public void Two_shakes_inside_the_debounce_count_once()
        {
            var d = new MouseShakeDetector();
            int hits = 0;
            // continue the shake of the previous test for another 0.8 s right after the hit
            for (int i = 0; i < 70; i++) // 70 * 33 = 2.3 s
            {
                int phase = i % 6;
                int x = 500 + (phase < 3 ? phase * 50 : (6 - phase) * 50);
                if (d.Push(x, 400, 100, T0.AddMilliseconds(i * 33))) hits++;
            }
            Assert.Equal(1, hits);
        }

        [Fact]
        public void Shake_after_the_debounce_counts_again()
        {
            var d = new MouseShakeDetector();
            int hits = 0;

            // shake 1 s
            int step = 0;
            for (int i = 0; i < 30; i++, step++)
            {
                int phase = i % 6;
                int x = 500 + (phase < 3 ? phase * 50 : (6 - phase) * 50);
                if (d.Push(x, 400, 100, T0.AddMilliseconds(step * 33))) hits++;
            }

            // hold still 3 s
            for (int i = 0; i < 90; i++, step++)
            {
                if (d.Push(500, 400, 100, T0.AddMilliseconds(step * 33))) hits++;
            }

            // shake 1 s
            for (int i = 0; i < 30; i++, step++)
            {
                int phase = i % 6;
                int x = 500 + (phase < 3 ? phase * 50 : (6 - phase) * 50);
                if (d.Push(x, 400, 100, T0.AddMilliseconds(step * 33))) hits++;
            }

            Assert.Equal(2, hits);
        }
    }
}
