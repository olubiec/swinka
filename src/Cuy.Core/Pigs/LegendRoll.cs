using System;

namespace Cuy.Core.Pigs
{
    public static class LegendRoll
    {
        public const double DefaultLegendMinYears = 6.5;
        public const double DefaultLegendMaxYears = 9.5;

        public static double Roll(double minYears, double maxYears, Random rng)
        {
            if (rng == null)
            {
                rng = new Random();
            }

            if (minYears > maxYears)
            {
                double temp = minYears;
                minYears = maxYears;
                maxYears = temp;
            }

            if (minYears == maxYears)
            {
                return minYears;
            }

            double rolled = minYears + (rng.NextDouble() * (maxYears - minYears));
            return Math.Round(rolled, 2, MidpointRounding.AwayFromZero);
        }

        public static double? RollFor(NamedPigDefinition def, Random rng)
        {
            if (def == null)
            {
                return null;
            }

            double min = def.LegendYearsMin > 0 ? def.LegendYearsMin : DefaultLegendMinYears;
            double max = def.LegendYearsMax > 0 ? def.LegendYearsMax : DefaultLegendMaxYears;

            return Roll(min, max, rng);
        }

        public static bool Assign(PigProfile pig, NamedPigDefinition def, Random rng)
        {
            if (pig == null || pig.LegendAtYears.HasValue || def == null)
            {
                return false;
            }

            double? rolled = RollFor(def, rng);
            if (!rolled.HasValue)
            {
                return false;
            }

            pig.LegendAtYears = rolled.Value;
            return true;
        }
    }
}
