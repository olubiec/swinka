using System;

namespace Cuy.Core.Pigs
{
    public static class PigLife
    {
        public static DateTime BornAtFor(DateTime arrivalUtc, double startAgeYears, double pigDaysPerRealDay)
        {
            if (startAgeYears <= 0 || pigDaysPerRealDay <= 0)
            {
                return arrivalUtc;
            }

            double realDays = startAgeYears * LifeStages.DaysPerYear / pigDaysPerRealDay;
            long ticks = (long)Math.Ceiling(realDays * TimeSpan.TicksPerDay);
            return arrivalUtc.AddTicks(-ticks);
        }

        public static PigAge AgeOf(PigProfile pig, DateTime nowUtc, double pigDaysPerRealDay, DateTime fallbackBirthUtc)
        {
            DateTime birth = (pig != null && pig.BornAtUtc.HasValue)
                ? pig.BornAtUtc.Value
                : fallbackBirthUtc;

            return PigAge.FromBirth(birth, nowUtc, pigDaysPerRealDay);
        }

        public static LifeStage StageOf(PigProfile pig, DateTime nowUtc, double pigDaysPerRealDay, DateTime fallbackBirthUtc)
        {
            if (pig != null && pig.Memorial)
            {
                return LifeStage.Legend;
            }

            PigAge age = AgeOf(pig, nowUtc, pigDaysPerRealDay, fallbackBirthUtc);

            if (pig != null && pig.LegendAtYears.HasValue)
            {
                double ageYears = age.PigDays / LifeStages.DaysPerYear;
                if (ageYears >= pig.LegendAtYears.Value - 1e-9)
                {
                    return LifeStage.Legend;
                }

                LifeStage natural = LifeStages.FromPigDays(age.PigDays);
                return natural == LifeStage.Legend ? LifeStage.Senior : natural;
            }

            return LifeStages.FromPigDays(age.PigDays);
        }
    }
}
