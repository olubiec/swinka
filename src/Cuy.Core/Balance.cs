using System;
using System.Collections.Generic;

namespace Cuy.Core
{
    /// <summary>
    /// Game balance numbers. Defaults from PLAN.md (pig model section) and assets/data/actions.json.
    /// A starting point for testing, not the final balance.
    /// </summary>
    public sealed partial class Balance
    {
        /// <summary>The pig grows through the life stages (1 real day = 21 pig days). Set to false to keep it a baby.</summary>
        public const bool GrowthEnabled = true;

        /// <summary>Whether this Balance lets the pig grow. Starts as <see cref="GrowthEnabled"/>; tests of the life stages switch it on.</summary>
        public bool GrowthActive { get; set; } = GrowthEnabled;

        /// <summary>Need decay per game hour with the computer on (needs table in PLAN.md).</summary>
        public Dictionary<Need, double> DecayPerHour { get; set; } = new Dictionary<Need, double>
        {
            { Need.Satiety, 8 },
            { Need.VitaminC, 4 },
            { Need.Energy, 6 },      // while active; rises during sleep
            { Need.Mood, 5 },
            { Need.Cleanliness, 0 }, // depends on poops, does not drop by itself
            { Need.Teeth, 2 },
        };

        /// <summary>When the app was closed, decay is 3x slower.</summary>
        public double OfflineDecayFactor { get; set; } = 1.0 / 3.0;

        /// <summary>When the app was closed, needs do not drop below this value.</summary>
        public double OfflineFloor { get; set; } = 20;

        /// <summary>
        /// With the computer off the pig sleeps, so energy rises (see assets/data/simulation.json:
        /// after a weekend without care energy = 100). Set to false to make energy decay like the other needs.
        /// </summary>
        public bool OfflineCountsAsSleep { get; set; } = true;

        /// <summary>Energy gain per hour of sleep. Working value, to be tuned.</summary>
        public double SleepEnergyRegenPerHour { get; set; } = 15;

        /// <summary>Below this value the NeedLow event fires (35 = wheeking threshold from actions.json).</summary>
        public double LowThreshold { get; set; } = 35;

        /// <summary>Below this value the NeedCritical event fires.</summary>
        public double CriticalThreshold { get; set; } = 15;

        /// <summary>
        /// Hysteresis: the event can fire again only after the need rises above threshold + this value.
        /// This way small swings around the threshold do not flood events.
        /// </summary>
        public double ThresholdHysteresis { get; set; } = 5;

        /// <summary>1 real day = 3 weeks of the pig's life.</summary>
        public double PigDaysPerRealDay { get; set; } = 21;

        /// <summary>
        /// A gap between Update calls longer than this REAL time (e.g. a sleeping laptop)
        /// is counted with the offline rules, so the pig does not starve overnight.
        /// </summary>
        public TimeSpan MaxOnlineGap { get; set; } = TimeSpan.FromMinutes(5);

        /// <summary>Daily limit of bond points, so levels cannot be farmed in one evening.</summary>
        public int BondDailyLimit { get; set; } = 30;

        /// <summary>Highest bond level.</summary>
        public int MaxBondLevel { get; set; } = 20;

        /// <summary>
        /// Threshold of level n = BondStep * n * (n - 1) / 2 points in total
        /// (level 2: 15, level 10: 675, level 20: 2850). At 30 points a day, level 10 arrives around day 23.
        /// </summary>
        public int BondStep { get; set; } = 15;

        public static Balance CreateDefault()
        {
            return new Balance();
        }

        public double GetDecay(Need need)
        {
            double v;
            return DecayPerHour != null && DecayPerHour.TryGetValue(need, out v) ? v : 0;
        }

        /// <summary>Total bond points needed for a level.</summary>
        public int BondPointsForLevel(int level)
        {
            if (level <= 1) return 0;
            return BondStep * level * (level - 1) / 2;
        }

        public int BondLevelForPoints(int points)
        {
            int level = 1;
            while (level < MaxBondLevel && points >= BondPointsForLevel(level + 1)) level++;
            return level;
        }
    }
}
