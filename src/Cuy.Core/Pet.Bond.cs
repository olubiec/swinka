using System;
using System.Linq;
using Cuy.Core.Time;

namespace Cuy.Core
{
    public partial class Pet
    {
        private BondUnlocks _bondTable;

        public BondUnlocks BondTable
        {
            get
            {
                if (_bondTable == null) return BondUnlocks.Current;
                return _bondTable;
            }
            set
            {
                _bondTable = value;
            }
        }

        public bool IsUnlocked(string id)
        {
            return BondTable.IsUnlocked(id, State.Bond.Level);
        }

        public BondUnlock NextUnlock()
        {
            return BondTable.Next(State.Bond.Level);
        }

        private void OnBondLevelUp(int newLevel)
        {
            var unlock = BondTable.Levels.FirstOrDefault(l => l.Level == newLevel && string.Equals(l.Id, "golden_bowl", StringComparison.OrdinalIgnoreCase));
            if (unlock != null)
            {
                int count;
                State.Stats.Counters.TryGetValue("golden_bowl_granted", out count);
                if (count == 0)
                {
                    AddItem("golden_bowl");
                    Count("golden_bowl_granted");
                    AddDiaryEntry("Level 20! My human gave me a golden bowl.");
                }
            }
        }
        /// <summary>
        /// Adds bond points within the daily limit. Returns how many were actually added.
        /// Scaled by ActiveModifiers.BondGain before applying the daily limit.
        /// </summary>
        public int AddBondPoints(int points)
        {
            if (points <= 0) return 0;
            int scaled = (int)Math.Round(points * ActiveModifiers.BondGain, MidpointRounding.AwayFromZero);
            if (scaled <= 0) return 0;

            var bond = State.Bond;
            string today = Clock.LocalNow().ToString("yyyy-MM-dd", System.Globalization.CultureInfo.InvariantCulture);
            if (bond.PointsTodayDate != today)
            {
                bond.PointsTodayDate = today;
                bond.PointsToday = 0;
            }

            int allowed = Math.Max(0, Math.Min(scaled, Balance.BondDailyLimit - bond.PointsToday));
            if (allowed == 0) return 0;

            bond.PointsToday += allowed;
            bond.Points += allowed;

            int newLevel = Balance.BondLevelForPoints(bond.Points);
            while (bond.Level < newLevel)
            {
                int old = bond.Level;
                bond.Level++;
                Raise(LevelUp, new LevelUpEventArgs(old, bond.Level));
                OnBondLevelUp(bond.Level);
            }
            return allowed;
        }
    }
}
