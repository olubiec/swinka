using System;
using Cuy.Core.Hay;

namespace Cuy.Core
{
    public sealed partial class Pet
    {
        private HayConfig _hayTable;

        public HayConfig HayTable
        {
            get
            {
                if (_hayTable == null)
                {
                    _hayTable = HayConfig.Current;
                }
                return _hayTable;
            }
            set
            {
                _hayTable = value;
            }
        }

        public void RefillHay()
        {
            State.HayRack = Math.Min(HayTable.Max, State.HayRack + HayTable.RefillAmount);
        }

        public double ConsumeHay(double gameHours, bool offline)
        {
            if (gameHours <= 0) return 0;
            if (State.HayRack <= 0) return 0;
            if (Needs.Satiety >= 95.0) return 0;

            double rate = offline ? HayTable.OfflineEatPerHour : HayTable.EatPerGameHour;
            double amountByTime = gameHours * rate;
            double spaceLeft = 95.0 - Needs.Satiety;
            double amountBySpace = spaceLeft / HayTable.FullnessPerHayUnit;

            double actualEaten = Math.Min(Math.Min(amountByTime, amountBySpace), State.HayRack);

            if (actualEaten > 0)
            {
                State.HayRack -= actualEaten;
                if (State.HayRack < 0) State.HayRack = 0; // Floating point precision safety
                ChangeNeed(Need.Satiety, actualEaten * HayTable.FullnessPerHayUnit);
            }

            return actualEaten;
        }
    }
}
