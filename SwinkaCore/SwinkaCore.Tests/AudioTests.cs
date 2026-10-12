using System;
using SwinkaCore.Audio;
using Xunit;

namespace SwinkaCore.Tests
{
    public class AudioTests
    {
        [Fact]
        public void QuietHours_StandardNight_CorrectlyIdentifiesNightAndDay()
        {
            var config = new QuietHoursConfig(new TimeSpan(22, 0, 0), new TimeSpan(7, 0, 0));

            // W nocy (godziny ciszy)
            Assert.True(config.IsInQuietHours(new TimeSpan(22, 0, 0)));
            Assert.True(config.IsInQuietHours(new TimeSpan(23, 30, 0)));
            Assert.True(config.IsInQuietHours(new TimeSpan(0, 0, 0)));
            Assert.True(config.IsInQuietHours(new TimeSpan(3, 15, 0)));
            Assert.True(config.IsInQuietHours(new TimeSpan(6, 59, 59)));

            // W dzień (poza godzinami ciszy)
            Assert.False(config.IsInQuietHours(new TimeSpan(7, 0, 0)));
            Assert.False(config.IsInQuietHours(new TimeSpan(7, 0, 1)));
            Assert.False(config.IsInQuietHours(new TimeSpan(12, 0, 0)));
            Assert.False(config.IsInQuietHours(new TimeSpan(15, 30, 0)));
            Assert.False(config.IsInQuietHours(new TimeSpan(21, 59, 59)));
        }

        [Fact]
        public void QuietHours_DaytimeRange_CorrectlyIdentifiesRange()
        {
            var config = new QuietHoursConfig(new TimeSpan(13, 0, 0), new TimeSpan(15, 0, 0));

            Assert.False(config.IsInQuietHours(new TimeSpan(12, 59, 59)));
            Assert.True(config.IsInQuietHours(new TimeSpan(13, 0, 0)));
            Assert.True(config.IsInQuietHours(new TimeSpan(14, 30, 0)));
            Assert.False(config.IsInQuietHours(new TimeSpan(15, 0, 0)));
            Assert.False(config.IsInQuietHours(new TimeSpan(18, 0, 0)));
        }

        [Fact]
        public void QuietHours_Disabled_AlwaysReturnsFalse()
        {
            var config = new QuietHoursConfig(new TimeSpan(22, 0, 0), new TimeSpan(7, 0, 0), enabled: false);

            Assert.False(config.IsInQuietHours(new TimeSpan(23, 0, 0)));
            Assert.False(config.IsInQuietHours(new TimeSpan(2, 0, 0)));
            Assert.False(config.IsInQuietHours(new TimeSpan(12, 0, 0)));
        }

        [Fact]
        public void WheekRateLimiter_EnforcesTwoMinuteCooldown()
        {
            var limiter = new WheekRateLimiter(TimeSpan.FromMinutes(2));
            var t0 = new DateTime(2026, 10, 12, 12, 0, 0, DateTimeKind.Utc);

            // 1. Pierwsze kwiknięcie - dozwolone
            Assert.True(limiter.CanWheek(t0, out var rem1));
            Assert.Equal(TimeSpan.Zero, rem1);
            Assert.True(limiter.TryWheek(t0));

            // 2. Kwiknięcie po 30 sekundach - odrzucone
            var t1 = t0.AddSeconds(30);
            Assert.False(limiter.CanWheek(t1, out var rem2));
            Assert.Equal(TimeSpan.FromSeconds(90), rem2);
            Assert.False(limiter.TryWheek(t1));

            // 3. Kwiknięcie po 119 sekundach - odrzucone
            var t2 = t0.AddSeconds(119);
            Assert.False(limiter.CanWheek(t2, out var rem3));
            Assert.Equal(TimeSpan.FromSeconds(1), rem3);
            Assert.False(limiter.TryWheek(t2));

            // 4. Kwiknięcie po 120 sekundach (dokładnie 2 minuty) - dozwolone!
            var t3 = t0.AddSeconds(120);
            Assert.True(limiter.CanWheek(t3, out var rem4));
            Assert.Equal(TimeSpan.Zero, rem4);
            Assert.True(limiter.TryWheek(t3));

            // 5. Kolejne po kolejnych 10 sekundach - znów odrzucone
            var t4 = t3.AddSeconds(10);
            Assert.False(limiter.TryWheek(t4));
        }

        [Fact]
        public void WheekRateLimiter_Reset_ClearsCooldown()
        {
            var limiter = new WheekRateLimiter(TimeSpan.FromMinutes(2));
            var t0 = new DateTime(2026, 10, 12, 12, 0, 0, DateTimeKind.Utc);

            Assert.True(limiter.TryWheek(t0));
            Assert.False(limiter.TryWheek(t0.AddSeconds(10)));

            limiter.Reset();
            Assert.True(limiter.TryWheek(t0.AddSeconds(10)));
        }

        [Fact]
        public void PitchCalculator_CalculatesExpectedRange()
        {
            double factorMin = PitchCalculator.CalculateFactor(0.0, 0.06);
            double factorMid = PitchCalculator.CalculateFactor(0.5, 0.06);
            double factorMax = PitchCalculator.CalculateFactor(1.0, 0.06);

            Assert.InRange(factorMin, 0.939, 0.941);
            Assert.InRange(factorMid, 0.999, 1.001);
            Assert.InRange(factorMax, 1.059, 1.061);
        }

        [Theory]
        [InlineData("wheek", SoundEvent.Wheek)]
        [InlineData("WHEEK", SoundEvent.Wheek)]
        [InlineData("purr_pet", SoundEvent.Purr)]
        [InlineData("popcorn", SoundEvent.Pop)]
        [InlineData("chirp", SoundEvent.Chirp)]
        [InlineData("flee", SoundEvent.Fear)]
        [InlineData("startle", SoundEvent.Fear)]
        [InlineData("chatter", SoundEvent.Anger)]
        [InlineData("eat", SoundEvent.Crunch)]
        [InlineData("eat_treat", SoundEvent.Crunch)]
        [InlineData("eat_bowl", SoundEvent.Crunch)]
        [InlineData("walk", SoundEvent.None)]
        [InlineData("idle", SoundEvent.None)]
        [InlineData("", SoundEvent.None)]
        [InlineData(null, SoundEvent.None)]
        public void SoundEventMapper_MapsKnownAnimations(string? anim, SoundEvent expected)
        {
            Assert.Equal(expected, SoundEventMapper.MapAnimationToSound(anim));
        }
    }
}
