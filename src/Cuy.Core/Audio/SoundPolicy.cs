using System;

namespace Cuy.Core.Audio
{
    /// <summary>
    /// Rodzaje zdarzeń dźwiękowych świnki.
    /// </summary>
    public enum SoundEvent
    {
        None = 0,
        /// <summary>Kwiczenie: głód, wołanie, powitanie (kwik_1/2/3.wav, losuj jeden, max 1/2min).</summary>
        Wheek,
        /// <summary>Mruczenie przy głaskaniu (mruczenie.wav, zapętla się podczas głaskania).</summary>
        Purr,
        /// <summary>Ćwierkanie: maluch, zadowolenie (cwierkanie.wav).</summary>
        Chirp,
        /// <summary>Pisk strachu: gwałtowny ruch myszką, ucieczka (pisk_strachu.wav).</summary>
        Fear,
        /// <summary>Pisk złości / irytacji: zgrzytanie ząbkami, seria kliknięć (pisk_zlosci.wav).</summary>
        Anger,
        /// <summary>Chrupanie przy jedzeniu (chrupanie_1/2.wav, co 0.3-0.6s z lekką zmianą tonu).</summary>
        Crunch,
        /// <summary>Podskok z radości / popcorning (pop.wav).</summary>
        Pop
    }

    /// <summary>
    /// Konfiguracja i logika sprawdzania godzin ciszy.
    /// Domyślnie 22:00 - 07:00 (godziny nocne).
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
        /// Zwraca true jeśli podany czas doby mieści się w godzinach ciszy.
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
                // Przedział w ciągu jednego dnia, np. 13:00 - 15:00
                return timeOfDay >= Start && timeOfDay < End;
            }
            else
            {
                // Przedział przechodzący przez północ, np. 22:00 - 07:00
                return timeOfDay >= Start || timeOfDay < End;
            }
        }

        public bool IsInQuietHours(DateTime dateTime)
        {
            return IsInQuietHours(dateTime.TimeOfDay);
        }
    }

    /// <summary>
    /// Ogranicznik częstotliwości kwiczenia (PLAN.md F1: maks. jeden dźwięk kwiczenia na 2 minuty).
    /// </summary>
    public sealed class WheekRateLimiter
    {
        public TimeSpan Cooldown { get; set; } = TimeSpan.FromMinutes(2); // 120 sekund

        public DateTime LastWheekUtc { get; private set; } = DateTime.MinValue;

        public WheekRateLimiter() { }

        public WheekRateLimiter(TimeSpan cooldown)
        {
            Cooldown = cooldown;
        }

        /// <summary>
        /// Sprawdza czy można w danej chwili odegrać kwiknięcie.
        /// </summary>
        public bool CanWheek(DateTime nowUtc, out TimeSpan remaining)
        {
            if (LastWheekUtc == DateTime.MinValue)
            {
                remaining = TimeSpan.Zero;
                return true;
            }

            // Ochrona przed cofnięciem zegara
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
        /// Próbuje zarejestrować kwiknięcie. Jeśli cooldown minął, aktualizuje czas i zwraca true.
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
    /// Kalkulator lekkiej losowej wariacji wysokości dźwięku (pitch variation).
    /// </summary>
    public static class PitchCalculator
    {
        /// <summary>Domyślna maksymalna wariacja (np. 0.06 = +/-6% częstotliwości próbkowania).</summary>
        public const double DefaultVariation = 0.06;

        public static double CalculateFactor(double randomUnit, double maxVariation = DefaultVariation)
        {
            if (maxVariation <= 0) return 1.0;
            // randomUnit w zakresie [0.0, 1.0] -> mapowanie do [-maxVariation, +maxVariation]
            double norm = Math.Max(0.0, Math.Min(1.0, randomUnit));
            double delta = (norm * 2.0 - 1.0) * maxVariation;
            return 1.0 + delta;
        }
    }

    /// <summary>
    /// Mapowanie nazw animacji oraz zdarzeń gry na dźwięki.
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
