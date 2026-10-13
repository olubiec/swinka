using System;

namespace Cuy.Core
{
    /// <summary>Etapy życia z PLAN.md ("Wiek i etapy życia").</summary>
    public enum LifeStage
    {
        /// <summary>Maluch: 0-3 tygodnie (1. dzień gry).</summary>
        Baby,
        /// <summary>Młodzik: 3 tygodnie - 6 miesięcy (dni 2-9).</summary>
        Junior,
        /// <summary>Dorosła: 6 miesięcy - 4 lata (dni 9-70).</summary>
        Adult,
        /// <summary>Senior: 4-8 lat (dni 70-139).</summary>
        Senior,
        /// <summary>Legenda: ponad 8 lat (139+), gra trwa dalej bez końca.</summary>
        Legend
    }

    public static class LifeStages
    {
        public const double DaysPerYear = 365.25;

        /// <summary>Progi w dniach życia świnki.</summary>
        public const double JuniorFromPigDays = 21;                 // 3 tygodnie
        public const double AdultFromPigDays = DaysPerYear / 2;     // 6 miesięcy
        public const double SeniorFromPigDays = DaysPerYear * 4;    // 4 lata
        public const double LegendFromPigDays = DaysPerYear * 8;    // 8 lat

        public static LifeStage FromPigDays(double pigDays)
        {
            if (pigDays >= LegendFromPigDays) return LifeStage.Legend;
            if (pigDays >= SeniorFromPigDays) return LifeStage.Senior;
            if (pigDays >= AdultFromPigDays) return LifeStage.Adult;
            if (pigDays >= JuniorFromPigDays) return LifeStage.Junior;
            return LifeStage.Baby;
        }

        public static string Polish(LifeStage stage)
        {
            switch (stage)
            {
                case LifeStage.Baby: return "Maluch";
                case LifeStage.Junior: return "Młodzik";
                case LifeStage.Adult: return "Dorosła";
                case LifeStage.Senior: return "Senior";
                case LifeStage.Legend: return "Legenda";
                default: throw new ArgumentOutOfRangeException(nameof(stage));
            }
        }

        /// <summary>Klucz z plików danych i nazw folderów w assets/ (np. "adult").</summary>
        public static string DataKey(LifeStage stage)
        {
            switch (stage)
            {
                case LifeStage.Baby: return "baby";
                case LifeStage.Junior: return "junior";
                case LifeStage.Adult: return "adult";
                case LifeStage.Senior: return "senior";
                case LifeStage.Legend: return "legend";
                default: throw new ArgumentOutOfRangeException(nameof(stage));
            }
        }

        public static string PolishDataKey(LifeStage stage)
        {
            switch (stage)
            {
                case LifeStage.Baby: return "maluch";
                case LifeStage.Junior: return "mlodzik";
                case LifeStage.Adult: return "dorosla";
                case LifeStage.Senior: return "senior";
                case LifeStage.Legend: return "legenda";
                default: throw new ArgumentOutOfRangeException(nameof(stage));
            }
        }
    }

    /// <summary>Wiek świnki w jej "świnkowym" czasie (1 dzień realny = 21 dni świnki).</summary>
    public struct PigAge
    {
        public PigAge(double pigDays)
        {
            PigDays = pigDays < 0 ? 0 : pigDays;
        }

        public double PigDays { get; }

        public int Years { get { return (int)Math.Floor(PigDays / LifeStages.DaysPerYear); } }

        /// <summary>Pełne miesiące ponad pełne lata.</summary>
        public int Months
        {
            get
            {
                double rest = PigDays - Years * LifeStages.DaysPerYear;
                return Math.Min(11, (int)Math.Floor(rest / (LifeStages.DaysPerYear / 12)));
            }
        }

        public LifeStage Stage { get { return LifeStages.FromPigDays(PigDays); } }

        public static PigAge FromBirth(DateTime birthUtc, DateTime nowUtc, double pigDaysPerRealDay)
        {
            return new PigAge((nowUtc - birthUtc).TotalDays * pigDaysPerRealDay);
        }

        /// <summary>Np. "5 dni", "2 tygodnie", "4 miesiące", "1 rok i 3 miesiące".</summary>
        public string ToPolishString()
        {
            if (PigDays < 7)
            {
                int d = (int)Math.Floor(PigDays);
                return d == 1 ? "1 dzień" : d + " dni";
            }
            if (PigDays < LifeStages.DaysPerYear / 12)
            {
                int w = (int)Math.Floor(PigDays / 7);
                return w + " " + PolishPlural.Choose(w, "tydzień", "tygodnie", "tygodni");
            }
            string months = Months + " " + PolishPlural.Choose(Months, "miesiąc", "miesiące", "miesięcy");
            if (Years == 0) return months;
            string years = Years + " " + PolishPlural.Choose(Years, "rok", "lata", "lat");
            return Months == 0 ? years : years + " i " + months;
        }

        public override string ToString()
        {
            return ToPolishString();
        }
    }

    /// <summary>Polska odmiana liczebników: 1 rok, 2 lata, 5 lat.</summary>
    public static class PolishPlural
    {
        public static string Choose(int n, string one, string few, string many)
        {
            if (n == 1) return one;
            int mod10 = n % 10, mod100 = n % 100;
            if (mod10 >= 2 && mod10 <= 4 && (mod100 < 12 || mod100 > 14)) return few;
            return many;
        }
    }
}
