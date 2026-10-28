using System;
using System.Linq;

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
    }
}
