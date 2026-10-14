using System;

namespace Cuy.Core
{
    /// <summary>Life stages from PLAN.md (section about age and life stages).</summary>
    public enum LifeStage
    {
        /// <summary>Baby: 0-3 weeks (game day 1).</summary>
        Baby,
        /// <summary>Junior: 3 weeks - 6 months (days 2-9).</summary>
        Junior,
        /// <summary>Adult: 6 months - 4 years (days 9-70).</summary>
        Adult,
        /// <summary>Senior: 4-8 years (days 70-139).</summary>
        Senior,
        /// <summary>Legend: over 8 years (139+); the game goes on forever.</summary>
        Legend
    }

    public static class LifeStages
    {
        public const double DaysPerYear = 365.25;

        /// <summary>Thresholds in the pig's days of life.</summary>
        public const double JuniorFromPigDays = 21;                 // 3 weeks
        public const double AdultFromPigDays = DaysPerYear / 2;     // 6 months
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

        public static string DisplayName(LifeStage stage)
        {
            switch (stage)
            {
                case LifeStage.Baby: return "Baby";
                case LifeStage.Junior: return "Junior";
                case LifeStage.Adult: return "Adult";
                case LifeStage.Senior: return "Senior";
                case LifeStage.Legend: return "Legend";
                default: throw new ArgumentOutOfRangeException(nameof(stage));
            }
        }

        /// <summary>Key used in data files and asset folder names (e.g. "adult").</summary>
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
    }

    /// <summary>The pig's age in its own "pig time" (1 real day = 21 pig days).</summary>
    public struct PigAge
    {
        public PigAge(double pigDays)
        {
            PigDays = pigDays < 0 ? 0 : pigDays;
        }

        public double PigDays { get; }

        public int Years { get { return (int)Math.Floor(PigDays / LifeStages.DaysPerYear); } }

        /// <summary>Full months on top of full years.</summary>
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

        /// <summary>E.g. "5 days", "2 weeks", "4 months", "1 year and 3 months".</summary>
        public string ToDisplayString()
        {
            if (PigDays < 7)
            {
                int d = (int)Math.Floor(PigDays);
                return Plural.Format(d, "day", "days");
            }
            if (PigDays < LifeStages.DaysPerYear / 12)
            {
                int w = (int)Math.Floor(PigDays / 7);
                return Plural.Format(w, "week", "weeks");
            }
            string months = Plural.Format(Months, "month", "months");
            if (Years == 0) return months;
            string years = Plural.Format(Years, "year", "years");
            return Months == 0 ? years : years + " and " + months;
        }

        public override string ToString()
        {
            return ToDisplayString();
        }
    }

    /// <summary>English plural helper: "1 day", "2 days".</summary>
    public static class Plural
    {
        public static string Choose(int n, string one, string many)
        {
            return n == 1 ? one : many;
        }

        public static string Format(int n, string one, string many)
        {
            return n + " " + Choose(n, one, many);
        }
    }
}
